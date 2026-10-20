import test from 'node:test';
import assert from 'node:assert/strict';
import { launchReadiness } from '../../src/lib/launch-readiness';
import { assessDeliveryWorker } from '../../src/lib/delivery-health';

test('missing provider setup stays explicit and credentials never become an approval', () => {
  const reports = launchReadiness({});
  assert.equal(reports.length, 7);
  for (const service of reports) {
    assert.notEqual(service.state, 'configured');
    assert.ok(service.requirements.some(item => !item.met));
    assert.ok(service.verify);
  }
  assert.equal(reports.find(s => s.id === 'billing')?.state, 'closed');
  assert.equal(reports.find(s => s.id === 'email')?.state, 'incomplete');
});

test('billing diagnostics reject test mode and preserve the activation gate', () => {
  const env = { RAZORPAY_KEY_ID: 'rzp_test_synthetic', RAZORPAY_KEY_SECRET: 'private-synthetic-secret', RAZORPAY_PLAN_MONTHLY: 'monthly-private-id', RAZORPAY_PLAN_YEARLY: 'yearly-private-id', RAZORPAY_WEBHOOK_SECRET: 'private-webhook', BILLING_LIVE_ENABLED: 'true' };
  assert.equal(launchReadiness(env)[0].state, 'incomplete');
  env.RAZORPAY_KEY_ID = 'rzp_live_synthetic';
  assert.equal(launchReadiness(env)[0].state, 'configured');
  const output = JSON.stringify(launchReadiness(env));
  for (const value of Object.values(env).filter(value => value !== 'true')) assert.ok(!output.includes(value));
  env.BILLING_LIVE_ENABLED = 'false';
  assert.equal(launchReadiness(env)[0].state, 'closed');
});

test('email sending configuration alone is insufficient for receipt and recovery readiness', () => {
  const env: Record<string, string> = { RESEND_API_KEY: 'private', RESEND_FROM: 'sender@example.invalid', EXPERT_NOTIFY_EMAIL: 'team@example.invalid' };
  const report = () => launchReadiness(env).find(s => s.id === 'email')!;
  assert.equal(report().state, 'incomplete');
  assert.deepEqual(report().requirements.filter(r => !r.met).map(r => r.label), ['RESEND_WEBHOOK_SECRET', 'CRON_SECRET (at least 32 characters)']);
  env.RESEND_WEBHOOK_SECRET = 'private';
  env.CRON_SECRET = 'x'.repeat(32);
  assert.equal(report().state, 'configured');
  assert.ok(!JSON.stringify(report()).includes('team@example.invalid'));
});

test('WhatsApp diagnostics expose a mismatched sender without exposing either number', () => {
  const env = { TWILIO_ACCOUNT_SID: 'private-account', TWILIO_AUTH_TOKEN: 'private-token', TWILIO_WHATSAPP_FROM: 'whatsapp:+19999999991', NEXT_PUBLIC_WHATSAPP_NUMBER: '+19999999992', WHATSAPP_ENABLED: 'true', CRON_SECRET: 'x'.repeat(32) };
  const report = () => launchReadiness(env).find(s => s.id === 'whatsapp')!;
  assert.equal(report().state, 'incomplete');
  assert.ok(!JSON.stringify(report()).includes('+19999999991'));
  env.NEXT_PUBLIC_WHATSAPP_NUMBER = '+19999999991';
  assert.equal(report().state, 'configured');
  env.CRON_SECRET = 'short';
  assert.equal(report().state, 'incomplete');
});

test('Amazon API, referrals and automatic discovery remain separate gates', () => {
  const env: Record<string, string> = { AMAZON_CREATORS_CLIENT_ID: 'private-client', AMAZON_CREATORS_CLIENT_SECRET: 'private-secret', AMAZON_ASSOCIATE_TAG: 'sample-21', AMAZON_CREATORS_VERSION: '3.2' };
  const report = (id: string) => launchReadiness(env).find(s => s.id === id)!;
  assert.equal(report('amazon').state, 'configured');
  assert.equal(report('amazon-links').state, 'closed');
  assert.equal(report('discovery').state, 'closed');
  assert.equal(report('finance').state, 'closed');
  env.AMAZON_CREATORS_VERSION = 'invalid';
  assert.equal(report('amazon').state, 'incomplete');
  env.AMAZON_CREATORS_VERSION = '3.2';
  env.AMAZON_DISCOVERY_ENABLED = 'true';
  assert.equal(report('discovery').state, 'incomplete');
  env.CRON_SECRET = 'x'.repeat(32);
  assert.equal(report('discovery').state, 'configured');
});

test('worker freshness cannot be mistaken for delivery success or clinical approval', () => {
  const now = Date.parse('2026-10-20T12:00:00Z');
  const heartbeat = { last_finished_at: new Date(now - 60_000).toISOString(), last_error: null };
  assert.equal(assessDeliveryWorker(null, now).state, 'unknown');
  assert.equal(assessDeliveryWorker({ ...heartbeat, last_finished_at: null }, now).state, 'unknown');
  assert.equal(assessDeliveryWorker(heartbeat, now).state, 'recent');
  assert.match(assessDeliveryWorker(heartbeat, now).message, /does not confirm/);
  assert.equal(assessDeliveryWorker({ ...heartbeat, last_error: 'private-provider-error' }, now).state, 'attention');
  assert.ok(!assessDeliveryWorker({ ...heartbeat, last_error: 'private-provider-error' }, now).message.includes('private-provider-error'));
  for (const value of ['invalid', new Date(now + 120_000).toISOString()]) {
    assert.equal(assessDeliveryWorker({ ...heartbeat, last_finished_at: value }, now).state, 'unknown');
  }
  assert.equal(assessDeliveryWorker({ ...heartbeat, last_finished_at: new Date(now - 300_001).toISOString() }, now).state, 'attention');
});
