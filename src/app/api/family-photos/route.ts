import { NextResponse } from "next/server";
import { requireParentAccess } from "@/lib/access";
import { getAdminSupabase } from "@/lib/supabase-admin";
import { familyEntrySchema } from "@/lib/family-planner";
import { prepareFamilyPhoto, photoPath } from "@/lib/family-photo";
export const runtime = "nodejs";
export const maxDuration = 60;
const json = (v: unknown, status = 200) =>
  NextResponse.json(v, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
export async function POST(req: Request) {
  const a = await requireParentAccess();
  if (a.response) return a.response;
  if (Number(req.headers.get("content-length")) > 3.2 * 1024 * 1024)
    return json({ error: "Choose a photo under 3 MB." }, 413);
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: "Photo could not be read." }, 400);
  }
  const file = form.get("photo");
  if (!(file instanceof File) || file.size > 3 * 1024 * 1024)
    return json({ error: "Choose a JPEG, PNG or WebP photo under 3 MB." }, 400);
  let raw;
  try {
    raw = JSON.parse(String(form.get("entry")));
  } catch {
    return json({ error: "Check the memory details." }, 400);
  }
  const parsed = familyEntrySchema.safeParse(raw);
  if (!parsed.success || parsed.data.kind !== "memory")
    return json({ error: "Add a title, child and valid date." }, 400);
  const e = parsed.data;
  const child = await a.supabase
    .from("children")
    .select("id")
    .eq("id", e.child_id!)
    .eq("user_id", a.user.id)
    .maybeSingle();
  if (child.error) return json({ error: "Could not check the profile." }, 503);
  if (!child.data) return json({ error: "Profile unavailable." }, 404);
  let prepared;
  try {
    prepared = await prepareFamilyPhoto(Buffer.from(await file.arrayBuffer()));
  } catch {
    return json(
      {
        error:
          "Choose a readable still JPEG, PNG or WebP under 3 MB and 24 megapixels.",
      },
      400,
    );
  }
  if (e.value.photoHash && e.value.photoHash !== prepared.hash)
    return json(
      {
        error:
          "For an unfinished upload, choose the original photo. To use another photo, create a new memory.",
      },
      409,
    );
  const content = { ...e.value, photoHash: prepared.hash };
  const { data: entry, error } = await a.supabase.rpc("save_family_entry", {
    target: e.id,
    child: e.child_id,
    entry_kind: "memory",
    expected: e.revision,
    content,
  });
  if (error)
    return json(
      {
        error:
          error.code === "40001"
            ? "This memory changed elsewhere. Reload saved records; your draft is kept."
            : "Could not save the memory. Check its date and details.",
      },
      error.code === "40001" ? 409 : 400,
    );
  if (entry.photo_ready) return json({ entry });
  const admin = getAdminSupabase(),
    path = photoPath(a.user.id, e.id, prepared.hash);
  const upload = await admin.storage
    .from("family-photos")
    .upload(path, prepared.photo, {
      contentType: "image/jpeg",
      upsert: false,
      cacheControl: "0",
    });
  if (upload.error) {
    // A retry can encounter the identical immutable object left by a lost response.
    const existing = await admin.storage.from("family-photos").download(path);
    if (existing.error)
      return json(
        {
          error:
            "Details saved; the photo upload did not finish. Reload the timeline and retry with the same photo.",
          entry,
        },
        503,
      );
  }
  const ready = await admin
    .from("family_entries")
    .update({ photo_ready: true })
    .eq("id", e.id)
    .eq("user_id", a.user.id)
    .select("id,child_id,kind,value,revision,photo_ready")
    .single();
  if (ready.error)
    return json(
      {
        error: "The upload needs a retry. Your memory details are saved.",
        entry,
      },
      503,
    );
  return json({ entry: ready.data });
}
