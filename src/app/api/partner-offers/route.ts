import { z } from "zod";
import { requireParentAccess } from "@/lib/access";
import { isSameOrigin } from "@/lib/access-policy";
import { adminJson as json } from "@/lib/admin-api";
import { todayDate } from "@/lib/family-care";
import { dailyHealth } from "@/lib/daily-family";
import { healthSchema, interestsSchema } from "@/lib/profile-notebook";
import { eventSchema, momentMatches, offerLink, type ChildOffers, type MomentContext, type PartnerOffer } from "@/lib/partner-services";

// Partner offers for one of the parent's children: active, gated, age- and city-matched in SQL,
// then kept only when the family's moment calls for them. The health diary and interests are read
// under the parent's own access to decide placement; nothing about them leaves Kahiye.
export async function GET(req: Request) {
  const access = await requireParentAccess();
  if (access.response) return access.response;
  const id = z.uuid().safeParse(new URL(req.url).searchParams.get("childId"));
  if (!id.success) return json({ error: "Choose a child." }, 400);
  const { data, error } = await access.supabase.rpc("partner_offers_for_child", { target: id.data });
  if (error) return error.code === "42501" ? json({ error: "Profile unavailable." }, 404) : json({ error: "Offers are unavailable right now." }, 503);
  const found = data as ChildOffers;
  if (!found.offers.length) return json({ ageBand: found.age_band, city: found.city, offers: [] });
  const books = await access.supabase.from("child_profile_notebooks").select("section,value").eq("child_id", id.data).eq("user_id", access.user.id);
  if (books.error) return json({ error: "Offers are unavailable right now." }, 503);
  const today = todayDate();
  const health = healthSchema.safeParse(books.data.find(b => b.section === "health")?.value ?? { entries: [] });
  const interests = interestsSchema.safeParse(books.data.find(b => b.section === "interests")?.value);
  const due = health.success ? dailyHealth(health.data.entries, today).reminders.filter(r => r.days >= -30) : [];
  const ctx: MomentContext = {
    month: Number(today.slice(5, 7)),
    interests: interests.success ? interests.data.selected : [],
    vaccinationDue: due.some(r => r.kind === "vaccination"),
    checkupDue: due.some(r => r.kind === "checkup"),
  };
  const offers = found.offers.filter(o => momentMatches(o, ctx)).flatMap((o): PartnerOffer[] => {
    if (o.cta === "link") {
      try { return [{ ...o, url: offerLink(o.url ?? "") }]; } catch { return []; }
    }
    return [{ ...o, url: null }];
  });
  return json({ ageBand: found.age_band, city: found.city, offers });
}

// Anonymous view and click counts for fee reconciliation. No family identifier is stored.
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return json({ error: "Invalid origin." }, 403);
  const access = await requireParentAccess();
  if (access.response) return access.response;
  const body = eventSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return json({ error: "Check the fields." }, 400);
  const { error } = await access.supabase.rpc("record_partner_events", { offers: [...new Set(body.data.offerIds)], event_kind: body.data.kind });
  if (error) return json({ error: "Not recorded." }, 503);
  return json({ ok: true });
}
