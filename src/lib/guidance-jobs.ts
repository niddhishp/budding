import 'server-only';
import { getAdminSupabase } from './supabase-admin';
import { checkUserConsent } from './access';
import { extractMemories } from './ai/memory';

/** Durable, bounded follow-up. Sources and consent are reloaded on every attempt. */
export async function processGuidanceJob(userId: string) {
  const db = getAdminSupabase();
  const { data: job, error } = await db.rpc('claim_guidance_job', { p_user: userId });
  if (error || !job) return;
  try {
    if (!await checkUserConsent(db, userId)) throw new Error('Consent unavailable');
    const { data: source, error: readError } = await db.from('decodes').select('scenario,safety_category,children(name,memory_enabled)').eq('id', job.decodeId).eq('user_id', userId).eq('child_id', job.childId).maybeSingle();
    if (readError) throw new Error('Source unavailable');
    let memories: Awaited<ReturnType<typeof extractMemories>> = [];
    if (source && source.safety_category === 'none' && (source.children as unknown as { memory_enabled: boolean }).memory_enabled) {
      const child = source.children as unknown as { name: string };
      const { data: known, error: knownError } = await db.from('memories').select('content').eq('child_id', job.childId).eq('sensitive', false).eq('archived', false).not('confirmed_at', 'is', null).or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`).limit(40);
      if (knownError) throw new Error('Memory lookup unavailable');
      memories = await extractMemories({ childName: child.name, message: source.scenario, known: (known ?? []).map(m => m.content) });
    }
    const { error: finishError } = await db.rpc('finish_guidance_job', { p_decode: job.decodeId, p_lease: job.lease, p_memories: memories });
    if (finishError) throw new Error('Follow-up save unavailable');
  } catch {
    await db.from('guidance_jobs').update({ state: 'failed', available_at: new Date(Date.now() + 60_000).toISOString(), updated_at: new Date().toISOString() }).eq('decode_id', job.decodeId).eq('lease', job.lease);
    console.warn('[guidance-job] follow-up deferred', { decodeId: job.decodeId });
  }
}
