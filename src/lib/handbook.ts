import { z } from "zod";
import { ageMonths } from "./shop";
import { todayDate } from "./family-care";
import { HANDBOOK, type HandbookCard } from "@/data/handbook";
import type { Child } from "@/types";

export const progressEntrySchema = z.object({
  status: z.enum(["saved", "tried", "revisit"]),
  followUp: z.iso.date().nullable(),
  updatedOn: z.iso.date(),
}).strict();
export const handbookProgressSchema = z.record(
  z.string().refine(id => HANDBOOK.some(card => card.id === id)),
  progressEntrySchema,
).refine(value => Object.keys(value).length <= 50);
export type HandbookProgress = z.infer<typeof handbookProgressSchema>;

export function handbookAge(child: Pick<Child, "dateOfBirth" | "dueDate">, today = todayDate()) {
  // Only an explicitly expecting profile receives pregnancy guidance.
  if (!child.dateOfBirth && child.dueDate && z.iso.date().safeParse(child.dueDate).success) return -1;
  return ageMonths(child.dateOfBirth, today);
}
export function cardsForChild(child: Pick<Child, "dateOfBirth" | "dueDate">, today = todayDate()) {
  const months = handbookAge(child, today);
  return months === null ? [] : HANDBOOK.filter(c => months >= c.minMonths && months <= c.maxMonths);
}
export function nextConversations(child: Child, today = todayDate()) {
  const months = handbookAge(child, today);
  if (months === null || months < 0 || months >= 216) return [];
  return HANDBOOK.filter(c => c.minMonths > months && c.minMonths <= months + 12);
}
export function suggestedConversation(child: Child, progress: HandbookProgress, today = todayDate()): HandbookCard | undefined {
  const cards = cardsForChild(child, today);
  const due = cards.filter(c => progress[c.id]?.followUp && progress[c.id].followUp! <= today)
    .sort((a, b) => progress[a.id].followUp!.localeCompare(progress[b.id].followUp!));
  if (due[0]) return due[0];
  const remaining = cards.filter(c => progress[c.id]?.status !== "tried" && !(progress[c.id]?.followUp && progress[c.id].followUp! > today));
  const saved = remaining.find(c => progress[c.id]?.status === "saved");
  if (saved) return saved;
  // A weekly invitation, not a claim that a new assessment happened overnight.
  return remaining[Math.floor(Date.parse(`${today}T00:00:00Z`) / 604800000) % Math.max(1, remaining.length)];
}
export function cardAgeLabel(card: HandbookCard) {
  if (card.minMonths < 0) return "Before birth";
  if (card.maxMonths < 12) return "Under 1 year";
  return `${Math.floor(card.minMonths / 12)}–${Math.floor(card.maxMonths / 12)} years`;
}
export function birthdayWithin(child: Child, today = todayDate(), days = 30) {
  if (ageMonths(child.dateOfBirth, today) === null || !child.dateOfBirth) return null;
  const year = Number(today.slice(0, 4));
  const month = Number(child.dateOfBirth.slice(5, 7));
  const birthDay = Number(child.dateOfBirth.slice(8, 10));
  const dateFor = (y: number) => `${y}-${String(month).padStart(2, "0")}-${String(Math.min(birthDay, new Date(Date.UTC(y, month, 0)).getUTCDate())).padStart(2, "0")}`;
  let next = dateFor(year);
  if (next < today) next = dateFor(year + 1);
  const distance = (Date.parse(`${next}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000;
  return distance <= days ? next : null;
}
