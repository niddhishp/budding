import { z } from "zod";
import { PROGRAMMES, type Programme } from "@/data/programmes";
import { handbookAge } from "./handbook";
import { pubertyGuideForChild } from "./child-profile";
import { todayDate } from "./family-care";
import type { Child } from "@/types";

/** One row of public.programme_enrolments, as the parent reads it under RLS (see supabase/031). */
export const enrolmentSchema = z.object({
  id: z.string(),
  child_id: z.string(),
  programme_id: z.string(),
  started_on: z.string(),
  progress: z.record(z.string(), z.string()),
  baseline: z.number().int().min(1).max(5),
  final: z.number().int().min(1).max(5).nullable(),
  status: z.enum(["active", "completed", "stopped"]),
  created_at: z.string(),
  updated_at: z.string(),
  revision: z.number().int().min(0),
});
export type Enrolment = z.infer<typeof enrolmentSchema>;
export const ENROLMENT_COLUMNS = "id,child_id,programme_id,started_on,progress,baseline,final,status,created_at,updated_at,revision";

type ProfileForProgrammes = Pick<Child, "dateOfBirth" | "dueDate" | "gender" | "pubertyGuide">;

export const findProgramme = (id: string | null | undefined) => PROGRAMMES.find(p => p.id === id);

/** A "girls" programme is offered unless the profile says Boy. Gender is never inferred. */
export function suitsProfile(programme: Programme, child: ProfileForProgrammes) {
  return programme.audience === "all" || pubertyGuideForChild(child) !== "boys";
}

/** Programmes for the child's age now, and those starting within the next year. Age comes from the DOB only. */
export function programmesForChild(child: ProfileForProgrammes, today = todayDate()) {
  const months = handbookAge(child, today);
  if (months === null || months < 0) return { current: [] as Programme[], comingUp: [] as Programme[] };
  const offered = PROGRAMMES.filter(p => suitsProfile(p, child));
  return {
    current: offered.filter(p => months >= p.minMonths && months <= p.maxMonths),
    comingUp: offered.filter(p => p.minMonths > months && p.minMonths <= months + 12),
  };
}

export function programmeAgeLabel(programme: Programme) {
  return `${Math.floor(programme.minMonths / 12)}–${Math.floor(programme.maxMonths / 12)} years`;
}
export const stepWord = (programme: Programme) => (programme.unit === "session" ? "Session" : "Day");
export const lengthLabel = (programme: Programme) => `${programme.steps.length} ${programme.unit === "session" ? "sessions" : "days"}`;

export const isDone = (enrolment: Pick<Enrolment, "progress">, day: number) => Object.prototype.hasOwnProperty.call(enrolment.progress, String(day));
export const doneCount = (enrolment: Pick<Enrolment, "progress">, programme: Programme) =>
  programme.steps.filter((_, i) => isDone(enrolment, i + 1)).length;

/** The first step not yet ticked (1-based), or null when every step is done. */
export function nextStep(enrolment: Pick<Enrolment, "progress">, programme: Programme): number | null {
  const index = programme.steps.findIndex((_, i) => !isDone(enrolment, i + 1));
  return index === -1 ? null : index + 1;
}

/** At most one programme for Today: the active one touched most recently that we still have content for. */
export function todayProgramme(enrolments: readonly Enrolment[]) {
  const active = enrolments.filter(e => e.status === "active" && findProgramme(e.programme_id))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
  if (!active) return null;
  const programme = findProgramme(active.programme_id)!;
  return { enrolment: active, programme, step: nextStep(active, programme) };
}

export const questionFor = (programme: Programme, name: string) => programme.question.replace("{name}", name);

/** How the parent's own two ratings compare. 1 is easy and 5 is very hard, so lower is easier. */
export function ratingChange(baseline: number, final: number) {
  return final < baseline ? "easier" : final > baseline ? "harder" : "same";
}
