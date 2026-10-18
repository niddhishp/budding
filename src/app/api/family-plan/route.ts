import { NextResponse } from "next/server";
import { requireParentAccess } from "@/lib/access";
import { familyEntrySchema } from "@/lib/family-planner";
import { healthSchema, healthUpcoming } from "@/lib/profile-notebook";
import { todayDate } from "@/lib/family-care";
const json = (value: unknown, status = 200) =>
  NextResponse.json(value, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
export async function GET() {
  const a = await requireParentAccess();
  if (a.response) return a.response;
  const [entries, notebooks] = await Promise.all([
    a.supabase
      .from("family_entries")
      .select("id,child_id,kind,value,revision,photo_ready")
      .eq("user_id", a.user.id)
      .order("updated_at", { ascending: false })
      .limit(2000),
    a.supabase
      .from("child_profile_notebooks")
      .select("child_id,value")
      .eq("user_id", a.user.id)
      .eq("section", "health"),
  ]);
  if (entries.error || notebooks.error)
    return json(
      { error: "Your family plan could not be loaded. Try again." },
      503,
    );
  const health = [];
  for (const row of notebooks.data) {
    const parsed = healthSchema.safeParse(row.value);
    if (!parsed.success)
      return json(
        {
          error:
            "Some care dates could not be read. Open the health diary or contact support.",
        },
        503,
      );
    health.push(
      ...healthUpcoming(parsed.data.entries).map((e) => ({
        id: e.id,
        child_id: row.child_id,
        title: e.title,
        date: e.due,
      })),
    );
  }
  return json({ entries: entries.data, health });
}
export async function PUT(req: Request) {
  const a = await requireParentAccess();
  if (a.response) return a.response;
  const text = await req.text();
  if (text.length > 20000)
    return json({ error: "This entry is too long." }, 413);
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    return json({ error: "Check the entry." }, 400);
  }
  const parsed = familyEntrySchema.safeParse(raw);
  if (!parsed.success)
    return json({ error: "Check the title, date and amounts." }, 400);
  const e = parsed.data;
  if (e.kind === "memory" && e.revision === 0)
    return json({ error: "Add memories with a photo in the timeline." }, 400);
  if (e.kind === "goal" && e.value.date <= todayDate() && !e.value.archived) {
    const old = await a.supabase
      .from("family_entries")
      .select("value")
      .eq("id", e.id)
      .maybeSingle();
    if (old.error || old.data?.value.date !== e.value.date)
      return json(
        { error: "Choose a future target date for a new or rescheduled goal." },
        400,
      );
  }
  const { data, error } = await a.supabase.rpc("save_family_entry", {
    target: e.id,
    child: e.child_id,
    entry_kind: e.kind,
    expected: e.revision,
    content: e.value,
  });
  if (error)
    return json(
      {
        error:
          error.code === "40001"
            ? "This entry changed elsewhere. Your draft is kept; reload saved records before retrying."
            : "Could not save. Check the date and fields; your draft is kept.",
      },
      error.code === "40001" ? 409 : 400,
    );
  return json({ entry: data });
}
