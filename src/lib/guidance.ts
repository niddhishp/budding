import 'server-only';
import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getAdminSupabase } from './supabase-admin';

export class GuidanceRequestError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export type Reservation = { id: string; lease?: string; resultId?: string; complete: boolean };
export async function reserveGuidance(input: { id: string; userId: string; childId: string; kind: 'decode' | 'story' | 'report' | 'share'; content: unknown; refines?: string; free?: boolean }): Promise<Reservation> {
  const { data, error } = await getAdminSupabase().rpc('reserve_guidance', {
    p_id: input.id, p_user: input.userId, p_child: input.childId, p_kind: input.kind,
    p_fingerprint: createHash('sha256').update(JSON.stringify(input.content)).digest('hex'), p_refines: input.refines ?? null, p_free: input.free ?? false,
  });
  if (error || !data) throw new GuidanceRequestError(503, 'unavailable', 'We could not check this request. Nothing has been charged; please try again.');
  if (data.status === 'complete') return { id: input.id, complete: true, resultId: data.resultId };
  if (data.status === 'reserved') return { id: input.id, lease: data.lease, complete: false };
  if (data.status === 'limit') throw new GuidanceRequestError(data.plus ? 429 : 402, data.plus ? 'daily_limit' : 'upgrade_required', 'Your allowance for this feature has been used. You can still read saved guidance and access immediate support.');
  if (data.status === 'processing_limit') throw new GuidanceRequestError(429, 'processing_limit', 'There have been many processing attempts today. Please try again tomorrow. Saved guidance and immediate support remain available.');
  if (data.status === 'busy') throw new GuidanceRequestError(409, 'request_pending', 'A request is still being prepared. Please wait a moment, then retry.');
  if (data.status === 'refinement_limit' || data.status === 'invalid_refinement') throw new GuidanceRequestError(422, 'refinement_limit', 'This follow-up has expired or its two follow-ups are used. Describe the moment in a new request.');
  throw new GuidanceRequestError(409, data.status, 'This request could not be reused. Start a new request.');
}
export async function completeGuidance(r: Reservation, payload: Record<string, unknown>) {
  const { data, error } = await getAdminSupabase().rpc('complete_guidance', { p_id: r.id, p_lease: r.lease, p_payload: payload });
  if (error) throw new GuidanceRequestError(503, 'save_failed', 'We could not confirm the save. Retry this request to recover the saved result.');
  return data as string | null;
}
export async function failGuidance(r?: Reservation) {
  if (!r?.lease) return;
  await getAdminSupabase().from('guidance_requests').update({ state: 'failed', updated_at: new Date().toISOString() }).eq('id', r.id).eq('lease', r.lease).eq('state', 'pending');
}
export function guidanceErrorResponse(error: unknown) {
  if (error instanceof GuidanceRequestError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  console.error('[guidance] unavailable', { name: error instanceof Error ? error.name : 'unknown' });
  return NextResponse.json({ error: 'We could not prepare and check the guidance. Please try again. Immediate support is available at /help-now.' }, { status: 503 });
}
