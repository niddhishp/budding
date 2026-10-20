import test from 'node:test';
import assert from 'node:assert/strict';
import type { SupabaseClient } from '@supabase/supabase-js';
import { collectFamilyExport, ExportUnavailable, FAMILY_EXPORT_TABLES, type LinkSigner } from '../../src/lib/family-export';

const me = 'a0000000-0000-4000-8000-000000000001', child = 'a0000000-0000-4000-8000-000000000011', hash = 'c'.repeat(64);
const rows: Record<string, Record<string, unknown>[]> = {
  children: [{ id: child, user_id: me, name: 'Synthetic', dob: '2019-01-01', gender: 'girl', memory_enabled: true, created_at: '2026-01-01' }],
  consents: [{ user_id: me, policy_version: '2026-10-05', agreed_at: '2026-10-05' }],
  consent_events: [{ id: 'e1', user_id: me, policy_version: '2026-10-05', action: 'accepted', occurred_at: '2026-10-05' }],
  subscriptions: [{ user_id: me, plan: 'plus', interval: 'monthly', status: 'active', razorpay_subscription_id: 'sub_secret', event_created_at: 9, event_priority: 2, current_period_end: '2026-11-01' }],
  whatsapp_links: [{ user_id: me, phone: '+910000000000', last_child_id: child, linked_at: '2026-10-01' }],
  context_logs: [{ id: 'l1', child_id: child, user_id: me, content: 'Slept well', log_type: 'observation', embedding: '[0.1]', created_at: '2026-10-02' }],
  decodes: [
    { id: 'd1', child_id: child, user_id: me, scenario: 'Bedtime', analysis: { sayThis: 'Pause' }, risk_level: 'none', safety_category: 'none', model: 'vendor-model-id', channel: 'app', created_at: '2026-10-03' },
    { id: 'd2', child_id: child, user_id: me, scenario: 'Talk', analysis: { conversation: { mode: 'talk' } }, channel: 'app', created_at: '2026-10-04' },
    { id: 'd3', child_id: child, user_id: me, scenario: 'Practise', analysis: { conversation: { mode: 'rehearse' } }, channel: 'whatsapp', created_at: '2026-10-05' },
  ],
  memories: [{ id: 'm1', child_id: child, user_id: me, kind: 'fact', content: 'Likes trains', archived: true, revision: 4, created_at: '2026-10-02' }],
  stories: [{ id: 's1', child_id: child, user_id: me, title: 'Moon', body: 'Once', audio_path: `${me}/s1.mp3`, model: 'vendor-model-id', created_at: '2026-10-02' },
    { id: 's2', child_id: child, user_id: me, title: 'Foreign', body: 'Once', audio_path: 'someone-else/s2.mp3', created_at: '2026-10-03' }],
  reports: [{ id: 'r1', child_id: child, user_id: me, period_start: '2026-10-01', period_end: '2026-10-07', report: { summary: 'Calm' }, model: 'vendor-model-id' }],
  growth_entries: [{ id: 'g1', child_id: child, user_id: me, measured_on: '2026-10-01', weight_kg: 20, revision: 2 }],
  child_care_state: [{ child_id: child, user_id: me, revision: 3, value: { reminders: true, handbook: { 'card-1': { status: 'done' } } } }],
  child_profile_notebooks: [{ child_id: child, user_id: me, section: 'health', revision: 1, value: { entries: [{ title: 'Vaccine' }] } }],
  family_entries: [
    { id: 'f1', child_id: child, user_id: me, kind: 'memory', photo_ready: true, revision: 1, value: { title: 'Beach', date: '2026-09-01', photoHash: hash } },
    { id: 'f2', child_id: null, user_id: me, kind: 'goal', photo_ready: false, revision: 0, value: { title: 'College', date: '2030-01-01', cost: 10, photoHash: null } },
  ],
  shop_records: [{ id: 'p1', child_id: child, user_id: me, kind: 'preferences', revision: 0, value: { materials: [] } }],
  programme_enrolments: [{ id: 'pe1', child_id: child, user_id: me, programme_id: 'potty-training', status: 'completed', started_on: '2026-10-01', progress: { 1: '2026-10-01' }, baseline: 4, final: 2, revision: 7, created_at: '2026-10-01', updated_at: '2026-10-08' }],
  expert_requests: [{ id: 'x1', child_id: child, user_id: me, concern: 'Sleep', status: 'new', expert_id: 'internal', version: 3, next_follow_up_at: '2026-10-10', created_at: '2026-10-06' }],
};

