import { z } from "zod";
import { interestIds } from "./profile-notebook";
import { TRACKS } from "@/data/handbook";

// Partner services. Kahiye is a facilitator: partners provide services under their own terms and
// parents pay them directly. SQL (supabase/032_partner_services.sql) is authoritative for every
// gate; these mirrors exist for clear admin forms and for placing offers in parenting moments.

export const PARTNER_CONSENT_VERSION = "partner-enquiry-2026-10-21";
export const PARTNER_REF = "kahiye";

export const partnerCategories = ["health_lab", "hospital", "paediatrician", "dietitian", "tuition", "skills", "venue", "therapy", "other"] as const;
export type PartnerCategory = (typeof partnerCategories)[number];
export const CATEGORY_LABELS: Record<PartnerCategory, string> = {
  health_lab: "Home health checks & vaccination", hospital: "Hospital", paediatrician: "Paediatrician", dietitian: "Dietitian",
  tuition: "Tuition", skills: "Skill classes", venue: "Days out", therapy: "Therapy & speech", other: "Other",
};
/** In-home or one-to-one contact with children: police verification and insurance required. */
export const NEEDS_VETTING: readonly PartnerCategory[] = ["health_lab", "paediatrician", "dietitian", "tuition", "skills", "therapy", "other"];
/** Medical-ethics rule: booking or listing fees only, never a per-patient commission. */
export const HEALTH_CATEGORIES: readonly PartnerCategory[] = ["health_lab", "hospital", "paediatrician", "dietitian", "therapy"];
export const feeModels = ["commission", "booking_fee", "listing_fee"] as const;
export const FEE_LABELS: Record<(typeof feeModels)[number], string> = { commission: "a commission", booking_fee: "a booking fee", listing_fee: "a listing fee" };
export const moments = ["always", "vaccination_due", "checkup_due", "exam_season", "interest", "handbook_track", "programme"] as const;
export type Moment = (typeof moments)[number];
export const MOMENT_LABELS: Record<Moment, string> = {
  always: "Always, within its age and city", vaccination_due: "When a vaccination is due", checkup_due: "When a check-up is due",
  exam_season: "In exam months", interest: "When the child has this interest", handbook_track: "In this Handbook topic", programme: "A named programme",
};
export const DEFAULT_EXAM_MONTHS = [2, 3];

/** A short list keeps matching reliable; "Other" lets a parent type their own. */
export const CITY_OPTIONS = ["Ahmedabad", "Bengaluru", "Bhopal", "Chandigarh", "Chennai", "Coimbatore", "Delhi", "Gurugram", "Hyderabad", "Indore", "Jaipur", "Kochi", "Kolkata", "Kozhikode", "Lucknow", "Mumbai", "Nagpur", "Navi Mumbai", "Noida", "Pune", "Surat", "Thane", "Thiruvananthapuram"] as const;
export const cityField = z.string().trim().min(2).max(60).regex(/^[^<>{}\\/@]+$/, "Use letters for the city name.");

export type PartnerOffer = {
  id: string; title: string; summary: string; category: PartnerCategory; moment: Moment; trigger_value: string | null;
  price_label: string; cta: "link" | "enquiry"; url: string | null; online: boolean;
  provider: string; terms_url: string; grievance_contact: string; fee_model: (typeof feeModels)[number];
};
export type ChildOffers = { age_band: string | null; city: string | null; offers: PartnerOffer[] };

export type Placement = "child" | "health" | "interests" | "learning" | "today";
const PLACEMENT_CATEGORIES: Record<Placement, readonly PartnerCategory[]> = {
  child: partnerCategories,
  health: ["health_lab", "hospital", "paediatrician", "dietitian"],
  interests: ["skills"],
  learning: ["tuition"],
  today: ["health_lab", "hospital", "paediatrician"],
};
export const PLACEMENT_LIMITS: Record<Placement, number> = { child: 3, health: 3, interests: 3, learning: 3, today: 1 };

export type MomentContext = { month: number; interests: readonly string[]; vaccinationDue: boolean; checkupDue: boolean };

export function examMonths(value: string | null) {
  return value ? value.split(",").map(Number) : DEFAULT_EXAM_MONTHS;
}
/** Does this family's moment call for the offer now? Uses only Kahiye-held context; nothing is sent anywhere. */
export function momentMatches(offer: Pick<PartnerOffer, "moment" | "trigger_value">, ctx: MomentContext) {
  switch (offer.moment) {
    case "always": case "programme": case "handbook_track": return true;
    case "vaccination_due": return ctx.vaccinationDue;
    case "checkup_due": return ctx.checkupDue;
    case "exam_season": return examMonths(offer.trigger_value).includes(ctx.month);
    case "interest": return !!offer.trigger_value && ctx.interests.includes(offer.trigger_value);
  }
}

/** Offers for one place in the app. Order is the editorial order from SQL; fees never rank. */
export function placementOffers(offers: readonly PartnerOffer[], placement: Placement, options: { track?: string } = {}) {
  const fits = offers.filter(o => PLACEMENT_CATEGORIES[placement].includes(o.category) && (
    placement === "today" ? o.moment === "vaccination_due" || o.moment === "checkup_due"
    : placement === "learning" ? o.moment !== "handbook_track" || o.trigger_value === (options.track ?? "school")
    : o.moment !== "handbook_track"));
  return fits.slice(0, PLACEMENT_LIMITS[placement]);
}

/** Link-outs carry a referral marker only: never a family, child or session identifier. */
export function offerLink(url: string) {
  const u = new URL(url);
  if (u.protocol !== "https:") throw new Error("Partner links must use https");
  u.searchParams.set("ref", PARTNER_REF);
  return u.toString();
}

export const partnerLabel = (provider: string) => `Partner offer · Kahiye may earn a fee · ${provider} provides this service under its own terms`;

