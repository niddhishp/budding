import { NextResponse } from "next/server";
import { z } from "zod";
import { requireParentAccess } from "@/lib/access";
import {
  notebookSchema,
  healthSchema,
  interestsSchema,
  emptyHealth,
  emptyInterests,
} from "@/lib/profile-notebook";
const json = (data: unknown, status = 200) =>
  NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
export async function GET(req: Request) {
  const access = await requireParentAccess();
  if (access.response) return access.response;
  const id = z.uuid().safeParse(new URL(req.url).searchParams.get("childId"));
  if (!id.success) return json({ error: "Choose a child." }, 400);
  const child = await access.supabase
    .from("children")
    .select("id")
    .eq("id", id.data)
    .eq("user_id", access.user.id)
    .maybeSingle();
  if (child.error) return json({ error: "Could not check this profile." }, 503);
  if (!child.data) return json({ error: "Profile unavailable." }, 404);
  const { data, error } = await access.supabase
    .from("child_profile_notebooks")
    .select("section,value,revision")
    .eq("child_id", id.data);
  if (error)
    return json({ error: "Your records could not be loaded. Try again." }, 503);
  const health = data.find((r) => r.section === "health"),
    interests = data.find((r) => r.section === "interests");
  const h = healthSchema.safeParse(health?.value ?? emptyHealth),
    i = interestsSchema.safeParse(interests?.value ?? emptyInterests);
  if (!h.success || !i.success)
    return json({ error: "These records need support to review them." }, 503);
  return json({
    health: { value: h.data, revision: health?.revision ?? 0 },
    interests: { value: i.data, revision: interests?.revision ?? 0 },
  });
}
export async function PUT(req: Request) {
  const access = await requireParentAccess();
  if (access.response) return access.response;
  const text = await req.text();
  if (text.length > 450000)
    return json({ error: "This notebook is too large." }, 413);
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return json({ error: "Check your record and try again." }, 400);
  }
  const input = notebookSchema.safeParse(raw);
  if (!input.success)
    return json(
      {
        error:
          "Check the dates and fields. Completed records need a date no later than today.",
      },
      400,
    );
  const { data, error } = await access.supabase.rpc("save_profile_notebook", {
    target: input.data.childId,
    section_name: input.data.section,
    expected: input.data.revision,
    content: input.data.value,
  });
  if (error)
    return json(
      {
        error:
          error.code === "40001"
            ? "This notebook changed elsewhere. Your draft is still here; reload saved records before trying again."
            : "Record was not saved. Your draft is still here.",
      },
      error.code === "40001" ? 409 : 400,
    );
  return json({ value: data.value, revision: data.revision });
}
