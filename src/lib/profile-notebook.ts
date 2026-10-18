import { z } from "zod";
import { todayDate } from "./family-care";
export const interestIds = [
  "art",
  "movement",
  "music",
  "patterns",
  "making",
  "words",
  "nature",
  "other",
] as const;
export const healthEntrySchema = z
  .object({
    id: z.uuid(),
    kind: z.enum(["vaccination", "medication", "checkup"]),
    title: z.string().trim().min(1).max(100),
    status: z.enum(["planned", "ongoing", "done", "not_applicable"]),
    date: z.iso.date().nullable(),
    nextDate: z.iso.date().nullable(),
    instructions: z.string().trim().max(1000),
    note: z.string().trim().max(1000),
    referenceId: z.string().max(60).nullable(),
    archived: z.boolean().default(false),
  })
  .refine(
    (v) => v.status !== "done" || (v.date !== null && v.date <= todayDate()),
    { message: "Completed records need a date no later than today." },
  )
  .refine((v) => v.kind === "medication" || v.status !== "ongoing", {
    message: "Only medication can be ongoing.",
  })
  .refine((v) => !v.date || !v.nextDate || v.nextDate >= v.date, {
    message: "The next date cannot be before the recorded date.",
  });
export const healthSchema = z
  .object({ entries: z.array(healthEntrySchema).max(200) })
  .refine(
    (v) => new Set(v.entries.map((e) => e.id)).size === v.entries.length,
    { message: "Duplicate records." },
  );
export const interestsSchema = z.object({
  selected: z
    .array(z.enum(interestIds))
    .max(8)
    .refine((v) => new Set(v).size === v.length),
  answers: z
    .array(
      z
        .array(z.enum(interestIds))
        .max(8)
        .refine((v) => new Set(v).size === v.length),
    )
    .max(3),
  note: z.string().trim().max(1500),
  updatedOn: z.iso.date().nullable(),
  band: z.enum(["baby", "preschool", "school", "teen"]).nullable(),
});
export const notebookSchema = z.discriminatedUnion("section", [
  z.object({
    childId: z.uuid(),
    section: z.literal("health"),
    revision: z.number().int().nonnegative(),
    value: healthSchema,
  }),
  z.object({
    childId: z.uuid(),
    section: z.literal("interests"),
    revision: z.number().int().nonnegative(),
    value: interestsSchema,
  }),
]);
export type HealthEntry = z.infer<typeof healthEntrySchema>;
export type HealthBook = z.infer<typeof healthSchema>;
export type InterestsBook = z.infer<typeof interestsSchema>;
export type InterestId = (typeof interestIds)[number];
export const emptyHealth: HealthBook = { entries: [] };
export const emptyInterests: InterestsBook = {
  selected: [],
  answers: [],
  note: "",
  updatedOn: null,
  band: null,
};
export function healthUpcoming(entries: HealthEntry[], today = todayDate()) {
  return entries
    .flatMap((e) => {
      const due =
        e.archived || e.status === "not_applicable"
          ? null
          : (e.nextDate ?? (e.status === "planned" ? e.date : null));
      return due ? [{ ...e, due, overdue: due < today }] : [];
    })
    .sort((a, b) => a.due.localeCompare(b.due));
}
export function interestBand(
  years: number,
): NonNullable<InterestsBook["band"]> {
  return years < 3
    ? "baby"
    : years < 6
      ? "preschool"
      : years < 12
        ? "school"
        : "teen";
}
