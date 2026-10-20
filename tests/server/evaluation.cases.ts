import test from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { evaluateTurn } from '../../scripts/eval/pipeline';
import { OpenRouterEval } from '../../scripts/eval/openrouter';
import type { DecodeContext } from '../../src/lib/ai/decode';
import type { structuredCall } from '../../src/lib/ai/llm';
import { safetyNotice, bypassesPaywall } from '../../src/lib/ai/safety';

const context = { child: { name: 'Synthetic', age: { years: 11, months: 0, stage: 'middle-childhood' }, household: [], homeLanguages: [] }, recentLogs: [], pastDecodes: [], memories: [] } as unknown as DecodeContext;

test('non-urgent medical classification offers professional advice, never automatic ambulance advice, and remains free', async () => {
  for (const level of ['none', 'low', 'elevated'] as const) {
    const safety = { level, category: 'medical' as const, reason: 'Synthetic medication question' };
    const notice = safetyNotice(safety)!;
    assert.equal(notice.tier, 2);
    assert(!notice.steps.join(' ').includes('ambulance right away'));
    assert(notice.steps.some(step => step.includes('Do not start, stop or change')));
    assert.equal(bypassesPaywall(safety), true);
  }
  assert.equal(safetyNotice({ level: 'urgent', category: 'medical', reason: 'Immediate danger' })!.tier, 3);
  let calls = 0;
  const call = (async () => { calls++; return { level: 'low', category: 'medical', reason: 'Synthetic medication question' }; }) as typeof structuredCall;
  const result = await evaluateTurn('Can I change his prescribed dose?', context, 'talk', {}, call);
  assert.equal(result.path, 'support');
  assert.equal(result.analysis, undefined);
  assert.equal(calls, 1);
});

test('evaluation stops before routing or generation on emergency, elevated risk and unavailable triage', async () => {
  const never = (async () => { throw Error('Provider must not run'); }) as typeof structuredCall;
  const emergency = await evaluateTurn('She wants to die', context, 'talk', {}, never);
  assert.equal(emergency.path, 'support');
  assert.equal(emergency.analysis, undefined);
  for (const fails of [false, true]) {
    const calls: string[] = [];
    const call = (async (opts: { schema: { properties?: Record<string, unknown> } }) => {
      calls.push('level' in (opts.schema.properties ?? {}) ? 'safety' : 'modules' in (opts.schema.properties ?? {}) ? 'router' : 'generation');
      if (fails) throw Error('offline'); return { level: 'elevated', category: 'wellbeing_concern', reason: 'fixture' };
    }) as typeof structuredCall;
    const result = await evaluateTurn('Something feels wrong lately', context, 'guidance', {}, call);
    assert.equal(result.path, fails ? 'unavailable' : 'support');
    assert.equal(result.analysis, undefined);
    // Routing runs alongside triage (as in the live route) and is discarded; no advice is generated.
    assert.deepEqual(calls.sort(), ['router', 'safety']);
  }
});

test('evaluation triages earlier parent risk and does not treat fictional assistant words as parent disclosures', async () => {
  const never = (async () => { throw Error('Provider must not run'); }) as typeof structuredCall;
  const prior = { id: 'test', scenario: 'She wants to die', sayThis: 'Stay nearby', outcome: null, createdAt: '2026-10-20' };
  assert.equal((await evaluateTurn('She is quiet now', { ...context, continuation: [prior] }, 'talk', {}, never)).path, 'support');
  const call = (async (opts: { user: string }) => {
    assert(!opts.user.includes('wants to die'));
    return { level: 'none', category: 'none', reason: 'fixture' };
  }) as typeof structuredCall;
  assert.equal((await evaluateTurn('Hello', { ...context, continuation: [{ ...prior, scenario: 'Hello earlier', sayThis: 'Fictional: she wants to die' }] }, 'talk', { safetyOnly: true }, call)).path, 'ordinary');
});

const opts = { model: 'claude-haiku-4-5', system: 'synthetic', user: 'hello', maxTokens: 10, schema: { type: 'object' }, validator: z.object({ ok: z.boolean() }) };
const prices = new Map([['anthropic/claude-haiku-4.5', { prompt: 0.000001, completion: 0.000005 }]]);
test('OpenRouter transport validates outputs, protects routing, meters usage and enforces request bounds', async () => {
  let requests = 0;
  const request = (async (_url, init) => {
    requests++;
    const body = JSON.parse(init!.body as string);
    assert.equal(body.provider.data_collection, 'deny');
    assert.equal(body.provider.require_parameters, true);
    assert.equal(body.provider.allow_fallbacks, false);
    assert.equal(body.reasoning, undefined);
    return Response.json({ choices: [{ finish_reason: 'stop', message: { content: '{"ok":true}' } }], usage: { prompt_tokens: 10, completion_tokens: 5, cost: 0.001 } });
  }) as typeof fetch;
  const transport = new OpenRouterEval('fake-test-key', prices, 1, 1, request);
  assert.deepEqual(await transport.call(opts), { ok: true });
  assert.equal(transport.calls[0].costUsd, 0.001);
  await assert.rejects(transport.call(opts), /limit reached/);
  assert.equal(requests, 1);
  const bounded = new OpenRouterEval('fake-test-key', prices, 0.000001, 1, request);
  await assert.rejects(bounded.call(opts), /limit reached/);
  assert.equal(requests, 1);
});

test('OpenRouter refuses truncated, refused, malformed and invalid output without exposing provider response bodies', async () => {
  for (const payload of [
    { choices: [{ finish_reason: 'length', message: { content: '{"ok":true}' } }] },
    { choices: [{ finish_reason: 'content_filter', message: { content: '{"ok":true}' } }] },
    { choices: [{ message: { content: 'invalid JSON' } }] },
    { choices: [{ message: { content: '{"ok":"wrong"}' } }] },
  ]) {
    const transport = new OpenRouterEval('fake-test-key', prices, 1, 1, (async () => Response.json(payload)) as typeof fetch);
    await assert.rejects(transport.call(opts));
    assert.notEqual(transport.calls[0].outcome, 'validated');
  }
  const failed = new OpenRouterEval('fake-test-key', prices, 1, 1, (async () => new Response('private provider body', { status: 401 })) as typeof fetch);
  await assert.rejects(failed.call(opts), { message: 'OpenRouter request failed (401).' });
});
