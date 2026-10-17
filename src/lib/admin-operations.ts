import { z } from 'zod';

export const CONSULTATION_STATUSES = ['new', 'contacted', 'scheduled', 'completed', 'cancelled'] as const;
export type ConsultationStatus = typeof CONSULTATION_STATUSES[number];
export const STATUS_LABELS: Record<ConsultationStatus, string> = { new: 'New request', contacted: 'In conversation', scheduled: 'Scheduled', completed: 'Completed', cancelled: 'Cancelled' };
export const TRANSITIONS: Record<ConsultationStatus, ConsultationStatus[]> = {
  new: ['new', 'contacted', 'cancelled'], contacted: ['contacted', 'scheduled', 'cancelled'],
  scheduled: ['scheduled', 'contacted', 'completed', 'cancelled'], completed: ['completed'], cancelled: ['cancelled'],
};
const optionalText = (max: number) => z.string().trim().max(max).default('');
export const expertSchema = z.object({
  id: z.uuid().optional(), version: z.number().int().positive().optional(),
  name: z.string().trim().min(2).max(120), title: z.string().trim().min(2).max(120),
  qualifications: z.string().trim().min(2).max(1000), registration: optionalText(200),
  specialties: z.string().trim().min(2).max(500), languages: z.string().trim().min(2).max(300),
  age_min: z.number().int().min(0).max(18), age_max: z.number().int().min(0).max(18), pregnancy_support: z.boolean(),
  bio: optionalText(2000), email: z.union([z.email().max(320), z.literal('')]), phone: optionalText(30),
  availability: optionalText(1000), fee_inr: z.number().int().min(0).max(100000), session_minutes: z.number().int().min(15).max(180),
  active: z.boolean(), reviewed: z.boolean(), verification_note: optionalText(1000), staff_email: z.union([z.email().max(320), z.literal('')]),
}).refine(v => v.age_max >= v.age_min, { message: 'Maximum age must be at least the minimum age.' })
  .refine(v => !v.reviewed || v.verification_note.length >= 5, { message: 'Record how credentials were checked.' })
  .refine(v => !v.id || Boolean(v.version), { message: 'Reload this expert before saving.' });
export type ExpertInput = z.infer<typeof expertSchema>;
export type Expert = ExpertInput & { id: string; version: number; verified_at: string | null; updated_at: string; staff_user_id: string | null };
export const consultationSchema = z.object({
  id: z.uuid(), version: z.number().int().positive(), status: z.enum(CONSULTATION_STATUSES),
  expert_id: z.uuid().nullable(), scheduled_at: z.iso.datetime({ offset: true }).nullable(), note: z.string().trim().max(2000),
}).refine(v => v.status !== 'scheduled' || Boolean(v.expert_id && v.scheduled_at), { message: 'Choose an expert and session time.' });
export type RequestSummary = { id: string; status: ConsultationStatus; source: string; preferred_language: string; created_at: string; scheduled_at: string | null; expert_id: string | null; expert_name: string | null; parent_email: string; version: number };
export type Consultation = RequestSummary & { concern: string; phone: string; preferred_time: string | null; child_name: string | null; child_dob: string | null; duration_minutes: number; consent_current: boolean; events: { id: string; occurred_at: string; note: string; details: { from: ConsultationStatus; to: ConsultationStatus; scheduled_at: string | null; actor_role: string; expert_name: string | null } }[] };
export type Overview = { counts: Record<ConsultationStatus | 'needs_follow_up' | 'safety', number>; ready_experts: number | null };
export function localDateTime(iso: string | null) {
  if (!iso) return '';
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
