import test from 'node:test';
import assert from 'node:assert/strict';
import { dailyInterest, dailyHealth } from '../src/lib/daily-family';
import { emptyInterests, type HealthEntry } from '../src/lib/profile-notebook';
import { growingBand, growingBands, observationKey } from '../src/data/growing-changes';
import { discoverTools } from '../src/lib/discover-tools';
import { careSchema } from '../src/lib/family-care';

test('conversation prompts cover every month from age three and select the current age', () => {
  assert.equal(growingBand(null), null);
  assert.equal(growingBand('2023-11-18', '2026-10-18'), null);
  assert.equal(growingBand('2023-10-18', '2026-10-18')?.id, '3-5');
  assert.equal(growingBand('2021-10-18', '2026-10-18')?.id, '3-5');
  assert.equal(growingBand('2021-09-18', '2026-10-18')?.id, '5-8');
  assert.equal(growingBand('2015-09-18', '2026-10-18')?.id, '9-11');
  assert.equal(growingBand('2014-10-18', '2026-10-18')?.id, '12-14');
  assert.equal(growingBand('2011-10-18', '2026-10-18')?.id, '15-plus');
  for (let months = 36; months <= 240; months++) {
    assert.equal(growingBands.filter(b => months >= b.min && months <= b.max).length, 1);
  }
});

test('new observations preserve earlier records and fit the existing validated persistence format', () => {
  const observations: Record<string, 'noticed'> = { '60-0': 'noticed' };
  for (const b of growingBands) for (const [id] of b.prompts) observations[observationKey(b.id, id)] = 'noticed';
  const parsed = careSchema.parse({ observations, pregnancyNotes: 'Keep my older notes' });
  assert.equal(parsed.observations['60-0'], 'noticed');
  assert.equal(parsed.pregnancyNotes, 'Keep my older notes');
  assert.equal(Object.keys(parsed.observations).length, 22);
});

test('Discover includes pregnancy only for an expecting profile, while promoted tools live in main navigation', () => {
  assert(!discoverTools(false).some(t => t.page === 'pregnancy'));
  for (const page of ['parent-space', 'safety', 'gifts', 'play', 'puberty']) {
    assert(!discoverTools(false).some(t => t.page === page));
    assert(!discoverTools(true).some(t => t.page === page));
  }
  assert(discoverTools(true).some(t => t.page === 'pregnancy'));
  assert(!discoverTools(true).some(t => t.page === 'growth' || t.page === 'milestones'));
});

test('daily interests are stable, rotate all selected interests and variations, and remain age-appropriate', () => {
  const book = { ...emptyInterests, selected: ['music', 'art'] as const };
  const selected = { ...book, selected: [...book.selected] };
  const first = dailyInterest('2015-09-01', selected, '2026-10-18');
  assert.deepEqual(first, dailyInterest('2015-09-01', { ...selected, selected: ['art', 'music'] }, '2026-10-18'));
  assert.equal(first?.band, 'school');
  const activities = Array.from({ length: 6 }, (_, i) => dailyInterest('2015-09-01', selected, '2026-10-18', i)!);
  assert.equal(new Set(activities.map(a => a.text)).size, 6);
  assert.equal(new Set(activities.map(a => a.area)).size, 2);
  assert.notEqual(first?.id, dailyInterest('2015-09-01', selected, '2026-10-19')?.id);
  assert.equal(dailyInterest('2025-01-01', selected, '2026-10-18')?.band, 'baby');
  assert.equal(dailyInterest('2014-10-18', selected, '2026-10-18')?.band, 'teen');
  assert.equal(dailyInterest(null, selected), null);
  assert.equal(dailyInterest('2027-01-01', selected, '2026-10-18'), null);
  assert.equal(dailyInterest('2015-01-01', emptyInterests), null);
});

test('health reminders use recorded dates, exclude unknown/future/archived care and never invent a schedule', () => {
  const base: HealthEntry = { id: 'one', title: 'Recorded appointment', kind: 'checkup', status: 'planned', date: '2026-10-18', nextDate: null, instructions: '', note: '', referenceId: null, archived: false };
  const entries: HealthEntry[] = [
    base,
    { ...base, id: 'tomorrow', date: '2026-10-19' },
    { ...base, id: 'seven', date: '2026-10-25' },
    { ...base, id: 'eight', date: '2026-10-26' },
    { ...base, id: 'past', date: '2026-10-17' },
    { ...base, id: 'unknown', date: null },
    { ...base, id: 'done', status: 'done' },
    { ...base, id: 'review', status: 'done', nextDate: '2026-10-20' },
    { ...base, id: 'archived', archived: true },
    { ...base, id: 'na', status: 'not_applicable' },
    { ...base, id: 'med', kind: 'medication', status: 'ongoing', instructions: 'Exact recorded instruction', note: 'Parent note' },
    { ...base, id: 'futureMed', kind: 'medication', status: 'ongoing', date: '2026-10-22' },
  ];
  const output = dailyHealth(entries, '2026-10-18');
  assert.deepEqual(output.reminders.map(e => e.id), ['past', 'one', 'tomorrow', 'review', 'seven']);
  assert.equal(output.reminders[0].label, 'Planned date passed');
  assert.equal(output.reminders[1].label, 'Planned for today');
  assert.equal(output.reminders[2].label, 'Tomorrow');
  assert.deepEqual(output.ongoing.map(e => e.id), ['med']);
  assert.equal(output.ongoing[0].instructions, 'Exact recorded instruction');
  assert.equal(output.ongoing[0].note, 'Parent note');
  assert.equal(entries[0].status, 'planned');
});
