import test from 'node:test';
import assert from 'node:assert/strict';
import { memoryStatus, memoryUsable, memoryExpiry, memoryUpdateSchema, memoryCreateSchema } from '../src/lib/memory-controls';
const now = Date.parse('2026-10-18T00:00:00Z');
const base = { archived: false, sensitive: false, confirmedAt: '2026-10-17T00:00:00Z', expiresAt: null };
test('only current, reviewed and non-private memories are usable; pause overrides all', () => {
  assert.equal(memoryUsable(base, true, now), true);
  for (const m of [ { ...base, archived: true }, { ...base, sensitive: true }, { ...base, confirmedAt: null }, { ...base, expiresAt: new Date(now).toISOString() } ]) assert.equal(memoryUsable(m, true, now), false);
  assert.equal(memoryUsable(base, false, now), false);
  assert.equal(memoryStatus({ ...base, archived: true, sensitive: true }, now), 'stopped');
  assert.equal(memoryStatus({ ...base, expiresAt: new Date(now + 1).toISOString() }, now), 'active');
});
test('review periods have exact boundaries and no-expiry is an explicit choice', () => {
  assert.equal(memoryExpiry('30', now), '2026-11-17T00:00:00.000Z');
  assert.equal(memoryExpiry('90', now), '2027-01-16T00:00:00.000Z');
  assert.equal(memoryExpiry('forever', now), null);
});
test('memory writes require ownership identifiers, revisions and explicit review choices', () => {
  const childId = 'd0000000-0000-4000-8000-000000000001';
  assert.equal(memoryUpdateSchema.safeParse({ childId, action: 'archive', revision: 1 }).success, true);
  for (const value of [{ childId, action: 'archive' }, { childId, action: 'edit', revision: 1, content: 'Hello' }, { childId, action: 'edit', revision: 0, content: 'Hello', sensitive: false, retention: '90' }]) assert.equal(memoryUpdateSchema.safeParse(value).success, false);
  const creation = { id: childId, childId, content: '  quiet time  ', sensitive: false, retention: '90' };
  assert.equal(memoryCreateSchema.parse(creation).content, 'quiet time');
  assert.equal(memoryCreateSchema.safeParse({ ...creation, content: 'x'.repeat(501) }).success, false);
});
