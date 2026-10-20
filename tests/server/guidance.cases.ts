import test from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { classifySafety, guidancePath, bypassesPaywall } from '../../src/lib/ai/safety';
import { lintAnalysis, repairAnalysis } from '../../src/lib/ai/critic';
import { checkedCall } from '../../src/lib/ai/checked-content';
import { DecodeError, type structuredCall, type StructuredOpts } from '../../src/lib/ai/llm';
import { CONSTITUTION } from '../../src/lib/ai/doctrine/constitution';

const fake = (fn: (opts: StructuredOpts<unknown>) => Promise<unknown>) => fn as typeof structuredCall;
const validator = z.object({ sayThis: z.string() });
const options = { system: 'Parenting content', user: 'Synthetic everyday moment', schema: { type: 'object' }, validator, maxTokens: 100 };

test('checked calls include the shared constitution exactly once', async () => {
  let calls = 0;
  await checkedCall({ ...options, system: CONSTITUTION }, fake(async opts => {
    assert.equal(opts.system.split(CONSTITUTION).length - 1, 1);
    return ++calls === 1 ? { sayThis: 'We can try a smaller step.' } : { approved: true };
  }));
});
test('Indic emergency phrases take the model-free safety path', async () => {
  let calls = 0;
  const unavailable = fake(async () => { calls++; throw Error('No provider'); });
  for (const message of ['बच्चा सांस नहीं ले रहा', 'குழந்தைக்கு மூச்சு வரவில்லை', 'കുട്ടി ശ്വാസം എടുക്കുന്നില്ല', 'ആത്മഹത്യ', 'தற்கொலை', 'यौन शोषण'])
    assert.equal(guidancePath(await classifySafety(message, undefined, unavailable)), 'support');
  assert.equal(calls, 0);
});

test('urgent patterns do not wait for the classifier; outage never becomes ordinary', async () => {
  let calls = 0;
  const unavailable = fake(async () => { calls++; throw new Error('Provider unavailable'); });
  assert.equal(guidancePath(await classifySafety('My child is not breathing', undefined, unavailable)), 'support');
  assert.equal(calls, 0);
  const result = await classifySafety('Bedtime is hard', undefined, unavailable);
  assert.equal(guidancePath(result), 'unavailable');
  assert.equal(bypassesPaywall(result), true);
  assert.equal(calls, 1);
  assert.equal(guidancePath({ level: 'low', category: 'medical', reason: '' }), 'support');
  assert.equal(guidancePath({ level: 'none', category: 'none', reason: '' }), 'ordinary');
});

test('nested generated fields cannot escape deterministic checks', () => {
  const found = lintAnalysis({ patterns: [{ details: ['He has ADHD'] }], sayThis: 'You are a bad boy' });
  assert.equal(found.length, 2);
  assert.equal(found[0].field, 'patterns[0].details[0]');
});

test('failed repair and still-unsafe repair never return the original', async () => {
  const unsafe = { sayThis: 'You are a bad boy' };
  for (const repair of [fake(async () => unsafe), fake(async () => { throw new Error('Network failure'); })]) {
    await assert.rejects(repairAnalysis(unsafe, lintAnalysis(unsafe), {}, validator, undefined, repair), e => e instanceof DecodeError && e.code === 'unsafe');
  }
});

test('a result remains unavailable until independent output review completes', async () => {
  let release!: (value: unknown) => void;
  let reviewStarted!: () => void;
  const started = new Promise<void>(resolve => { reviewStarted = resolve; });
  const review = new Promise(resolve => { release = resolve; });
  let calls = 0; let exposed = false;
  const call = fake(async opts => {
    assert.ok(opts.system.toLowerCase().includes('constitution'));
    if (++calls === 1) return { sayThis: 'I am here with you.' };
    reviewStarted(); return review;
  });
  const pending = checkedCall(options, call).then(result => { exposed = true; return result; });
  await started;
  assert.equal(exposed, false);
  release({ approved: true });
  assert.equal((await pending).sayThis, 'I am here with you.');
  assert.equal(calls, 2);
});

test('review rejection, review outage and generation failure withhold all output', async () => {
  for (const mode of ['reject', 'review-outage', 'generation-outage']) {
    let calls = 0;
    await assert.rejects(checkedCall(options, fake(async () => {
      calls++;
      if (mode === 'generation-outage' || (calls === 2 && mode === 'review-outage')) throw new Error('Unavailable');
      return calls === 1 ? { sayThis: 'A calm synthetic suggestion.' } : { approved: false };
    })));
    assert.equal(calls, mode === 'generation-outage' ? 1 : 2);
  }
});

test('a repaired result is rechecked and all stages receive the cancellation signal', async () => {
  const controller = new AbortController(); let calls = 0;
  const result = await checkedCall({ ...options, signal: controller.signal }, fake(async opts => {
    assert.equal(opts.signal, controller.signal);
    return ++calls === 1 ? { sayThis: 'You are a bad boy' } : calls === 2 ? { sayThis: 'I see you are upset.' } : { approved: true };
  }));
  assert.equal(calls, 3);
  assert.equal(result.sayThis, 'I see you are upset.');
});
