import { NextResponse } from 'next/server';

export function adminJson(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: { 'Cache-Control': 'private, no-store' } });
}
const expectedErrors = new Set([
  'This expert is not accepting new requests.', 'This expert has reached their open request limit.', 'This expert has reached their daily session limit.', 'Choose a future follow-up time.', 'Closed requests cannot receive new contact attempts.', 'This contact receipt has already been used.',
  'This expert changed. Reload before saving.', 'This request changed. Reload before saving.',
  'Link an active therapist team member with a verified email first.', 'Record how credentials were checked.',
  'Parent consent is withdrawn. Only cancellation is available.', 'That status transition is not available.',
  'Closed requests keep their assignment and schedule.', 'Add a short completion or cancellation note.',
  'Expert not found.', 'Choose an active expert with reviewed credentials.', 'Choose an expert and a session time.',
  'Choose a future session time.', 'This expert already has a session at that time.', 'No changes to save.',
]);
export function adminError(error: { code?: string; message: string }) {
  if (error.code === '42501') return adminJson({ error: 'Your access has changed. Verify your session or contact the owner.' }, 403);
  if (error.code === 'P0002') return adminJson({ error: 'This record is no longer available.' }, 404);
  if (error.code === '23505') return adminJson({ error: 'That therapist account is already linked to another expert.' }, 409);
  if (expectedErrors.has(error.message)) return adminJson({ error: error.message }, 409);
  console.error('[admin operations]', error.code);
  return adminJson({ error: 'Could not complete this action. Please retry.' }, 503);
}
