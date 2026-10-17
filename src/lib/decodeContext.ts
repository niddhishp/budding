import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { CHILD_COLUMNS, childFromRow, type ChildRow } from '@/lib/mappers';
import type { DecodeContext } from '@/lib/ai/decode';

/**
 * Load what a decode needs about one child: profile, recent observations, and rated past decodes.
 * With a user-scoped client RLS enforces ownership; with the admin client pass `userId` to scope it.
 */
export async function loadDecodeContext(
  supabase: SupabaseClient,
  childId: string,
  userId?: string,
): Promise<DecodeContext | null> {
  let childQuery = supabase.from('children').select(CHILD_COLUMNS).eq('id', childId);
  if (userId) childQuery = childQuery.eq('user_id', userId);

  const [childRes, logsRes, decodesRes, memoriesRes] = await Promise.all([
    childQuery.maybeSingle<ChildRow>(),
    supabase.from('context_logs').select('content, log_type, created_at')
      .eq('child_id', childId).order('created_at', { ascending: false }).limit(15),
    supabase.from('decodes').select('scenario, analysis, outcome, created_at')
      .eq('child_id', childId).eq('safety_category', 'none').not('outcome', 'is', null).order('created_at', { ascending: false }).limit(8),
    // Memory read gate: relevant, recent, permitted — sensitive memories are never fed back automatically.
    supabase.from('memories').select('kind, content, source, confidence')
      .eq('child_id', childId).eq('archived', false).eq('sensitive', false)
      .order('created_at', { ascending: false }).limit(25),
  ]);
  const failed = [childRes, logsRes, decodesRes, memoriesRes].find(result => result.error);
  if (failed) throw new Error('Guidance context unavailable');
  if (!childRes.data) return null;

  return {
    child: childFromRow(childRes.data),
    recentLogs: logsRes.data ?? [],
    pastDecodes: (decodesRes.data ?? []).map((d) => ({
      scenario: d.scenario as string,
      say_this: (d.analysis as { sayThis?: string } | null)?.sayThis ?? null,
      outcome: d.outcome as string | null,
      created_at: d.created_at as string,
    })),
    memories: (memoriesRes.data ?? []) as DecodeContext['memories'],
  };
}
