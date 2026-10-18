import test from 'node:test';
import assert from 'node:assert/strict';
import type { SupabaseClient } from '@supabase/supabase-js';
import { loadDecodeContext, loadSituationChain } from '../../src/lib/decodeContext';

function database(paused = false, missing = false) {
  const tables: string[] = [];
  const filters: Record<string, unknown> = {};
  const db = { from(table: string) {
    tables.push(table);
    const query = { select() { return query; }, eq(key: string, value: unknown) { filters[`${table}.${key}`] = value; return query; }, not() { return query; }, or() { return query; }, order() { return query; }, limit() { return query; },
      async maybeSingle() {
        if (table === 'children') return { data: { id: 'child', name: 'Synthetic', dob: '2020-01-01', memory_enabled: !paused }, error: null };
        const id = Number(filters['decodes.id']);
        return { data: missing ? null : { id: String(id), scenario: `Moment ${id}`, analysis: { sayThis: 'Try a pause' }, outcome: null, created_at: '2026-10-18', continuation_of: id > 0 ? String(id - 1) : null }, error: null };
      },
      async returns() { return { data: [
        { id: 'active', content: 'Current', archived: false, sensitive: false, confirmed_at: '2026-01-01' },
        { id: 'stopped', content: 'Stopped', archived: true, confirmed_at: '2026-01-01' },
        { id: 'private', content: 'Private', sensitive: true, confirmed_at: '2026-01-01' },
        { id: 'pending', content: 'Unreviewed' },
        { id: 'expired', content: 'Old', confirmed_at: '2026-01-01', expires_at: '2026-01-02' },
      ], error: null }; },
    }; return query;
  } } as unknown as SupabaseClient;
  return { db, tables, filters };
}
test('fresh guidance uses reviewed memories only and never silently loads raw logs or past situations', async () => {
  const { db, tables, filters } = database();
  const context = await loadDecodeContext(db, 'child', 'parent');
  assert.deepEqual(context?.memories?.map(m => m.content), ['Current']);
  assert.deepEqual(tables, ['children', 'memories']);
  assert.equal(filters['children.user_id'], 'parent');
  assert.deepEqual(context?.recentLogs, []); assert.deepEqual(context?.pastDecodes, []);
});
test('pause stops memory reads but explicit continuity still checks parent, child and safety', async () => {
  const { db, tables, filters } = database(true);
  const context = await loadDecodeContext(db, 'child', 'parent', '7');
  assert.equal(tables.includes('memories'), false);
  assert.deepEqual(context?.continuation?.map(d => d.id), ['4', '5', '6', '7']);
  assert.equal(filters['decodes.user_id'], 'parent');
  assert.equal(filters['decodes.child_id'], 'child');
  assert.equal(filters['decodes.safety_category'], 'none');
});
test('an unavailable earlier situation fails closed', async () => {
  await assert.rejects(loadSituationChain(database(false, true).db, 'child', 'parent', '1'), /unavailable/);
});

