import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeStaged, type DecodeContext } from '../../src/lib/ai/decode';
import { classifySafety, guidancePath, safetyUserTurn } from '../../src/lib/ai/safety';
import { lintAnalysis } from '../../src/lib/ai/critic';
import { STAGES, stageBandFor } from '../../src/lib/ai/doctrine/stages';
import { DecodeError, type structuredCall, type StructuredOpts } from '../../src/lib/ai/llm';
import { evaluateTurn } from '../../scripts/eval/pipeline';
import { fallbackCard, FALLBACK_MESSAGE } from '../../src/lib/ask-fallback';
import { cardsForChild } from '../../src/lib/handbook';
import { computeAge } from '../../src/lib/age';
import { CLARIFY_WINDOW_MS } from '../../src/lib/plans';
import type { Route } from '../../src/lib/ai/router';
import type { Child } from '../../src/types';

const fake = (fn: (opts: StructuredOpts<unknown>) => Promise<unknown>) => fn as typeof structuredCall;
const kind = (opts: StructuredOpts<unknown>) => {
  const props = (opts.schema as { properties?: Record<string, unknown> }).properties ?? {};
  if ('level' in props) return 'safety';
  if ('modules' in props) return 'router';
  if ('approved' in props) return 'review';
  if (opts.system.includes('quality critic')) return 'repair';
  if ('rightNow' in props) return 'first';
  if ('hypotheses' in props) return 'detail';
  return 'other';
};

function child(years: number, months = 0): Child {
  const d = new Date();
  d.setMonth(d.getMonth() - (years * 12 + months));
  d.setDate(d.getDate() - 3);
  const dob = d.toISOString().slice(0, 10);
  return {
    id: '00000000-0000-4000-8000-000000000001', name: 'Synthetic', dateOfBirth: dob, dueDate: null, age: computeAge(dob, null),
    temperament: { curiosity: 50, persistence: 50, sensitivity: 50, sociability: 50, emotionalIntensity: 50, flexibility: 50 },
    focusAreas: [], household: [], homeLanguages: [], profileNotes: null, intakeBand: null,
  } as Child;
}
const context = (c = child(7, 2)): DecodeContext => ({ child: c, recentLogs: [], pastDecodes: [], memories: [] });
const route: Route = { modules: ['emotions'], mode: 'right_now', goal: 'calm_now', clarify: null, source: 'fallback' };
const FIRST = { rightNow: 'Kneel down beside her.', sayThis: 'You are upset. I am here.', doThis: ['Breathe slowly together.', 'Offer water.'], avoid: 'Lecturing mid-meltdown, because she cannot hear it yet.', seekHelpIf: '' };
const DETAIL = {
  hypotheses: [{ text: 'She is tired after school.', likelihood: 'most likely' }], emotionalNeed: 'Comfort', afterwards: 'Talk about it at bedtime.',
  watchFor: '', seekHelpIf: '', skillBeingBuilt: 'Calming down', developmentalContext: 'Common at seven.', whyItWorks: 'Calm adults help children calm.', evidenceIds: [],
};

test('stage A is checked before it is shown; stage B gets it as fixed input and the review sees the combined answer', async () => {
  const order: string[] = []; let shown: unknown; let combinedReview: Record<string, unknown> | undefined;
  const result = await decodeStaged('She melts down after school', context(), route, first => { order.push('shown'); shown = first; }, undefined, fake(async opts => {
    const k = kind(opts); order.push(k);
    if (k === 'first') { assert.match(opts.system, /stage="immediate"/); assert(!opts.user.includes('<already_shown>')); return FIRST; }
    if (k === 'detail') {
      assert.match(opts.system, /stage="explanation"/);
      assert(opts.user.includes('<already_shown>') && opts.user.includes(FIRST.sayThis), 'Stage B receives the checked immediate answer');
      return DETAIL;
    }
    if (k === 'review') {
      const proposed = JSON.parse(opts.user).proposed;
      if ('hypotheses' in proposed) combinedReview = proposed;
      return { approved: true };
    }
    throw Error(`Unexpected ${k}`);
  }));
  assert.deepEqual(order, ['first', 'review', 'shown', 'detail', 'review']);
  assert.deepEqual(shown, FIRST);
  assert.equal(combinedReview?.sayThis, FIRST.sayThis, 'The final review sees Stage A and Stage B together');
  assert.equal(result.detailAvailable, true);
  assert.equal(result.analysis.sayThis, FIRST.sayThis);
  assert.equal(result.analysis.interpretation, 'She is tired after school.');
  assert.equal(result.analysis.detailUnavailable, undefined);
  assert(result.timings.firstMs >= 0 && result.timings.detailMs >= 0);
});

