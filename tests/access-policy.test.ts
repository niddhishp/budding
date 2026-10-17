import test from 'node:test';
import assert from 'node:assert/strict';
import { hasCurrentConsent, parseAdminSession, canManageStaff, isSameOrigin, ADMIN_ROLES } from '../src/lib/access-policy';
import { POLICY_VERSION } from '../src/lib/consent';

test('missing, stale and malformed consent cannot authorize processing', () => {
  for (const value of [null, undefined, '', '2020-01-01', { version: POLICY_VERSION }, true]) assert.equal(hasCurrentConsent(value), false);
  assert.equal(hasCurrentConsent(POLICY_VERSION), true);
});

test('only a recognized owner with MFA can manage staff', () => {
  for (const role of ADMIN_ROLES) {
    assert.equal(canManageStaff(parseAdminSession({ role, aal: 'aal1' })), false);
    assert.equal(canManageStaff(parseAdminSession({ role, aal: 'aal2' })), role === 'owner');
  }
  for (const value of [null, {}, { role: 'superadmin', aal: 'aal2' }, { role: 'owner', aal: 'aal3' }, { user_metadata: { role: 'owner' } }]) {
    assert.equal(parseAdminSession(value), null);
    assert.equal(canManageStaff(parseAdminSession(value)), false);
  }
});

test('cookie-authenticated writes reject missing and foreign origins', () => {
  const url = 'https://www.kahiye.app/api/admin/staff';
  for (const origin of [null, 'https://evil.test', 'https://www.kahiye.app.evil.test', 'http://www.kahiye.app']) {
    assert.equal(isSameOrigin(new Request(url, { headers: origin ? { origin } : {} })), false);
  }
  assert.equal(isSameOrigin(new Request(url, { headers: { origin: 'https://www.kahiye.app' } })), true);
  assert.equal(isSameOrigin(new Request('http://localhost:3000/api/consent', { headers: { origin: 'http://localhost:3000' } })), true);
  assert.equal(isSameOrigin(new Request('http://localhost:3000/api/consent', { headers: { origin: 'http://127.0.0.1:3000', host: '127.0.0.1:3000' } })), true);
  assert.equal(isSameOrigin(new Request(url, { headers: { origin: 'https://evil.test', host: 'www.kahiye.app', 'x-forwarded-host': 'evil.test' } })), false);
});
