import { NextResponse } from "next/server";
import { z } from "zod";
import { requireParentAccess } from "@/lib/access";
import { getAdminSupabase } from "@/lib/supabase-admin";
import { makeThumbnail, photoPath, thumbPath } from "@/lib/family-photo";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const a = await requireParentAccess();
  if (a.response) return a.response;
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) return new NextResponse(null, { status: 404 });
  const { data, error } = await a.supabase
    .from("family_entries")
    .select("value,photo_ready")
    .eq("id", id.data)
    .eq("user_id", a.user.id)
    .eq("kind", "memory")
    .maybeSingle();
  if (error) return new NextResponse(null, { status: 503 });
  if (!data?.photo_ready) return new NextResponse(null, { status: 404 });
  const storage = getAdminSupabase().storage.from("family-photos");
  const hash: string = data.value.photoHash;
  if (new URL(req.url).searchParams.get("size") === "thumb") {
    // Thumbnails are made on first request and kept beside the original, in the owner's private folder.
    const stored = await storage.download(thumbPath(a.user.id, id.data, hash));
    let thumb: Blob | Uint8Array<ArrayBuffer> | null = stored.error ? null : stored.data;
    if (!thumb) {
      const original = await storage.download(photoPath(a.user.id, id.data, hash));
      if (original.error) return new NextResponse(null, { status: 503 });
      const made = new Uint8Array((await makeThumbnail(Buffer.from(await original.data.arrayBuffer()))).thumb);
      // A failed save only means the next request makes it again.
      await storage.upload(thumbPath(a.user.id, id.data, hash), made, { contentType: "image/webp", upsert: true }).catch(() => undefined);
      thumb = made;
    }
    return new NextResponse(thumb, {
      headers: {
        "Content-Type": "image/webp",
        // Private to this browser, briefly, so the strip does not reload every photo on each visit.
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": 'inline; filename="family-memory.webp"',
      },
    });
  }
  const file = await storage.download(photoPath(a.user.id, id.data, hash));
  if (file.error) return new NextResponse(null, { status: 503 });
  return new NextResponse(file.data, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": 'inline; filename="family-memory.jpg"',
    },
  });
}
