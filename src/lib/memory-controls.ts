import { z } from 'zod';
import type { Memory } from '@/types';

export const retentionSchema = z.enum(['30', '90', '365', 'forever']);
export const memoryCreateSchema = z.object({ id: z.string().uuid(), childId: z.string().uuid(), content: z.string().trim().min(1).max(500), sensitive: z.boolean(), retention: retentionSchema });
export const memoryUpdateSchema = z.object({ childId: z.string().uuid(), revision: z.number().int().positive(), action: z.enum(['edit', 'confirm', 'archive', 'restore']), content: z.string().trim().min(1).max(500).optional(), sensitive: z.boolean().optional(), retention: retentionSchema.optional() }).superRefine((value, ctx) => {
  if (['edit', 'confirm'].includes(value.action) && (!value.retention || value.sensitive === undefined || (value.action === 'edit' && !value.content))) ctx.addIssue({ code: 'custom', message: 'Choose the memory content, privacy and review date.' });
});
export function memoryExpiry(retention: z.infer<typeof retentionSchema>, now = Date.now()) {
  return retention === 'forever' ? null : new Date(now + Number(retention) * 86400000).toISOString();
}
export function memoryStatus(memory: Pick<Memory, 'archived' | 'sensitive' | 'confirmedAt' | 'expiresAt'>, now = Date.now()) {
  if (memory.archived) return 'stopped';
  if (memory.sensitive) return 'private';
  if (!memory.confirmedAt) return 'suggested';
  if (memory.expiresAt && new Date(memory.expiresAt).getTime() <= now) return 'expired';
  return 'active';
}
export function memoryUsable(memory: Pick<Memory, 'archived' | 'sensitive' | 'confirmedAt' | 'expiresAt'>, enabled: boolean, now = Date.now()) {
  return enabled && memoryStatus(memory, now) === 'active';
}
