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
  accepting_new: z.boolean().default(true), max_open_requests: z.number().int().min(1).max(100).default(10),
  daily_session_limit: z.number().int().min(1).max(24).default(4), buffer_minutes: z.number().int().min(0).max(120).default(15),
}).refine(v => v.age_max >= v.age_min, { message: 'Maximum age must be at least the minimum age.' })
  .refine(v => !v.reviewed || v.verification_note.length >= 5, { message: 'Record how credentials were checked.' })
  .refine(v => !v.id || Boolean(v.version), { message: 'Reload this expert before saving.' });
export type ExpertInput = z.infer<typeof expertSchema>;
export type Expert = ExpertInput & { id: string; version: number; verified_at: string | null; updated_at: string; staff_user_id: string | null; open_requests: number; sessions_today: number };
export const consultationSchema = z.object({
  id: z.uuid(), version: z.number().int().positive(), status: z.enum(CONSULTATION_STATUSES),
  expert_id: z.uuid().nullable(), scheduled_at: z.iso.datetime({ offset: true }).nullable(), note: z.string().trim().max(2000),
}).refine(v => v.status !== 'scheduled' || Boolean(v.expert_id && v.scheduled_at), { message: 'Choose an expert and session time.' });
export const QUEUE_FILTERS = [...CONSULTATION_STATUSES, 'overdue', 'unassigned', 'delivery'] as const;
export const CONTACT_OUTCOMES = { reached: 'Reached the parent', no_answer: 'No answer', message_left: 'Message left', failed: 'Contact failed', session_missed: 'Session missed' } as const;
export const contactSchema = z.object({ id: z.uuid(), event_id: z.uuid(), version: z.number().int().positive(), channel: z.enum(['phone','email','whatsapp','coordination']), outcome: z.enum(['reached','no_answer','message_left','failed','session_missed']), follow_up_at: z.iso.datetime({ offset: true }), note: z.string().trim().max(2000) });
export type AlertDelivery = { state: 'pending' | 'sending' | 'accepted' | 'failed' | 'blocked' | 'needs_review' | 'cancelled'; attempts: number; updated_at: string; last_error: string | null; provider_id: string | null; delivery_status?:string|null; delivery_at?:string|null };
export type RequestSummary = { id: string; status: ConsultationStatus; source: string; preferred_language: string; created_at: string; scheduled_at: string | null; expert_id: string | null; expert_name: string | null; parent_email: string; version: number; next_due_at: string | null; overdue: boolean };
export type Consultation = RequestSummary & { concern: string; phone: string; preferred_time: string | null; child_name: string | null; child_dob: string | null; duration_minutes: number; alert: AlertDelivery | null; consent_current: boolean; events: { id: string; occurred_at: string; action: string; note: string; details: { channel?: string; outcome?: keyof typeof CONTACT_OUTCOMES; follow_up_at?: string; from: ConsultationStatus; to: ConsultationStatus; scheduled_at: string | null; actor_role: string; expert_name: string | null } }[] };
export type Overview = { counts: Record<ConsultationStatus | 'needs_follow_up' | 'safety', number>; ready_experts: number | null; alert_attention: number | null };
export function localDateTime(iso: string | null) {
  if (!iso) return '';
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
