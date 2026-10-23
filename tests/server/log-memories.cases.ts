import test from 'node:test';
import assert from 'node:assert/strict';
import type { SupabaseClient } from '@supabase/supabase-js';
import { proposeLogMemories } from '../../src/lib/log-memories';
import type { extractMemories } from '../../src/lib/ai/memory';

type Extract = typeof extractMemories;
type Suggestion = Awaited<ReturnType<Extract>>[number];
const suggestion: Suggestion = { kind: 'fact', content: 'Started at the new creche', source: 'parent_said', confidence: 1, sensitive: false };

function database(opts: { consent?: boolean; paused?: boolean; missing?: boolean; commitFails?: boolean } = {}) {
  const calls: { rpc: unknown[]; tables: string[]; filters: Record<string, unknown> } = { rpc: [], tables: [], filters: {} };
  const db = {
    from(table: string) {
      calls.tables.push(table);
      const query = {
        select() { return query; }, eq(key: string, value: unknown) { calls.filters[`${table}.${key}`] = value; return query; }, not() { return query; }, or() { return query; }, limit() { return query; },
        async maybeSingle() {
          if (table === 'consents') return { data: opts.consent === false ? null : { policy_version: '2026-10-05' }, error: null };
          if (table === 'context_logs') return { data: opts.missing ? null : { content: 'Settles with a song. Started at the new creche.', children: { name: 'Synthetic', memory_enabled: !opts.paused } }, error: null };
          return { data: null, error: null };
        },
        then(resolve: (v: unknown) => void) { resolve({ data: [{ content: 'Settles with a song' }], error: null }); },
      };
      return query;
    },
    async rpc(name: string, args: unknown) { calls.rpc.push([name, args]); return { data: 1, error: opts.commitFails ? { message: 'boom' } : null }; },
  } as unknown as SupabaseClient;
  return { db, calls };
}
const extractor = (result: Suggestion[] | Error) => {
  const seen: Parameters<Extract>[0][] = [];
  const extract: Extract = async (input) => { seen.push(input); if (result instanceof Error) throw result; return result; };
  return { extract, seen };
};
const args = { userId: 'parent', logId: 'log', childId: 'child' };

test('a saved moment becomes suggestions through the write gate, with what is already known', async () => {
  const { db, calls } = database(), { extract, seen } = extractor([suggestion]);
  assert.equal(await proposeLogMemories(args, { db, extract }), 'suggested');
  assert.deepEqual(seen, [{ childName: 'Synthetic', message: 'Settles with a song. Started at the new creche.', known: ['Settles with a song'] }]);
  assert.deepEqual(calls.rpc, [['propose_log_memories', { p_log: 'log', p_user: 'parent', p_memories: [suggestion] }]]);
  assert.equal(calls.filters['context_logs.user_id'], 'parent');
  assert.equal(calls.filters['context_logs.child_id'], 'child');
  assert.equal(calls.filters['memories.sensitive'], false);
});
test('nothing worth keeping means no commit', async () => {
  const { db, calls } = database(), { extract } = extractor([]);
  assert.equal(await proposeLogMemories(args, { db, extract }), 'nothing');
  assert.deepEqual(calls.rpc, []);
});
test('withdrawn consent and a paused child stop before the model is called', async () => {
  for (const [opts, expected] of [[{ consent: false }, 'no_consent'], [{ paused: true }, 'paused'], [{ missing: true }, 'paused']] as const) {
    const { db, calls } = database(opts), { extract, seen } = extractor([suggestion]);
    assert.equal(await proposeLogMemories(args, { db, extract }), expected);
    assert.equal(seen.length, 0);
    assert.deepEqual(calls.rpc, []);
  }
});
test('model and commit failures are absorbed; the note itself is never at risk', async () => {
  const warn = console.warn; const warned: unknown[] = []; console.warn = (...a: unknown[]) => { warned.push(a); };
  try {
    assert.equal(await proposeLogMemories(args, { db: database().db, extract: extractor(new Error('Memory extraction unavailable')).extract }), 'failed');
    assert.equal(await proposeLogMemories(args, { db: database({ commitFails: true }).db, extract: extractor([suggestion]).extract }), 'failed');
    assert.equal(warned.length, 2);
  } finally { console.warn = warn; }
});
