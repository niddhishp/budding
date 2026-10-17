import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authErrorMessage, newPasswordError, safeAuthDestination, submitPasswordAuth } from '../src/lib/auth-flow';

test('auth redirects reject external URLs, backslashes, control characters and unsupported routes', () => {
  for (const unsafe of [null, undefined, '', 'https://evil.invalid', '//evil.invalid', '/\\evil.invalid', '/admin/../../evil', '/admin\n', '/admin/%2f%2fevil.invalid', '/api/account/delete', '/login']) assert.equal(safeAuthDestination(unsafe), '/app');
  for (const safe of ['/admin', '/admin/experts', '/app/privacy', '/auth/password?next=%2Fadmin', '/admin/consultations/a0000000-0000-4000-8000-000000000001']) assert.equal(safeAuthDestination(safe), safe);
});
test('new password validation supports passphrases without silent trimming or truncation', () => {
  assert.equal(newPasswordError('  a long passphrase  ', '  a long passphrase  '), '');
  assert.match(newPasswordError('short', 'short'), /12/);
  assert.match(newPasswordError('long-enough-password', 'different-password'), /match/);
  assert.match(newPasswordError('🙂'.repeat(19), '🙂'.repeat(19)), /long/);
});
type Auth = Parameters<typeof submitPasswordAuth>[0];
function mockAuth(result: object) {
  const calls: { method: string; args: unknown[] }[] = [];
  const auth = Object.fromEntries(['signInWithPassword', 'signUp', 'resetPasswordForEmail'].map(method => [method, async (...args: unknown[]) => { calls.push({ method, args }); return result; }])) as unknown as Auth;
  return { auth, calls };
}
const input = { email: ' parent@example.invalid ', password: '  synthetic passphrase  ', origin: 'https://www.kahiye.app', next: '/admin' };
test('routine sign-in uses password only and preserves the admin destination', async () => {
  const { auth, calls } = mockAuth({ data: { session: { user: { id: 'synthetic' } } }, error: null });
  assert.deepEqual(await submitPasswordAuth(auth, { ...input, mode: 'signin' }), { destination: '/admin' });
  assert.deepEqual(calls, [{ method: 'signInWithPassword', args: [{ email: 'parent@example.invalid', password: input.password }] }]);
});
test('login failure never navigates and never falls back to an email link', async () => {
  const { auth, calls } = mockAuth({ data: { session: null }, error: { code: 'invalid_credentials' } });
  await assert.rejects(submitPasswordAuth(auth, { ...input, mode: 'signin' }), /not recognised/);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, 'signInWithPassword');
});
test('reset goes through the PKCE callback to password setup and retains the final destination', async () => {
  const { auth, calls } = mockAuth({ data: {}, error: null });
  assert.deepEqual(await submitPasswordAuth(auth, { ...input, mode: 'reset' }), { notice: 'reset' });
  const [email, options] = calls[0].args as [string, { redirectTo: string }];
  assert.equal(email, 'parent@example.invalid');
  const url = new URL(options.redirectTo);
  assert.equal(url.pathname, '/auth/callback');
  assert.equal(url.searchParams.get('next'), '/auth/password?next=%2Fadmin');
  assert.equal(calls[0].method, 'resetPasswordForEmail');
});
test('signup requires confirmation when the provider does not issue a session', async () => {
  const { auth, calls } = mockAuth({ data: { session: null }, error: null });
  assert.deepEqual(await submitPasswordAuth(auth, { ...input, mode: 'signup' }), { notice: 'confirmation' });
  assert.equal(calls[0].method, 'signUp');
});
test('rate limit and MFA errors remain actionable without exposing raw provider details', () => {
  assert.match(authErrorMessage({ status: 429 }, 'signin'), /wait/);
  assert.match(authErrorMessage({ code: 'insufficient_aal' }, 'update'), /authenticator/);
  assert.match(authErrorMessage({ code: 'reauthentication_needed' }, 'update'), /sign in again/);
});
