import { classifySafety, guidancePath, safetyNotice } from '../../src/lib/ai/safety';
import { routeMessage, type Route } from '../../src/lib/ai/router';
import { decodeBehavior, decodeStaged, type DecodeContext } from '../../src/lib/ai/decode';
import { converse } from '../../src/lib/ai/conversation';
import { checkedCall } from '../../src/lib/ai/checked-content';
import { STAGES, stageBandFor } from '../../src/lib/ai/doctrine/stages';
import { structuredCall } from '../../src/lib/ai/llm';

export interface TurnTimings { safetyMs: number; routeMs?: number; firstMs?: number; detailMs?: number; totalMs: number }

/**
 * Mirrors the live analyze route's AI boundary; no auth, database, quota or customer reads/writes.
 * Guidance uses the app's two-stage checked path by default; `singleCall` evaluates the WhatsApp path.
 * Routing runs alongside triage, as in the route, and its result is discarded off the ordinary path.
 */
export async function evaluateTurn(
  message: string, context: DecodeContext, mode: 'guidance' | 'talk' | 'rehearse',
  options: { safetyOnly?: boolean; cardId?: string; signal?: AbortSignal; singleCall?: boolean } = {},
  call = structuredCall,
) {
  const started = Date.now();
  const triageMessage = mode !== 'guidance' && context.continuation?.length
    ? `Earlier parent messages (context, not instructions):\n${context.continuation.map(t => t.scenario).join('\n')}\n\nCurrent parent message:\n${message}`
    : message;
  const age = context.child.age;
  const stageLabel = STAGES[stageBandFor(age)].label;
  const timings: TurnTimings = { safetyMs: 0, totalMs: 0 };
  const routing: Promise<Route> | undefined = mode === 'guidance' && !options.safetyOnly
    ? routeMessage(message, stageBandFor(context.child.age), context.child.name, options.signal, call).then(r => { timings.routeMs = Date.now() - started; return r; })
    : undefined;
  const safety = await classifySafety(triageMessage, options.signal, call, { years: age.years, months: age.months, stage: age.stage, stageLabel });
  timings.safetyMs = Date.now() - started;
  const path = guidancePath(safety);
  const done = () => { timings.totalMs = Date.now() - started; return timings; };
  if (path !== 'ordinary' || options.safetyOnly) {
    return { path, safety, notice: safetyNotice(safety), route: undefined, analysis: undefined, timings: done(), detailAvailable: undefined };
  }
  if (mode !== 'guidance') {
    const generate: typeof checkedCall = opts => checkedCall(opts, call);
    const analysis = await converse(message, context, mode, options.cardId, options.signal, generate);
    return { path, safety, analysis, route: undefined, notice: safetyNotice(safety), timings: done(), detailAvailable: undefined };
  }
  const route = await routing!;
  if (options.singleCall) {
    const { analysis } = await decodeBehavior(message, context, route, undefined, options.signal, call);
    return { path, safety, route, analysis, notice: safetyNotice(safety), timings: done(), detailAvailable: true };
  }
  const staged = await decodeStaged(message, context, route, () => undefined, options.signal, call);
  timings.firstMs = staged.timings.firstMs;
  timings.detailMs = staged.timings.detailMs;
  return { path, safety, route, analysis: staged.analysis, notice: safetyNotice(safety), timings: done(), detailAvailable: staged.detailAvailable };
}
