import { NextResponse } from "next/server";
import { z } from "zod";
import { requireParentAccess } from "@/lib/access";
import { getAdminSupabase } from "@/lib/supabase-admin";
import { photoPath } from "@/lib/family-photo";
export async function GET(
  _req: Request,
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
  const file = await getAdminSupabase()
    .storage.from("family-photos")
    .download(photoPath(a.user.id, id.data, data.value.photoHash));
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
