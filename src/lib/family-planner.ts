import { z } from "zod";
import { todayDate } from "./family-care";

export const entryValueSchema = z
  .object({
    title: z.string().trim().min(1).max(100),
    date: z.iso.date().refine((d) => d >= "1900-01-01" && d <= "2200-01-01"),
    note: z.string().trim().max(1500),
    archived: z.boolean(),
    category: z.enum(["school", "activity", "celebration", "care", "other"]),
    cost: z.number().finite().min(0).max(1e9),
    saved: z.number().finite().min(0).max(1e9),
    monthly: z.number().finite().min(0).max(1e7),
    inflation: z.number().finite().min(0).max(20),
    annualReturn: z.number().finite().min(-20).max(20),
    photoHash: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .nullable(),
  })
  .strict();
export const familyEntrySchema = z
  .object({
    id: z.uuid(),
    child_id: z.uuid().nullable(),
    kind: z.enum(["event", "goal", "memory"]),
    revision: z.number().int().nonnegative(),
    value: entryValueSchema,
  })
  .strict()
  .superRefine((e, ctx) => {
    if (e.kind === "goal" && e.value.cost <= 0)
      ctx.addIssue({ code: "custom", message: "Add a goal cost." });
    if (e.kind === "memory" && (!e.child_id || e.value.date > todayDate()))
      ctx.addIssue({
        code: "custom",
        message: "Choose a child and a date no later than today.",
      });
    if (e.kind !== "memory" && e.value.photoHash !== null)
      ctx.addIssue({ code: "custom", message: "Unexpected photo." });
    if (
      e.kind !== "goal" &&
      [
        e.value.cost,
        e.value.saved,
        e.value.monthly,
        e.value.inflation,
        e.value.annualReturn,
      ].some((n) => n !== 0)
    )
      ctx.addIssue({ code: "custom", message: "Unexpected financial fields." });
  });
export type FamilyEntry = z.infer<typeof familyEntrySchema> & {
  photo_ready?: boolean;
};
export type EntryValue = z.infer<typeof entryValueSchema>;
export const blankValue = (): EntryValue => ({
  title: "",
  date: todayDate(),
  note: "",
  archived: false,
  category: "other",
  cost: 0,
  saved: 0,
  monthly: 0,
  inflation: 0,
  annualReturn: 0,
  photoHash: null,
});
export const cleanEntry = (e: FamilyEntry) => ({
  id: e.id,
  child_id: e.child_id,
  kind: e.kind,
  revision: e.revision,
  value: e.value,
});

export function monthsUntil(target: string, today = todayDate()) {
  if (target <= today) return 0;
  const a = new Date(today + "T00:00:00Z"),
    b = new Date(target + "T00:00:00Z");
  const raw =
    (b.getUTCFullYear() - a.getUTCFullYear()) * 12 +
    b.getUTCMonth() -
    a.getUTCMonth();
  const anniversaryDay = Math.min(
    a.getUTCDate(),
    new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth() + 1, 0)).getUTCDate(),
  );
  return Math.max(0, raw - Number(b.getUTCDate() < anniversaryDay));
}
export function savingsProjection(v: EntryValue, today = todayDate()) {
  const months = monthsUntil(v.date, today);
  const years = Math.max(
    0,
    (Date.parse(v.date + "T00:00:00Z") - Date.parse(today + "T00:00:00Z")) /
      86400000 /
      365.25,
  );
  const target = v.cost * (1 + v.inflation / 100) ** years;
  const rate = (1 + v.annualReturn / 100) ** (1 / 12) - 1;
  const factor =
    rate === 0 ? months : Math.expm1(months * Math.log1p(rate)) / rate;
  const existing = v.saved * (1 + rate) ** months;
  const contributed = v.saved + v.monthly * months;
  const projected = existing + v.monthly * factor;
  return {
    months,
    target,
    contributed,
    projected,
    growth: projected - contributed,
    gap: Math.max(0, target - projected),
    requiredMonthly:
      factor > 0 ? Math.max(0, (target - existing) / factor) : null,
  };
}
export function nextBirthday(birth: string, today = todayDate()) {
  const year = Number(today.slice(0, 4));
  const candidate = (y: number) => {
    const day =
      birth.slice(5) === "02-29" &&
      new Date(Date.UTC(y, 1, 29)).getUTCMonth() !== 1
        ? "02-28"
        : birth.slice(5);
    return `${y}-${day}`;
  };
  const date = candidate(year);
  return date < today ? candidate(year + 1) : date;
}
export const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
