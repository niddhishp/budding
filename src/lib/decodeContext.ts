import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { CHILD_COLUMNS, MEMORY_COLUMNS, childFromRow, memoryFromRow, type ChildRow, type MemoryRow } from '@/lib/mappers';
import { memoryUsable } from '@/lib/memory-controls';
import type { DecodeContext } from '@/lib/ai/decode';

type SituationRow = { id: string; scenario: string; analysis: { sayThis?: string }; outcome: 'worked' | 'partly' | 'did_not_work' | null; created_at: string; continuation_of: string | null };

/** A deliberate continuation, bounded to four earlier moments and one owned child. */
export async function loadSituationChain(db: SupabaseClient, childId: string, userId: string, firstId: string) {
  const chain: NonNullable<DecodeContext['continuation']> = [];
  const seen = new Set<string>();
  let id: string | null = firstId;
  while (id && chain.length < 4 && !seen.has(id)) {
    seen.add(id);
    const { data, error }: { data: SituationRow | null; error: unknown } = await db.from('decodes').select('id,scenario,analysis,outcome,created_at,continuation_of').eq('id', id).eq('user_id', userId).eq('child_id', childId).eq('safety_category', 'none').maybeSingle<SituationRow>();
    if (error || !data) throw new Error('Earlier situation unavailable');
    chain.push({ id: data.id, scenario: data.scenario, sayThis: data.analysis?.sayThis ?? '', outcome: data.outcome, createdAt: data.created_at });
    id = data.continuation_of ?? null;
  }
  return chain.reverse();
}

export async function loadDecodeContext(supabase: SupabaseClient, childId: string, userId?: string, continuationId?: string): Promise<DecodeContext | null> {
  let query = supabase.from('children').select(CHILD_COLUMNS).eq('id', childId);
  if (userId) query = query.eq('user_id', userId);
  const childRes = await query.maybeSingle<ChildRow>();
  if (childRes.error) throw new Error('Guidance context unavailable');
  if (!childRes.data) return null;
  const child = childFromRow(childRes.data);
  // Never automatically reintroduce stopped/corrected memories through raw logs or past decodes.
  const memoriesRes = child.memoryEnabled === false ? { data: [], error: null } : await supabase.from('memories').select(MEMORY_COLUMNS)
    .eq('child_id', childId).eq('archived', false).eq('sensitive', false).not('confirmed_at', 'is', null)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('confirmed_at', { ascending: false }).limit(25).returns<MemoryRow[]>();
  if (memoriesRes.error) throw new Error('Memory context unavailable');
  const continuation = continuationId && userId ? await loadSituationChain(supabase, childId, userId, continuationId) : [];
  return { child, recentLogs: [], pastDecodes: [],
    memories: (memoriesRes.data ?? []).map(memoryFromRow).filter(m => memoryUsable(m, child.memoryEnabled !== false)), continuation };
}
