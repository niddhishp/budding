import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAdminSupabase } from './supabase-admin';
import { checkUserConsent } from './access';
import { extractMemories } from './ai/memory';

type Deps = { db?: SupabaseClient; extract?: typeof extractMemories };
export type LogMemoryResult = 'no_consent' | 'paused' | 'nothing' | 'suggested' | 'failed';

/**
 * A saved moment may suggest memories, exactly as an Ask message does: through the write gate, as
 * unconfirmed suggestions the parent reviews in "What Kahiye remembers". The raw note never enters
 * guidance (see loadDecodeContext). This runs after the note is saved and the response is sent; a
 * failure loses only a suggestion, never the note. Consent and the per-child pause are checked here
 * and again inside propose_log_memories at commit time.
 */
export async function proposeLogMemories(opts: { userId: string; logId: string; childId: string }, deps: Deps = {}): Promise<LogMemoryResult> {
  const db = deps.db ?? getAdminSupabase(), extract = deps.extract ?? extractMemories;
  try {
    if (!await checkUserConsent(db, opts.userId)) return 'no_consent';
    const { data: log, error } = await db.from('context_logs').select('content,children(name,memory_enabled)')
      .eq('id', opts.logId).eq('user_id', opts.userId).eq('child_id', opts.childId).maybeSingle();
    if (error) throw new Error('Source unavailable');
    const child = (log?.children ?? null) as unknown as { name: string; memory_enabled: boolean } | null;
    if (!log || !child?.memory_enabled) return 'paused';
    const { data: known, error: knownError } = await db.from('memories').select('content').eq('child_id', opts.childId)
      .eq('sensitive', false).eq('archived', false).not('confirmed_at', 'is', null)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`).limit(40);
    if (knownError) throw new Error('Memory lookup unavailable');
    const memories = await extract({ childName: child.name, message: log.content as string, known: (known ?? []).map(m => m.content as string) });
    if (!memories.length) return 'nothing';
    const { error: commitError } = await db.rpc('propose_log_memories', { p_log: opts.logId, p_user: opts.userId, p_memories: memories });
    if (commitError) throw new Error('Suggestion save unavailable');
    return 'suggested';
  } catch (error) {
    console.warn('[log-memories] suggestion skipped', { name: error instanceof Error ? error.name : 'unknown' });
    return 'failed';
  }
}
