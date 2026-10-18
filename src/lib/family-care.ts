import { z } from "zod";
export const careSchema = z.object({
  reference: z.enum(["unknown", "boys", "girls"]).default("unknown"),
  preterm: z.boolean().default(false),
  reminders: z.boolean().default(false),
  dismissed: z.array(z.string().max(50)).max(100).default([]),
  observations: z
    .record(z.string().max(60), z.enum(["noticed", "not_yet", "discuss"]))
    .refine((v) => Object.keys(v).length <= 100)
    .default({}),
  pregnancyChecklist: z.array(z.string().max(60)).max(40).default([]),
  pregnancyNotes: z.string().max(3000).default(""),
  favourites: z.array(z.string().max(60)).max(50).default([]),
});
export type CareSettings = z.infer<typeof careSchema>;
export const DEFAULT_CARE: CareSettings = careSchema.parse({});
export const growthSchema = z
  .object({
    id: z.uuid(),
    child_id: z.uuid(),
    revision: z.number().int().min(0),
    measured_on: z.iso.date(),
    weight_kg: z.number().min(0.3).max(300).nullable(),
    length_cm: z.number().min(20).max(250).nullable(),
    head_cm: z.number().min(15).max(80).nullable(),
    method: z.enum(["lying", "standing"]),
    note: z.string().trim().max(300).default(""),
    archived: z.boolean().default(false),
  })
  .refine(
    (v) => v.weight_kg !== null || v.length_cm !== null || v.head_cm !== null,
  );
export type GrowthEntry = z.infer<typeof growthSchema>;
export function ageDays(birth: string, date: string) {
  return Math.round(
    (Date.parse(date + "T00:00:00Z") - Date.parse(birth + "T00:00:00Z")) /
      86400000,
  );
}
export function todayDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function ageMonths(birth: string, date = todayDate()) {
  const b = new Date(birth + "T00:00:00Z"),
    d = new Date(date + "T00:00:00Z");
  return Math.max(
    0,
    (d.getUTCFullYear() - b.getUTCFullYear()) * 12 +
      d.getUTCMonth() -
      b.getUTCMonth() -
      (d.getUTCDate() < b.getUTCDate() ? 1 : 0),
  );
}
