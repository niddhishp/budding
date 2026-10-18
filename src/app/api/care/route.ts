import { NextResponse } from "next/server";
import { z } from "zod";
import { requireParentAccess } from "@/lib/access";
import { careSchema, DEFAULT_CARE, growthSchema } from "@/lib/family-care";
const json = (data: unknown, status = 200) =>
  NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
export async function GET(req: Request) {
  const access = await requireParentAccess();
  if (access.response) return access.response;
  const childId = z
    .uuid()
    .safeParse(new URL(req.url).searchParams.get("childId"));
  if (!childId.success) return json({ error: "Choose a child." }, 400);
  const child = await access.supabase
    .from("children")
    .select("id")
    .eq("id", childId.data)
    .eq("user_id", access.user.id)
    .maybeSingle();
  if (child.error) return json({ error: "Could not check this profile." }, 503);
  if (!child.data) return json({ error: "Profile unavailable." }, 404);
  const [care, growth] = await Promise.all([
    access.supabase
      .from("child_care_state")
      .select("value,revision")
      .eq("child_id", childId.data)
      .maybeSingle(),
    access.supabase
      .from("growth_entries")
      .select(
        "id,child_id,revision,measured_on,weight_kg,length_cm,head_cm,method,note,archived",
      )
      .eq("child_id", childId.data)
      .order("measured_on")
      .order("id")
      .limit(1000),
  ]);
  if (care.error || growth.error)
    return json(
      { error: "Could not load your saved care records. Try again." },
      503,
    );
  const parsed = careSchema.safeParse(care.data?.value ?? DEFAULT_CARE);
  if (!parsed.success)
    return json(
      { error: "These care settings need support to review them." },
      503,
    );
  return json({
    settings: parsed.data,
    revision: care.data?.revision ?? 0,
    growth: growth.data ?? [],
  });
}
export async function PATCH(req: Request) {
  const access = await requireParentAccess();
  if (access.response) return access.response;
  const input = z
    .object({
      childId: z.uuid(),
      revision: z.number().int().min(0),
      settings: careSchema,
    })
    .safeParse(await req.json().catch(() => null));
  if (!input.success)
    return json({ error: "Check the care settings and try again." }, 400);
  const { data, error } = await access.supabase.rpc("save_child_care", {
    target: input.data.childId,
    expected: input.data.revision,
    content: input.data.settings,
  });
  if (error)
    return json(
      {
        error:
          error.code === "40001"
            ? "These settings changed. Reload to review the latest version."
            : "Settings were not saved. Your draft is still here.",
      },
      error.code === "40001" ? 409 : 503,
    );
  return json({ settings: data.value, revision: data.revision });
}
export async function POST(req: Request) {
  const access = await requireParentAccess();
  if (access.response) return access.response;
  const input = growthSchema.safeParse(await req.json().catch(() => null));
  if (!input.success)
    return json(
      { error: "Add at least one measurement in kg/cm and a valid date." },
      400,
    );
  const { data, error } = await access.supabase.rpc("save_growth_entry", {
    payload: input.data,
  });
  if (error)
    return json(
      {
        error:
          error.code === "40001"
            ? "This measurement changed. Reload before saving."
            : error.message ===
                "Choose a measurement date between birth and today."
              ? error.message
              : "Measurement was not saved. Your draft is still here.",
      },
      error.code === "40001" ? 409 : 400,
    );
  return json({ entry: data });
}
