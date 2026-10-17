import test from 'node:test';
import assert from 'node:assert/strict';
import { RequestScope } from '../src/lib/request-scope';

test('switching children cancels old work without cancelling the next child', async () => {
  const scope = new RequestScope();
  const old = scope.start();
  scope.cancel();
  const next = scope.start();
  assert.equal(old.active(), false);
  assert.equal(next.active(), true);
  old.finish();
  assert.equal(next.active(), true);
  next.finish();
});

test('abandoned requests reach a deadline and release their timer', async () => {
  const scope = new RequestScope();
  const request = scope.start(10);
  await new Promise(resolve => request.signal.addEventListener('abort', resolve, { once: true }));
  assert.equal(request.active(), false);
  request.finish();
});
