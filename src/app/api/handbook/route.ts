import { NextResponse } from "next/server";
import { z } from "zod";
import { requireParentAccess } from "@/lib/access";
import { handbookProgressSchema, progressEntrySchema } from "@/lib/handbook";
import { HANDBOOK } from "@/data/handbook";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
const updateSchema = z.object({
  childId: z.uuid(), revision: z.number().int().nonnegative(),
  cardId: z.string().refine(id => HANDBOOK.some(c => c.id === id)),
  entry: progressEntrySchema.nullable(),
}).strict();
export async function GET(req: Request) {
  const access = await requireParentAccess();
  if (access.response) return access.response;
  const childId = z.uuid().safeParse(new URL(req.url).searchParams.get("childId"));
  if (!childId.success) return json({ error: "Choose a child." }, 400);
  const child = await access.supabase.from("children").select("id").eq("id", childId.data).eq("user_id", access.user.id).maybeSingle();
  if (child.error) return json({ error: "Could not load this profile." }, 503);
  if (!child.data) return json({ error: "Profile unavailable." }, 404);
  const state = await access.supabase.from("child_care_state").select("value,revision").eq("child_id", childId.data).eq("user_id", access.user.id).maybeSingle();
  if (state.error) return json({ error: "Could not load your saved conversations." }, 503);
  const progress = handbookProgressSchema.safeParse(state.data?.value?.handbook ?? {});
  if (!progress.success) return json({ error: "Saved conversations need support to review them." }, 503);
  return json({ progress: progress.data, revision: state.data?.revision ?? 0 });
}
export async function PATCH(req: Request) {
  const access = await requireParentAccess();
  if (access.response) return access.response;
  const input = updateSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) return json({ error: "Check the conversation and date." }, 400);
  const { childId, revision, cardId, entry } = input.data;
  const child = await access.supabase.from("children").select("id").eq("id", childId).eq("user_id", access.user.id).maybeSingle();
  if (child.error) return json({ error: "Could not check this profile." }, 503);
  if (!child.data) return json({ error: "Profile unavailable." }, 404);
  const state = await access.supabase.from("child_care_state").select("value,revision").eq("child_id", childId).eq("user_id", access.user.id).maybeSingle();
  if (state.error) return json({ error: "Could not load saved settings." }, 503);
  if ((state.data?.revision ?? 0) !== revision) return json({ error: "These records changed. Reload before saving." }, 409);
  const previous = handbookProgressSchema.safeParse(state.data?.value?.handbook ?? {});
  if (!previous.success) return json({ error: "Saved conversations need support to review them." }, 503);
  const next = { ...previous.data };
  if (entry) next[cardId] = entry; else delete next[cardId];
  const progress = handbookProgressSchema.safeParse(next);
  if (!progress.success) return json({ error: "There are too many saved conversations." }, 400);
  // The existing RPC enforces owned child + consent + revision and serializes concurrent care writes.
  const saved = await access.supabase.rpc("save_child_care", { target: childId, expected: revision, content: { ...(state.data?.value ?? {}), handbook: progress.data } });
  if (saved.error) return json({ error: saved.error.code === "40001" ? "These records changed. Reload before saving." : "Not saved. Please try again." }, saved.error.code === "40001" ? 409 : 503);
  return json({ progress: progress.data, revision: saved.data.revision });
}
