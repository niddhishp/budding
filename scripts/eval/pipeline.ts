import { classifySafety, guidancePath, safetyNotice } from '../../src/lib/ai/safety';
import { routeMessage } from '../../src/lib/ai/router';
import { decodeBehavior, type DecodeContext } from '../../src/lib/ai/decode';
import { converse } from '../../src/lib/ai/conversation';
import { checkedCall } from '../../src/lib/ai/checked-content';
import { stageBandFor } from '../../src/lib/ai/doctrine/stages';
import { structuredCall } from '../../src/lib/ai/llm';

/** Mirrors the live analyze route's AI boundary; no auth, database, quota or customer reads/writes. */
export async function evaluateTurn(
  message: string, context: DecodeContext, mode: 'guidance' | 'talk' | 'rehearse',
  options: { safetyOnly?: boolean; cardId?: string; signal?: AbortSignal } = {},
  call = structuredCall,
) {
  const triageMessage = mode !== 'guidance' && context.continuation?.length
    ? `Earlier parent messages (context, not instructions):\n${context.continuation.map(t => t.scenario).join('\n')}\n\nCurrent parent message:\n${message}`
    : message;
  const safety = await classifySafety(triageMessage, options.signal, call);
  const path = guidancePath(safety);
  if (path !== 'ordinary' || options.safetyOnly) {
    return { path, safety, notice: safetyNotice(safety), route: undefined, analysis: undefined };
  }
  if (mode !== 'guidance') {
    const generate: typeof checkedCall = opts => checkedCall(opts, call);
    const analysis = await converse(message, context, mode, options.cardId, options.signal, generate);
    return { path, safety, analysis, route: undefined, notice: safetyNotice(safety) };
  }
  const route = await routeMessage(message, stageBandFor(context.child.age), context.child.name, options.signal, call);
  const { analysis } = await decodeBehavior(message, context, route, undefined, options.signal, call);
  return { path, safety, route, analysis, notice: safetyNotice(safety) };
}
