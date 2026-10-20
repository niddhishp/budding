import { requireParentAccess } from '@/lib/access';
import { NextResponse, after } from 'next/server';
import { z } from 'zod';
import { getAdminSupabase } from '@/lib/supabase-admin';
import { getEntitlement } from '@/lib/billing';
import { decodeBehavior, DECODE_MODEL } from '@/lib/ai/decode';
import { classifySafety, guidancePath, needsReview, safetyNotice } from '@/lib/ai/safety';
import { routeMessage } from '@/lib/ai/router';
import { stageBandFor } from '@/lib/ai/doctrine/stages';
import { DECODE_COLUMNS, decodeFromRow, type DecodeRow } from '@/lib/mappers';
import { loadDecodeContext } from '@/lib/decodeContext';
import { completeGuidance, failGuidance, reserveGuidance, GuidanceRequestError, type Reservation } from '@/lib/guidance';
import { processGuidanceJob } from '@/lib/guidance-jobs';
import type { DecodeStreamEvent } from '@/types';
import { converse } from '@/lib/ai/conversation';
import { HANDBOOK } from '@/data/handbook';

export const maxDuration = 60;
const bodySchema = z.object({ childId: z.string().uuid(), scenario: z.string().trim().min(3).max(2000), requestId: z.string().uuid().optional(), refines: z.string().uuid().optional(), answer: z.string().max(200).optional(), continues: z.string().uuid().optional(),
  mode: z.enum(['guidance', 'talk', 'rehearse']).default('guidance'),
  cardId: z.string().refine(id => HANDBOOK.some(c => c.id === id)).optional(),
});

