import test from 'node:test';
import assert from 'node:assert/strict';
import { childFromRow } from '../src/lib/mappers';
import { decodeAnswers, parseSavedMoments, INTAKE_BANDS } from '../src/lib/temperament';
import { decodeMomentShare, encodeMomentShare, mergeIntake, describePatterns, momentsFor, observedPatterns } from '../src/lib/moments';

const prior = () => ({ ...childFromRow({ id: 'test', name: 'Mira', dob: '2020-01-01', due_date: null, sensitivity: 20, emotional_intensity: 80, flexibility: 20, persistence: 80, sociability: 50, curiosity: 80, intake_band: 'middle', focus_areas: ['Screens'], household: ['Grandparents help often'], profile_notes: 'A new school.' }), age: { years: 8, months: 0, days: 0, stage: 'middle-childhood' as const, label: '8 years' } });

test('minimal profiles have no invented average observations', () => {
  const intake = mergeIntake(undefined, {}, 'middle');
  assert.deepEqual(intake.intakeAnswered, []);
  const child = { ...prior(), ...intake };
  assert.deepEqual(observedPatterns(child), []);
  assert.match(describePatterns(child), /Do not infer/);
  assert.doesNotMatch(describePatterns(child), /moderate|50/);
});
test('skipping a retake preserves every saved numerical answer and legacy marker', () => {
  const child = prior();
  const changed = mergeIntake(child, {}, 'teen');
  assert.deepEqual(changed.temperament, child.temperament);
  assert.equal(changed.intakeBand, 'middle');
  assert.equal(changed.intakeAnswered, null);
});
test('partial edits only replace chosen values; new age observations exclude old claims', () => {
  const child = prior();
  const same = mergeIntake(child, { flexibility: 80 }, 'middle');
  assert.equal(same.temperament.flexibility, 80);
  assert.equal(same.temperament.sensitivity, 20);
  assert.equal(same.intakeAnswered?.length, 6);
  const next = mergeIntake(child, { flexibility: 80 }, 'teen');
  assert.deepEqual(next.intakeAnswered, ['flexibility']);
  assert.equal(next.temperament.sensitivity, 20);
  assert.deepEqual(observedPatterns({ ...child, intakeBand: 'toddler' }), []);
});
test('all five age bands have four scenes and shareable skips; old links still decode', () => {
  for (const { id } of INTAKE_BANDS) {
    const scenes = momentsFor(id);
    assert.equal(scenes.length, 4);
    assert.equal(new Set(scenes.map(m => m.key)).size, 4);
    assert.ok(scenes.every(m => m.options.length === 3 && m.ideas.length === 3));
    const code = encodeMomentShare(id, { flexibility: 20, sociability: 80 });
    assert.deepEqual(decodeMomentShare(code), { band: id, answers: { flexibility: 20, sociability: 80 } });
    assert.deepEqual(decodeMomentShare(encodeMomentShare(id, {}))?.answers, {});
  }
  assert.ok(decodeAnswers('012012'));
  assert.equal(decodeMomentShare('v2.middle.01201evil'), null);
});
test('local handoff rejects malformed and expired choices but accepts valid legacy data', () => {
  const raw = { name: ' Ira ', band: 'preschool', answers: { persistence: 80 } };
  assert.equal(parseSavedMoments(JSON.stringify(raw))?.name, 'Ira');
  assert.ok(parseSavedMoments(JSON.stringify({ ...raw, version: 2, updatedAt: 1000 }), 1001));
  for (const value of [null, '{', JSON.stringify({ ...raw, answers: { constructor: 20 } }), JSON.stringify({ ...raw, answers: { persistence: '80' } }), JSON.stringify({ ...raw, band: 'adult' }), JSON.stringify({ ...raw, version: 2, updatedAt: 0 })]) {
    assert.equal(parseSavedMoments(value, 8 * 86400000), null);
  }
});