function database(failing?: string) {
  const reads: { table: string; user?: unknown }[] = [];
  const db = { from(table: string) {
    const read: { table: string; user?: unknown } = { table };
    reads.push(read);
    const query = { select() { return query; }, eq(key: string, value: unknown) { if (key === 'user_id') read.user = value; return query; }, order() { return query; },
      async range() { return table === failing ? { data: null, error: { message: 'down' } } : { data: rows[table] ?? [], error: null }; } };
    return query;
  } } as unknown as SupabaseClient;
  return { db, reads };
}

test('export reads every family table as the parent, organised by child, without internal fields', async () => {
  const { db, reads } = database();
  const signed: { bucket: string; paths: string[]; seconds: number }[] = [];
  const sign: LinkSigner = async (bucket, paths, seconds) => { signed.push({ bucket, paths, seconds }); return new Map(paths.map(p => [p, `https://signed.invalid/${p}`])); };
  const out = await collectFamilyExport(db, sign, { id: me, email: 'parent@example.invalid' }, new Date('2026-10-20T10:00:00Z'));
  assert.deepEqual(reads.map(r => r.table).sort(), [...FAMILY_EXPORT_TABLES].sort());
  assert(reads.every(r => r.user === me), 'Every read is filtered to the parent');
  const text = JSON.stringify(out);
  for (const internal of ['sub_secret', 'event_priority', 'embedding', 'vendor-model-id', 'photoHash', 'next_follow_up_at', '"expert_id"', '"version":3', '"revision"', 'last_child_id', 'someone-else'])
    assert(!text.includes(internal), `export leaked ${internal}`);
  assert.equal(out.account.email, 'parent@example.invalid');
  assert.equal(out.account.subscription?.status, 'active');
  assert.deepEqual(out.account.whatsapp, { linked: true, phone: '+910000000000', linked_at: '2026-10-01' });
  const [c] = out.children;
  assert.deepEqual(c.guidance.map(g => g.type), ['guidance', 'chat', 'practice']);
  assert.equal(c.memories[0].archived, true);
  assert.deepEqual(c.handbook_progress, { 'card-1': { status: 'done' } });
  assert.deepEqual(c.care_settings, { reminders: true });
  assert.deepEqual(c.health_notebook, { entries: [{ title: 'Vaccine' }] });
  assert.deepEqual(c.photo_timeline[0].photo, { url: `https://signed.invalid/${me}/f1-${hash}.jpg`, expires_at: '2026-10-20T11:00:00.000Z' });
  assert.equal(c.stories.find(s => s.id === 's2')?.narration, null, 'Foreign storage keys are never signed');
  assert.deepEqual(signed, [{ bucket: 'family-photos', paths: [`${me}/f1-${hash}.jpg`], seconds: 3600 }, { bucket: 'story-audio', paths: [`${me}/s1.mp3`], seconds: 3600 }]);
  assert.equal(out.family.family_plan[0].title, 'College');
  assert.equal(c.expert_requests[0].concern, 'Sleep');
  assert.deepEqual(c.programmes, [{ id: 'pe1', programme_id: 'potty-training', status: 'completed', started_on: '2026-10-01', progress: { 1: '2026-10-01' }, baseline: 4, final: 2, created_at: '2026-10-01', updated_at: '2026-10-08' }]);
});

test('a link outage keeps the export with a plain note; a table outage fails the whole export', async () => {
  const out = await collectFamilyExport(database().db, async () => { throw new Error('storage down'); }, { id: me });
  const photo = out.children[0].photo_timeline[0].photo;
  assert(photo && photo.url === null && 'note' in photo && /photo timeline/.test(photo.note));
  await assert.rejects(collectFamilyExport(database('memories').db, async () => new Map(), { id: me }), ExportUnavailable);
});