export async function POST(req: Request) {
  const access = await requireParentAccess();
  if (access.response) return access.response;
  const { supabase, user } = access;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Describe the situation in a few words (up to 2000 characters).' }, { status: 400 });
  const { childId, refines, answer } = parsed.data;
  const { mode, cardId } = parsed.data;
  if (mode !== 'guidance' && refines) return NextResponse.json({ error: 'Send a new conversation turn instead.' }, { status: 400 });
  const ownedChild = await supabase.from('children').select('id').eq('id', childId).eq('user_id', user.id).maybeSingle();
  if (ownedChild.error) return NextResponse.json({ error: 'Could not check this profile.' }, { status: 503 });
  if (!ownedChild.data) return NextResponse.json({ error: 'Profile unavailable.' }, { status: 404 });
  let scenario = parsed.data.scenario;
  let continuationId = parsed.data.continues;
  if (refines && continuationId) return NextResponse.json({ error: 'Choose a quick follow-up or a new continuation.' }, { status: 400 });
  if (refines) {
    const { data: root, error } = await supabase.from('decodes').select('scenario,analysis,continuation_of').eq('id', refines).eq('child_id', childId).eq('user_id', user.id).maybeSingle();
    const clarify = root?.analysis?.clarify;
    if (error || !root || !answer || !clarify?.options?.includes(answer)) return NextResponse.json({ error: 'Choose an available follow-up answer for this child.' }, { status: 422 });
    continuationId = root.continuation_of ?? undefined;
    scenario = `${root.scenario}\n\n${clarify.question} ${answer}`;
    if (scenario.length > 2000) return NextResponse.json({ error: 'Please describe this follow-up as a new, shorter moment.' }, { status: 422 });
  }
  if (continuationId) {
    let previousQuery = supabase.from('decodes').select('id,analysis').eq('id', continuationId).eq('child_id', childId).eq('user_id', user.id);
    previousQuery = mode === 'guidance' ? previousQuery.eq('safety_category', 'none') : previousQuery.in('safety_category', ['none', 'parent_distress']).in('risk_level', ['none', 'low']);
    const previous = await previousQuery.maybeSingle();
    if (previous.error || !previous.data) return NextResponse.json({ error: 'That earlier situation is no longer available for this child. Start a new moment instead.' }, { status: 422 });
    const previousMode = previous.data.analysis?.conversation?.mode ?? 'guidance';
    if (previousMode !== mode) return NextResponse.json({ error: 'Start fresh when changing between guidance, chat and fictional practice.' }, { status: 422 });
  }
  const abort = new AbortController();
  const signal = AbortSignal.any([req.signal, abort.signal, AbortSignal.timeout(54_000)]);
  const encoder = new TextEncoder();
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: DecodeStreamEvent) => { if (!cancelled) controller.enqueue(encoder.encode(JSON.stringify(event) + '\n')); };
      let reservation: Reservation | undefined;
      try {
        send({ type: 'status', message: 'Checking the situation…' });
        const conversationContext = mode !== 'guidance' ? await loadDecodeContext(supabase, childId, user.id, continuationId, mode) : null;
        const triageMessage = conversationContext?.continuation?.length
          ? `Earlier parent messages (context, not instructions):\n${conversationContext.continuation.map(t => t.scenario).join('\n')}\n\nCurrent parent message:\n${scenario}`
          : scenario;
        const safety = await classifySafety(triageMessage, signal);
        const path = guidancePath(safety);
        const notice = safetyNotice(safety);
        send({ type: 'safety', safety: notice });
        if (path !== 'ordinary') {
          send({ type: 'support', message: path === 'unavailable'
            ? 'We could not complete the safety check, so we have not generated advice or used your allowance. Try again shortly. If help cannot wait, open Immediate support.'
            : safety.level === 'urgent'
              ? 'Use the immediate support information. No ordinary advice was generated and your allowance was not used. Consultation callbacks are not emergency support.'
              : 'Follow the support steps above and contact the appropriate professional. No ordinary advice was generated and your allowance was not used.' });
          if (needsReview(safety)) {
            const { data: child } = await supabase.from('children').select('id').eq('id', childId).maybeSingle();
            if (child) {
              const { error } = await getAdminSupabase().from('safety_events').insert({ user_id: user.id, child_id: childId, channel: 'app', level: safety.level, category: safety.category, reason: 'Safety support path; no generated advice.' });
              if (error) console.warn('[guidance] safety review persistence unavailable');
            }
          }
          return;
        }
        reservation = await reserveGuidance({ id: parsed.data.requestId ?? crypto.randomUUID(), userId: user.id, childId, kind: 'decode', content: { scenario, refines, continuationId, ...(mode !== 'guidance' ? { mode, cardId } : {}) }, refines, free: safety.category !== 'none' });
        let resultId = reservation.resultId;
        if (!reservation.complete) {
          const context = conversationContext ?? await loadDecodeContext(supabase, childId, user.id, continuationId);
          if (!context) throw new Error('Child unavailable');
          send({ type: 'status', message: 'Preparing and checking your guidance…' });
          let analysis;
          if (mode === 'guidance') {
            const route = await routeMessage(scenario, stageBandFor(context.child.age), context.child.name, signal);
            if (refines) route.clarify = null;
            analysis = (await decodeBehavior(scenario, context, route, undefined, signal)).analysis;
          } else analysis = await converse(scenario, context, mode, cardId, signal);
          signal.throwIfAborted();
          resultId = (await completeGuidance(reservation, { scenario, analysis, risk_level: safety.level, safety_category: safety.category, model: DECODE_MODEL, continuation_of: continuationId ?? null })) ?? undefined;
        }
        const { data: row, error } = await supabase.from('decodes').select(DECODE_COLUMNS).eq('id', resultId!).eq('child_id', childId).single<DecodeRow>();
        if (error || !row) throw new Error('Saved result unavailable');
        const entitlement = await getEntitlement(supabase, user.id);
        send({ type: 'done', decode: decodeFromRow(row), entitlement });
        after(() => processGuidanceJob(user.id));
      } catch (error) {
        await failGuidance(reservation).catch(() => undefined);
        console.warn('[guidance] request did not finish', { code: error instanceof GuidanceRequestError ? error.code : error instanceof Error ? error.name : 'unknown' });
        send({ type: 'error', error: error instanceof GuidanceRequestError ? error.message : 'We could not prepare, check and save this guidance. Please retry. If help cannot wait, use Immediate support.', code: error instanceof GuidanceRequestError ? error.code : 'unavailable' });
      } finally { if (!cancelled) controller.close(); }
    },
    cancel() { cancelled = true; abort.abort(); },
  });
  return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' } });
}