test('a stage B outage, rejection or unrepairable output keeps the checked stage A answer, flagged', async () => {
  for (const failure of ['outage', 'reject', 'unrepairable']) {
    let shown = 0; let reviews = 0;
    const result = await decodeStaged('Bedtime battle', context(), route, () => { shown++; }, undefined, fake(async opts => {
      const k = kind(opts);
      if (k === 'first') return FIRST;
      if (k === 'review') return { approved: ++reviews === 1 || failure !== 'reject' };
      if (k === 'detail') { if (failure === 'outage') throw Error('Provider offline'); return failure === 'unrepairable' ? { ...DETAIL, afterwards: 'He has ADHD.' } : DETAIL; }
      if (k === 'repair') return { ...DETAIL, afterwards: 'Probably ADHD.' };
      throw Error(`Unexpected ${k}`);
    }));
    assert.equal(shown, 1, failure);
    assert.equal(result.detailAvailable, false, failure);
    assert.equal(result.analysis.detailUnavailable, true);
    assert.equal(result.analysis.sayThis, FIRST.sayThis);
    assert.deepEqual(result.analysis.doThis, FIRST.doThis);
    assert.equal(result.analysis.afterwards, '', 'Unchecked explanation text is never kept');
    assert.deepEqual(result.analysis.hypotheses, []);
  }
});

test('stage B repair rewrites only explanation fields, never the words already shown', async () => {
  let repairInput = '';
  const result = await decodeStaged('Hitting', context(), route, () => undefined, undefined, fake(async opts => {
    const k = kind(opts);
    if (k === 'first') return FIRST;
    if (k === 'detail') return { ...DETAIL, developmentalContext: 'He has ADHD.' };
    if (k === 'repair') { repairInput = opts.user; return DETAIL; }
    if (k === 'review') return { approved: true };
    throw Error(`Unexpected ${k}`);
  }));
  assert(repairInput.includes('developmentalContext') && !repairInput.includes(FIRST.sayThis));
  assert.equal(result.analysis.developmentalContext, DETAIL.developmentalContext);
  assert.equal(result.analysis.sayThis, FIRST.sayThis);
});

test('a withheld or failed stage A shows nothing', async () => {
  for (const failure of ['reject', 'outage']) {
    let shown = 0;
    await assert.rejects(decodeStaged('Tantrum', context(), route, () => { shown++; }, undefined, fake(async opts => {
      const k = kind(opts);
      if (k === 'first') { if (failure === 'outage') throw new DecodeError('timeout', 'slow'); return FIRST; }
      if (k === 'review') return { approved: false };
      throw Error(`Stage B must not run: ${k}`);
    })), e => e instanceof DecodeError && e.code === (failure === 'reject' ? 'unsafe' : 'timeout'));
    assert.equal(shown, 0);
  }
});

test('cancellation after stage A keeps stage A and does not start stage B', async () => {
  const controller = new AbortController(); let detailCalls = 0;
  const result = await decodeStaged('Tantrum', context(), route, () => controller.abort(), controller.signal, fake(async opts => {
    const k = kind(opts);
    if (k === 'detail') detailCalls++;
    return k === 'first' ? FIRST : { approved: true };
  }));
  assert.equal(detailCalls, 0);
  assert.equal(result.detailAvailable, false);
  assert.equal(result.analysis.sayThis, FIRST.sayThis);
});

test('triage receives age and stage band only, with calibrated ordinary examples', async () => {
  let seen: StructuredOpts<unknown> | undefined;
  const c = child(7, 2);
  await classifySafety('He is crying about his spelling test', undefined, fake(async opts => { seen = opts; return { level: 'low', category: 'none', reason: 'fixture' }; }),
    { years: c.age.years, months: c.age.months, stage: c.age.stage, stageLabel: STAGES[stageBandFor(c.age)].label });
  assert.match(seen!.user, /<child age="7 years 2 months" stage="Early school years \(6–8 years\)" \/>/);
  assert(!seen!.user.includes('Synthetic'), 'No name or profile in triage');
  for (const example of ['drop-off', 'I\'ll kill you!', 'spelling test', 'going to lose it', '"dying" in a video game'])
    assert(seen!.system.includes(example), `Calibration example: ${example}`);
  assert.match(seen!.system, /never "low" because the child is young/);
  assert.equal(safetyUserTurn('Hello'), '<message>\nHello\n</message>');
  assert.match(safetyUserTurn('Hello', { years: 0, months: 0, stage: 'pregnancy' }), /not yet born/);
});

test('model-free emergency patterns still bypass triage when age is supplied', async () => {
  let calls = 0;
  const never = fake(async () => { calls++; throw Error('Provider must not run'); });
  for (const message of ['My child is not breathing', 'She said she wants to die', 'He swallowed a battery', 'I might hurt my baby'])
    assert.equal(guidancePath(await classifySafety(message, undefined, never, { years: 4, months: 1, stage: 'early-childhood', stageLabel: 'Little one (3–6 years)' })), 'support');
  assert.equal(calls, 0);
});

