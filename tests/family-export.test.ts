import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { FAMILY_EXPORT_EXCLUSIONS, FAMILY_EXPORT_TABLES, exportFilename } from '../src/lib/family-export';

// Erasure deletes the auth user; everything reachable through ON DELETE CASCADE goes with it.
// Derive that inventory from the same migration files the database suite applies.
function erasureInventory(dir = 'supabase') {
  const files = readdirSync(dir).filter(f => f === 'schema.sql' || (/^\d{3}_[a-z0-9_]+\.sql$/.test(f) && f !== '000_precheck.sql'))
    .sort((a, b) => (a === 'schema.sql' ? '001' : a).localeCompare(b === 'schema.sql' ? '001' : b));
  const name = (n: string) => n.toLowerCase().replace(/"/g, '').replace(/^public\./, '');
  const edges = new Map<string, Set<string>>(), dropped = new Set<string>();
  for (const file of files) {
    const sql = readFileSync(`${dir}/${file}`, 'utf8').replace(/\$(\w*)\$[\s\S]*?\$\1\$/g, '').replace(/--[^\n]*/g, '');
    for (const statement of sql.split(';')) {
      const drop = /^\s*drop\s+table\s+(?:if\s+exists\s+)?([\w."]+)/i.exec(statement);
      if (drop) dropped.add(name(drop[1]));
      const table = /^\s*(?:create\s+table(?:\s+if\s+not\s+exists)?|alter\s+table(?:\s+if\s+exists)?(?:\s+only)?)\s+([\w."]+)/i.exec(statement);
      if (!table) continue;
      for (const ref of statement.matchAll(/references\s+([\w."]+)\s*(?:\([^)]*\))?\s+on\s+delete\s+cascade/gi)) {
        const parents = edges.get(name(table[1])) ?? new Set<string>();
        edges.set(name(table[1]), parents.add(name(ref[1])));
      }
    }
  }
  const reached = new Set<string>(['auth.users']);
  for (let grew = true; grew;) {
    grew = false;
    for (const [table, parents] of edges) if (!reached.has(table) && [...parents].some(p => reached.has(p))) { reached.add(table); grew = true; }
  }
  reached.delete('auth.users');
  return new Set([...reached].filter(t => !dropped.has(t)));
}

test('every table account erasure removes is either exported or listed with a reason', () => {
  const inventory = erasureInventory();
  for (const core of ['children', 'decodes', 'memories', 'family_entries', 'guidance_jobs', 'consultation_events']) assert(inventory.has(core), `parser missed ${core}`);
  const exported = new Set<string>(FAMILY_EXPORT_TABLES), excluded = new Set(Object.keys(FAMILY_EXPORT_EXCLUSIONS));
  const missing = [...inventory].filter(t => !exported.has(t) && !excluded.has(t));
  assert.deepEqual(missing, [], `Add these erased tables to FAMILY_EXPORT_TABLES or FAMILY_EXPORT_EXCLUSIONS: ${missing.join(', ')}`);
  assert.deepEqual([...exported].filter(t => excluded.has(t)), [], 'A table cannot be both exported and excluded');
  assert.deepEqual([...exported, ...excluded].filter(t => !inventory.has(t)), [], 'Stale export inventory entries');
  for (const reason of Object.values(FAMILY_EXPORT_EXCLUSIONS)) assert(reason.length > 20);
});

test('export filename carries the UTC date', () => {
  assert.equal(exportFilename(new Date('2026-10-20T23:30:00Z')), 'kahiye-family-records-2026-10-20.json');
});
