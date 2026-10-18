import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAdminSupabase } from './supabase-admin';

type Configuration = { key?: string; to?: string; from?: string; site?: string };
export function alertEnvelope(id: string, config: Configuration) {
  if (!config.key || !config.to) return null;
  const url = new URL(`/admin/consultations/${id}`, config.site || 'https://www.kahiye.app');
  if (url.protocol !== 'https:') throw new Error('Invalid operations link');
  return { from: config.from || 'Kahiye <alerts@kahiye.app>', to: config.to, subject: 'A Kahiye consultation needs coordination', text: `Open the protected team workspace to review request ${id}:\n${url}\n\nThis alert is not confirmation that the parent has been contacted.` };
}

/** Stable payload + provider idempotency key. Acceptance does not imply inbox delivery. */
export async function processConsultationAlert(id: string, options?: { db?: SupabaseClient; config?: Configuration; send?: typeof fetch }) {
  const db = options?.db ?? getAdminSupabase();
  const config = options?.config ?? { key: process.env.RESEND_API_KEY, to: process.env.EXPERT_NOTIFY_EMAIL, from: process.env.RESEND_FROM, site: process.env.NEXT_PUBLIC_SITE_URL };
  const { data: job, error } = await db.rpc('claim_consultation_alert', { target: id, envelope: alertEnvelope(id, config) });
  if (error) throw new Error('Could not claim operations alert');
  if (!job) return;
  let providerId: string | null = null;
  let failure: string | null = null;
  try {
    const res = await (options?.send ?? fetch)('https://api.resend.com/emails', {
      method: 'POST', signal: AbortSignal.timeout(8000),
      headers: { Authorization: `Bearer ${config.key}`, 'Content-Type': 'application/json', 'Idempotency-Key': `consultation-request/${id}` },
      body: JSON.stringify(job.payload),
    });
    const body = await res.json().catch(() => null);
    if (res.ok && typeof body?.id === 'string') providerId = body.id;
    else failure = `Provider did not confirm acceptance (HTTP ${res.status}).`;
  } catch { failure = 'Provider response unavailable. Retry within the safe window.'; }
  const finish = await db.rpc('finish_consultation_alert', { target: id, token: job.lease, accepted_id: providerId, failure });
  if (finish.error) throw new Error('Could not record operations alert result');
}