const httpsUrl = z.url({ protocol: /^https$/ }).max(300);
const date = z.iso.date();
export const partnerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  legal_name: z.string().trim().min(2).max(200),
  category: z.enum(partnerCategories),
  website: z.union([httpsUrl, z.literal("")]),
  terms_url: z.union([httpsUrl, z.literal("")]),
  contact_email: z.union([z.email().max(254), z.literal("")]),
  grievance_contact: z.string().trim().max(200).refine(v => v === "" || v.length >= 5, "Add an email, phone or link for complaints."),
  contract_signed_on: z.union([date, z.literal("")]),
  contract_expires_on: z.union([date, z.literal("")]),
  fee_model: z.enum(feeModels),
  fee_note: z.string().trim().max(500),
  police_verification_confirmed: z.boolean(),
  insurance_confirmed: z.boolean(),
  status: z.enum(["draft", "active", "paused"]),
}).strict();
export type PartnerInput = z.infer<typeof partnerSchema>;

/** Plain-language list of what still blocks activation. SQL enforces the same rules. */
export function partnerGateProblems(p: PartnerInput, today: string) {
  const problems: string[] = [];
  if (!p.contract_signed_on) problems.push("Record the date the contract was signed.");
  else if (p.contract_signed_on > today) problems.push("The contract is not in force yet.");
  if (p.contract_expires_on && p.contract_expires_on < today) problems.push("The contract has expired.");
  if (!p.terms_url) problems.push("Add the partner’s own terms link.");
  if (!p.contact_email) problems.push("Add a partner contact email.");
  if (!p.grievance_contact) problems.push("Add the partner’s grievance contact.");
  if (NEEDS_VETTING.includes(p.category)) {
    if (!p.police_verification_confirmed) problems.push("Confirm police verification for everyone who meets children.");
    if (!p.insurance_confirmed) problems.push("Confirm professional liability insurance.");
  }
  if (HEALTH_CATEGORIES.includes(p.category) && p.fee_model === "commission") problems.push("Health partners use a booking or listing fee, never a per-patient commission.");
  return problems;
}

export const offerSchema = z.object({
  partner_id: z.uuid(),
  title: z.string().trim().min(3).max(120),
  summary: z.string().trim().min(10).max(600),
  category: z.enum(partnerCategories),
  min_months: z.number().int().min(0).max(215),
  max_months: z.number().int().min(1).max(216),
  cities: z.array(z.string().trim().min(2).max(60).regex(/^[^<>{}]+$/)).min(1).max(30),
  moment: z.enum(moments),
  trigger_value: z.string().trim().max(60).nullable(),
  price_label: z.string().trim().max(80),
  cta: z.enum(["link", "enquiry"]),
  url: z.union([z.url({ protocol: /^https$/ }).max(500), z.literal("")]),
  status: z.enum(["draft", "active", "paused"]),
}).strict()
  .refine(v => v.min_months < v.max_months, { message: "The age range must end after it starts." })
  .refine(v => v.cta !== "link" || v.url !== "", { message: "A link offer needs its https link." })
  .refine(v => v.moment === "interest" ? (interestIds as readonly string[]).includes(v.trigger_value ?? "")
    : v.moment === "handbook_track" ? TRACKS.some(t => t[0] === v.trigger_value)
    : v.moment === "exam_season" ? v.trigger_value === null || /^(1[0-2]|[1-9])(,(1[0-2]|[1-9])){0,5}$/.test(v.trigger_value)
    : v.moment === "programme" ? !!v.trigger_value : v.trigger_value === null, { message: "Choose the moment detail that matches this trigger." });
export type OfferInput = z.infer<typeof offerSchema>;

export const adminSaveSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("partner"), id: z.uuid(), revision: z.number().int().nonnegative(), value: partnerSchema }).strict(),
  z.object({ kind: z.literal("offer"), id: z.uuid(), revision: z.number().int().nonnegative(), value: offerSchema }).strict(),
]);
export const leadStatusSchema = z.object({ leadId: z.uuid(), status: z.enum(["new", "sent", "closed"]) }).strict();

export const enquirySchema = z.object({
  receipt: z.uuid(),
  offerId: z.uuid(),
  childId: z.uuid(),
  parentName: z.string().trim().min(2, "Add the name the partner should use.").max(80),
  contactMethod: z.enum(["phone", "email"]),
  contact: z.string().trim().min(3).max(254),
  message: z.string().trim().max(500),
  consent: z.literal(true, { message: "Confirm what will be shared before sending." }),
  consentVersion: z.literal(PARTNER_CONSENT_VERSION),
}).strict().superRefine((v, ctx) => {
  const ok = v.contactMethod === "phone" ? /^\+?[0-9][0-9 -]{7,17}$/.test(v.contact) : z.email().safeParse(v.contact).success;
  if (!ok) ctx.addIssue({ code: "custom", path: ["contact"], message: v.contactMethod === "phone" ? "Check the phone number." : "Check the email address." });
});
export const eventSchema = z.object({ kind: z.enum(["view", "click"]), offerIds: z.array(z.uuid()).min(1).max(10) }).strict();

/** The fields a partner will receive, in the order the consent screen shows them. */
export function sharedPreview(input: { parentName: string; contactMethod: "phone" | "email"; contact: string; message: string }, child: { ageBand: string | null; city: string | null }) {
  return [
    ["Your name", input.parentName.trim()],
    [input.contactMethod === "phone" ? "Your phone" : "Your email", input.contact.trim()],
    ["Your child’s age band", child.ageBand ?? ""],
    ...(child.city ? [["Your city", child.city]] : []),
    ...(input.message.trim() ? [["Your message", input.message.trim()]] : []),
  ] as [string, string][];
}
