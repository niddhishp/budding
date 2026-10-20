import { requireParentAccess } from "@/lib/access";
import { isSameOrigin } from "@/lib/access-policy";
import { adminJson as json } from "@/lib/admin-api";
import { enquirySchema } from "@/lib/partner-services";

const MESSAGES: Record<string, [string, number]> = {
  "Consent required": ["Confirm what will be shared before sending.", 400],
  "Child name not shared": ["Leave your child’s name out. The partner will only see their age band, and can ask you directly.", 400],
  "Already sent": ["You sent this enquiry in the last day. The partner will contact you.", 409],
  "Enquiry limit": ["You have sent several enquiries today. Please try again tomorrow.", 429],
};

// One enquiry with explicit, per-enquiry consent. The database builds the shared fields itself from
// a fixed list, so nothing beyond what the consent screen showed can reach the partner.
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return json({ error: "Invalid origin." }, 403);
  const access = await requireParentAccess();
  if (access.response) return access.response;
  const body = enquirySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return json({ error: body.error.issues[0]?.message ?? "Check the fields." }, 400);
  const v = body.data;
  const { data, error } = await access.supabase.rpc("create_partner_lead", {
    receipt: v.receipt, offer: v.offerId, target: v.childId, parent_name: v.parentName, contact_method: v.contactMethod,
    contact: v.contact, note: v.message, agreed: v.consent, agreed_version: v.consentVersion,
  });
  if (error) {
    if (error.code === "42501") return json({ error: "Profile unavailable." }, 404);
    if (error.code === "P0002") return json({ error: "This offer is no longer available." }, 410);
    if (error.code === "22023") return json({ error: "Check your name and contact details." }, 400);
    const known = MESSAGES[error.message];
    if (known) return json({ error: known[0] }, known[1]);
    return json({ error: "Your enquiry was not sent. Please try again." }, 503);
  }
  return json({ lead: (data as { lead: unknown }).lead });
}