test('lint ignores ordinary words that look like condition acronyms, but still catches diagnoses', () => {
  for (const ok of ['This is odd for her, and that is fine.', 'It is add one more step at a time.', 'Some days are odd.', 'Maybe add a snack before homework.', 'A pattern that looks like spd in lowercase is not an acronym.'])
    assert.deepEqual(lintAnalysis({ afterwards: ok }), [], ok);
  for (const bad of ['He has ADD.', 'She may be ODD.', 'This sounds like SPD.', 'He probably has adhd.', 'She is autistic.', 'This looks like attention deficit disorder.', 'He is likely OCD.'])
    assert.equal(lintAnalysis({ afterwards: bad }).length, 1, bad);
});

test('school years split into 6–8 and 9–12 with distinct script styles', () => {
  const band = (y: number, m = 0) => stageBandFor(computeAge(child(y, m).dateOfBirth, null));
  assert.equal(band(5, 11), 'preschool');
  assert.equal(band(6), 'school_early');
  assert.equal(band(8, 11), 'school_early');
  assert.equal(band(9), 'school_late');
  assert.equal(band(11, 11), 'school_late');
  assert.equal(band(12), 'early_teen');
  assert.notEqual(STAGES.school_early.scriptStyle, STAGES.school_late.scriptStyle);
  assert.equal('middle' in STAGES, false);
});

test('withheld answers fall back to the closest age-matched Handbook card, never generated text', () => {
  const seven = child(7, 2);
  const homework = fallbackCard(seven, 'Every evening homework turns into tears');
  assert(homework && cardsForChild(seven).some(c => c.id === homework.id), 'Card is age-matched');
  assert.equal(homework!.id, 'school-after');
  const screens = fallbackCard(child(10), 'He will not stop gaming when time is up');
  assert.equal(screens?.id, 'digital-phone');
  const generic = fallbackCard(seven, 'Something happened today');
  assert(generic && !['body', 'safety'].some(t => generic.id.startsWith(t)), 'Body and safety cards need a clear match');
  assert.equal(fallbackCard({ dateOfBirth: null, dueDate: null }, 'Anything'), null);
  assert.match(FALLBACK_MESSAGE, /couldn't check a custom answer/);
});

test('the quick follow-up window is a shared constant matching SQL', () => {
  assert.equal(CLARIFY_WINDOW_MS, 30 * 60 * 1000);
});

test('evaluation starts routing alongside triage, discards it off the ordinary path and records stage timings', async () => {
  let releaseSafety!: (v: unknown) => void; let routerStarted!: () => void;
  const routerSeen = new Promise<void>(r => { routerStarted = r; });
  const calls: string[] = [];
  const pending = evaluateTurn('She hit her brother', context(), 'guidance', {}, fake(async opts => {
    const k = kind(opts); calls.push(k);
    if (k === 'safety') return new Promise(r => { releaseSafety = r; });
    if (k === 'router') { routerStarted(); return { modules: ['emotions'], mode: 'right_now', goal: 'calm_now', clarifyNeeded: false, clarifyQuestion: '', clarifyOptions: [] }; }
    if (k === 'first') return FIRST;
    if (k === 'detail') return DETAIL;
    return { approved: true };
  }));
  await routerSeen; // The router ran while triage was still unresolved.
  assert.deepEqual([...calls].sort(), ['router', 'safety'], 'Nothing else runs before triage resolves');
  releaseSafety({ level: 'low', category: 'none', reason: 'fixture' });
  const result = await pending;
  assert.equal(result.detailAvailable, true);
  assert(result.timings.firstMs !== undefined && result.timings.detailMs !== undefined && result.timings.routeMs !== undefined);
  assert.equal(calls.filter(k => k === 'first' || k === 'detail').length, 2);

  const escalated: string[] = [];
  const support = await evaluateTurn('Something feels wrong lately', context(), 'guidance', {}, fake(async opts => {
    const k = kind(opts); escalated.push(k);
    return k === 'safety' ? { level: 'elevated', category: 'wellbeing_concern', reason: 'fixture' } : { modules: ['emotions'], mode: 'right_now', goal: 'calm_now', clarifyNeeded: false, clarifyQuestion: '', clarifyOptions: [] };
  }));
  assert.equal(support.path, 'support');
  assert.equal(support.analysis, undefined);
  assert(!escalated.includes('first') && !escalated.includes('detail'), 'No advice generation off the ordinary path');
});

test('a parent leaving after the words appear is recorded differently from Kahiye failing to add the why', async () => {
  const controller = new AbortController();
  const result = await decodeStaged('Bedtime battle', context(), route, () => controller.abort(), controller.signal, fake(async opts => {
    const k = kind(opts);
    if (k === 'first') return { ...FIRST, seekHelpIf: 'If bedtime fear stops sleep most nights for weeks, talk to your paediatrician.' };
    if (k === 'review') return { approved: true };
    throw Error(`Unexpected ${k} after the parent left`);
  }));
  assert.equal(result.analysis.detailCancelled, true);
  assert.equal(result.analysis.detailUnavailable, undefined, 'Cancelled answers are still counted');
  assert.equal(result.first.seekHelpIf, 'If bedtime fear stops sleep most nights for weeks, talk to your paediatrician.', 'When to seek help arrives with the first, checked answer');
  assert.equal(result.analysis.seekHelpIf, result.first.seekHelpIf);
});
