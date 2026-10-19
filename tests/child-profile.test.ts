import test from 'node:test';
import assert from 'node:assert/strict';
import { pubertyGuideForChild, profileGenderUpdate } from '../src/lib/child-profile';
import { childFromRow, type ChildRow } from '../src/lib/mappers';
import { guidesForProfile, guideBand } from '../src/data/parent-guides';

test('Boy/Girl in the profile automatically selects only the matching puberty content', () => {
  for (const [gender, path] of [['girl','girls'], ['boy','boys']] as const) {
    const selected = pubertyGuideForChild({ gender, pubertyGuide: gender === 'girl' ? 'boys' : 'girls' });
    assert.equal(selected, path);
    const guides = guidesForProfile('puberty', guideBand(133), selected);
    assert(guides.length > 0);
    assert(guides.every(g => g.path === path || g.path === 'all'));
  }
});

test('legacy guide choices keep working without becoming a Boy/Girl identity', () => {
  const row: ChildRow = { id:'sample', name:'Sample', dob:'2015-01-01', due_date:null,
    curiosity:3, persistence:3, sensitivity:3, sociability:3, emotional_intensity:3, flexibility:3, puberty_guide:'girls' };
  const legacy = childFromRow(row);
  assert.equal(legacy.gender, null);
  assert.equal(pubertyGuideForChild(legacy), 'girls');
  assert.equal(childFromRow({ ...row, gender:'boy' }).gender, 'boy');
  assert.equal(pubertyGuideForChild(childFromRow({ ...row, gender:'boy' })), 'boys');
  assert.equal(pubertyGuideForChild(undefined), null);
  assert.equal(pubertyGuideForChild({ gender:null, pubertyGuide:null }), null);
});

test('unrelated profile edits retain old choices; explicit changes or clearing update the compatibility field', () => {
  assert.deepEqual(profileGenderUpdate(undefined), {});
  assert.deepEqual(profileGenderUpdate('girl'), { gender:'girl', puberty_guide:'girls' });
  assert.deepEqual(profileGenderUpdate('boy'), { gender:'boy', puberty_guide:'boys' });
  assert.deepEqual(profileGenderUpdate(null), { gender:null, puberty_guide:null });
});
