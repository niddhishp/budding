import { z } from "zod";
import { todayDate } from "./family-care";
export const categories = [
  "clothing",
  "books",
  "art",
  "games",
  "movement",
  "music",
  "making",
  "nature",
] as const;
export const styles = ["simple", "colourful", "classic", "playful"] as const;
export const materials = ["plastic", "wool", "synthetic", "leather"] as const;
export const feedbackChoices = [
  "saved",
  "owned",
  "purchased",
  "too_expensive",
  "wrong_age",
  "wrong_interest",
  "style_material",
  "safety",
  "not_now",
] as const;
const text = (n: number) => z.string().trim().max(n);
const tags = z.array(z.enum(categories)).max(8);
const date = z.iso.date();
export const preferenceSchema = z
  .object({
    interests: tags,
    styles: z.array(z.enum(styles)).max(4),
    avoid: z.array(z.enum(materials)).max(4),
    budget: z.number().int().min(0).max(1000000),
    size: text(80),
    learnFromSaved: z.boolean().default(true),
  })
  .strict();
export type Preferences = z.infer<typeof preferenceSchema>;
export const emptyPreferences: Preferences = {
  interests: [],
  styles: [],
  avoid: [],
  budget: 0,
  size: "",
  learnFromSaved: true,
};
export const giftSchema = z
  .object({
    title: text(100).min(1),
    kind: z.enum(["occasion", "reward"]),
    date: date.nullable(),
    budget: z.number().min(0).max(1000000),
    idea: text(500),
    agreement: text(500),
    status: z.enum(["considering", "planned", "given", "archived"]),
  })
  .strict()
  .refine((v) => v.kind !== "reward" || v.agreement.length > 0, {
    message: "Add the small step you agreed together.",
  });
export type Gift = z.infer<typeof giftSchema>;
export const emptyGift: Gift = {
  title: "",
  kind: "occasion",
  date: null,
  budget: 0,
  idea: "",
  agreement: "",
  status: "considering",
};
export const feedbackSchema = z
  .object({
    productId: z.uuid(),
    choice: z.enum(feedbackChoices),
    reason: text(300),
    until: date.nullable(),
  })
  .strict();
const envelope = {
  id: z.uuid(),
  childId: z.uuid(),
  revision: z.number().int().nonnegative(),
};
export const shopRecordSchema = z.discriminatedUnion("kind", [
  z
    .object({
      ...envelope,
      kind: z.literal("preferences"),
      value: preferenceSchema,
    })
    .strict(),
  z
    .object({ ...envelope, kind: z.literal("gift"), value: giftSchema })
    .strict(),
  z
    .object({ ...envelope, kind: z.literal("feedback"), value: feedbackSchema })
    .strict(),
]);
export type ShopRecord = z.infer<typeof shopRecordSchema>;
const review = {
  state: z.enum(["draft", "published", "paused"]),
  reviewUntil: date.nullable(),
  evidence: text(1500),
};
export const productSchema = z
  .object({
    title: text(150),
    asin: z.string().regex(/^[A-Z0-9]{10}$/),
    category: z.enum(categories),
    minMonths: z.number().int().min(0).max(215),
    maxMonths: z.number().int().min(1).max(216),
    interests: tags,
    styles: z.array(z.enum(styles)).max(4),
    materials: z.array(z.enum(materials)).max(4),
    reason: text(600),
    safety: text(600),
    sizeNotes: text(300),
    ...review,
  })
  .strict()
  .refine((v) => v.minMonths < v.maxMonths, {
    message: "Age range must have an end after its start.",
  })
  .refine(
    (v) =>
      v.state !== "published" ||
      (v.title.length > 3 &&
        v.reason.length > 10 &&
        v.safety.length > 10 &&
        v.evidence.length > 10 &&
        !!v.reviewUntil),
    {
      message:
        "Publishing needs an original title, reason, safety guidance, review evidence and a current review date.",
    },
  );
export type Product = z.infer<typeof productSchema>;
export const emptyProduct: Product = {
  title: "",
  asin: "",
  category: "books",
  minMonths: 0,
  maxMonths: 216,
  interests: [],
  styles: [],
  materials: [],
  reason: "",
  safety: "",
  sizeNotes: "",
  state: "draft",
  reviewUntil: null,
  evidence: "",
};
export function safePartnerUrl(value: string, host: string) {
  try {
    const u = new URL(value);
    return (
      u.protocol === "https:" &&
      u.hostname === host &&
      !u.username &&
      !u.password &&
      !u.port &&
      !u.hash &&
      /^(?:[a-z0-9][a-z0-9-]*\.)+[a-z]{2,}$/.test(host) &&
      !/(^|\.)(localhost|local|internal|invalid|test)$/.test(host) &&
      !/[{}]/.test(value)
    );
  } catch {
    return false;
  }
}
export const financeSchema = z
  .object({
    title: text(120).min(1),
    url: text(1000),
    host: text(200),
    registration: text(200),
    arrangement: text(1500),
    disclosure: text(600),
    description: text(600),
    ...review,
  })
  .strict()
  .refine(
    (v) =>
      v.state !== "published" ||
      (safePartnerUrl(v.url, v.host) &&
        v.registration.length > 5 &&
        v.arrangement.length > 20 &&
        v.disclosure.length > 20 &&
        v.evidence.length > 20 &&
        v.description.length > 10 &&
        !!v.reviewUntil),
    {
      message:
        "Publication needs a verified registration, arrangement, disclosure, approved HTTPS domain and current review.",
    },
  );
