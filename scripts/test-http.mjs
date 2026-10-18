import assert from 'node:assert/strict';

// Run against a locally started build. No sign-in, generation or provider writes.
const base = process.env.TEST_APP_URL || 'http://127.0.0.1:3010';
if (!['localhost','127.0.0.1','[::1]'].includes(new URL(base).hostname)) throw new Error('HTTP smoke tests require a local app.');
const checks = [
  ['/api/profile-notebook','GET',null,401],
  ['/api/profile-notebook','PUT',base,401],
  ['/api/profile-notebook','PUT','https://foreign.invalid',403],
  ['/api/admin/providers','GET',null,401],
  ['/api/cron/delivery','GET',null,401],
  ['/api/email/webhook','POST',null,503],
  ['/api/whatsapp/webhook','POST',null,503],
  ['/api/whatsapp/status?job=SM11111111111111111111111111111111','POST',null,403],
  ['/articles','GET',null,200],
  ['/articles/babys-first-shoes','GET',null,200],
  ['/articles/not-a-real-guide','GET',null,404],
  ['/admin/launch','GET',null,307],
  ['/api/availability','GET',null,200],
  ['/api/care','GET',null,401],
  ['/api/care','POST',base,401],
  ['/api/care','PATCH','https://foreign.invalid',403],
  ['/api/admin/consultations/a0000000-0000-4000-8000-000000000001/contact','POST',base,401],
  ['/api/admin/consultations/a0000000-0000-4000-8000-000000000001/contact','POST','https://foreign.invalid',403],
  ['/api/admin/consultations/a0000000-0000-4000-8000-000000000001/delivery','POST',base,401],
  ['/api/admin/consultations/a0000000-0000-4000-8000-000000000001/delivery','POST','https://foreign.invalid',403],
  ['/api/memories','GET',null,401],
  ['/api/memories','POST',base,401],
  ['/api/memories','PATCH','https://foreign.invalid',403],
  ['/api/memories/a0000000-0000-4000-8000-000000000001','PATCH',base,401],
  ['/help-now','GET',null,200],
  ['/api/stories','POST',base,401],
  ['/api/report','POST',base,401],
  ['/api/share','POST',base,401],
  ['/admin','GET',null,307],
  ['/app/privacy','GET',null,307],
  ['/api/admin/staff','GET',null,401],
  ['/api/admin/audit','GET',null,401],
  ['/admin/experts','GET',null,307],
  ['/admin/consultations','GET',null,307],
  ['/admin/team','GET',null,307],
  ['/auth/password','GET',null,307],
  ['/api/admin/experts','GET',null,401],
  ['/api/admin/overview','GET',null,401],
  ['/api/admin/consultations','GET',null,401],
  ['/api/admin/consultations/a0000000-0000-4000-8000-000000000001','GET',null,401],
  ['/api/admin/experts','POST','https://foreign.invalid',403],
  ['/api/admin/consultations/a0000000-0000-4000-8000-000000000001','PATCH','https://foreign.invalid',403],
  ['/api/expert','GET',null,401],
  ['/api/admin/staff','POST','https://foreign.invalid',403],
  ['/api/account/delete','POST','https://foreign.invalid',403],
  ['/api/consent','POST',base,401],
  ['/api/analyze','POST',base,401],
  ['/api/expert','POST',base,401],
];
for (const [path, method, origin, expected] of checks) {
  const response = await fetch(base + path, { method, redirect: 'manual', headers: origin ? { origin } : {} });
  assert.equal(response.status, expected, `${method} ${path}`);
  assert.equal(response.headers.get('x-content-type-options'),'nosniff');
  assert.equal(response.headers.get('x-frame-options'),'DENY');
  if (expected === 307) assert.equal(new URL(response.headers.get('location'),base).pathname,'/login');
  console.log(`PASS ${method} ${path}: ${response.status}`);
}
