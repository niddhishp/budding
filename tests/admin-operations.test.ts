import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expertSchema, consultationSchema, TRANSITIONS, localDateTime } from '../src/lib/admin-operations';

test('expert validation rejects invalid age bands, unsupported fees and unsubstantiated credential review', () => {
  const valid = { name: 'Test Expert', title: 'Psychologist', qualifications: 'Test degree', specialties: 'Parenting', languages: 'English', age_min: 3, age_max: 10, pregnancy_support: false, email: '', phone: '', fee_inr: 1200, session_minutes: 45, active: true, reviewed: false, staff_email: '' };
  assert.equal(expertSchema.safeParse(valid).success, true);
  for (const change of [{ age_max: 2 }, { fee_inr: -1 }, { session_minutes: 0 }, { reviewed: true }, { staff_email: 'not an email' }, { id: 'a0000000-0000-4000-8000-000000000001' }]) assert.equal(expertSchema.safeParse({ ...valid, ...change }).success, false);
});
test('scheduling requires expert and explicit timezone; terminal states do not reopen', () => {
  const payload = { id: 'a0000000-0000-4000-8000-000000000001', version: 1, status: 'scheduled', expert_id: null, scheduled_at: null, note: '' };
  assert.equal(consultationSchema.safeParse(payload).success, false);
  assert.equal(consultationSchema.safeParse({ ...payload, expert_id: payload.id, scheduled_at: '2027-01-01T10:30:00+05:30' }).success, true);
  assert.equal(consultationSchema.safeParse({ ...payload, expert_id: payload.id, scheduled_at: '2027-01-01T10:30' }).success, false);
  assert.deepEqual(TRANSITIONS.completed, ['completed']);
  assert.deepEqual(TRANSITIONS.cancelled, ['cancelled']);
  assert.equal(localDateTime(null), '');
});