export type FinancePartner = z.infer<typeof financeSchema>;
export const recipeSchema = z
  .object({
    title: text(100).min(1),
    category: z.enum(categories),
    ageBand: z.enum(["baby", "preschool", "school", "teen"]),
    interest: z.enum(categories),
    style: z.enum(["any", ...styles]),
    budget: z.number().int().min(0).max(100000),
    enabled: z.boolean(),
  })
  .strict();
export type Recipe = z.infer<typeof recipeSchema>;
export const settlementSchema = z
  .object({
    title: text(100).min(1),
    period: date,
    gross: z.number().min(0).max(1e9),
    refunds: z.number().min(0).max(1e9),
    paid: z.number().min(0).max(1e9),
    reference: text(200).min(1),
    note: text(1000),
  })
  .strict();
const adminEnvelope = {
  id: z.uuid(),
  revision: z.number().int().nonnegative(),
};
export const catalogSchema = z.discriminatedUnion("kind", [
  z
    .object({
      ...adminEnvelope,
      kind: z.literal("product"),
      value: productSchema,
    })
    .strict(),
  z
    .object({
      ...adminEnvelope,
      kind: z.literal("finance"),
      value: financeSchema,
    })
    .strict(),
  z
    .object({
      ...adminEnvelope,
      kind: z.literal("recipe"),
      value: recipeSchema,
    })
    .strict(),
  z
    .object({
      ...adminEnvelope,
      kind: z.literal("settlement"),
      value: settlementSchema,
    })
    .strict(),
]);
export type CatalogRecord = z.infer<typeof catalogSchema>;
export type PublicProduct = Omit<Product, "evidence"> & {
  id: string;
  url: string;
  plainUrl: string;
  affiliate: boolean;
};
export function amazonLink(asin: string, tag?: string) {
  if (!/^[A-Z0-9]{10}$/.test(asin)) return null;
  const u = new URL(`https://www.amazon.in/dp/${asin}`);
  if (tag && /^[a-zA-Z0-9_-]{2,80}$/.test(tag)) u.searchParams.set("tag", tag);
  return u.href;
}
export function ageMonths(dob: string | null, today = todayDate()) {
  if (!dob || dob > today) return null;
  const d = new Date(dob + "T00:00:00Z");
  if (!Number.isFinite(+d) || d.toISOString().slice(0, 10) !== dob) return null;
  return (
    (Number(today.slice(0, 4)) - d.getUTCFullYear()) * 12 +
    Number(today.slice(5, 7)) -
    d.getUTCMonth() -
    1 -
    (Number(today.slice(8)) < d.getUTCDate() ? 1 : 0)
  );
}
export function rankProducts(
  products: PublicProduct[],
  months: number | null,
  p: Preferences,
  feedback: ShopRecord[],
  today = todayDate(),
) {
  if (months === null || months < 0 || months >= 216) return [];
  const liked = p.learnFromSaved
    ? products.filter((v) =>
        feedback.some(
          (f) =>
            f.kind === "feedback" &&
            f.value.productId === v.id &&
            ["saved", "purchased"].includes(f.value.choice),
        ),
      )
    : [];
  return products
    .filter(
      (v) =>
        v.state === "published" &&
        !!v.reviewUntil &&
        v.reviewUntil >= today &&
        months >= v.minMonths &&
        months < v.maxMonths &&
        !v.materials.some((m) => p.avoid.includes(m)),
    )
    .flatMap((v) => {
      const f = feedback.find(
        (f) => f.kind === "feedback" && f.value.productId === v.id,
      );
      const choice =
        f?.kind === "feedback" && (!f.value.until || f.value.until >= today)
          ? f.value.choice
          : null;
      if (choice && choice !== "saved") return [];
      const matches = v.interests.filter((t) => p.interests.includes(t));
      const similar = liked.some(
        (l) =>
          l.id !== v.id &&
          (l.category === v.category ||
            l.styles.some((s) => v.styles.includes(s))),
      );
      const score =
        matches.length * 3 +
        v.styles.filter((t) => p.styles.includes(t)).length +
        (choice === "saved" ? 2 : 0) +
        (similar ? 0.5 : 0);
      return [
        {
          ...v,
          score,
          match: matches.length
            ? `Matches your shopping interests: ${matches.join(", ")}.`
            : similar
              ? "Similar to something you saved or marked purchased."
              : "Within the age range reviewed by our team.",
        },
      ];
    })
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}
export function discoveryQuery(r: Recipe) {
  const age = {
    baby: "baby 0 to 2 years",
    preschool: "children 3 to 5 years",
    school: "children 6 to 11 years",
    teen: "teenagers 12 to 17 years",
  }[r.ageBand];
  return `${r.category} ${r.interest === r.category ? "" : r.interest} ${r.style === "any" ? "" : r.style} ${age}`
    .replace(/\s+/g, " ")
    .trim();
}
export function giftIdeas(months: number | null, interests: readonly string[]) {
  const shared =
    months !== null && months < 36
      ? "A favourite song and a quiet, unhurried playtime together."
      : "Let them plan a small afternoon adventure with you.";
  return [
    shared,
    interests.includes("art")
      ? "Make a little exhibition of their drawings at home."
      : interests.includes("music")
        ? "Arrange a family concert where they choose the songs."
        : interests.includes("making")
          ? "Build something together from materials you already have."
          : "A library visit, with time to choose a book together.",
    "A handwritten note naming one effort you noticed.",
  ];
}
