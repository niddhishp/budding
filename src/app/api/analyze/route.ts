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

export const maxDuration = 60;
const bodySchema = z.object({ childId: z.string().uuid(), scenario: z.string().trim().min(3).max(2000), requestId: z.string().uuid().optional(), refines: z.string().uuid().optional(), answer: z.string().max(200).optional() });

export async function POST(req: Request) {
  const access = await requireParentAccess();
  if (access.response) return access.response;
  const { supabase, user } = access;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Describe the situation in a few words (up to 2000 characters).' }, { status: 400 });
  const { childId, refines, answer } = parsed.data;
  let scenario = parsed.data.scenario;
  if (refines) {
    const { data: root, error } = await supabase.from('decodes').select('scenario,analysis').eq('id', refines).eq('child_id', childId).eq('user_id', user.id).maybeSingle();
    const clarify = root?.analysis?.clarify;
    if (error || !root || !answer || !clarify?.options?.includes(answer)) return NextResponse.json({ error: 'Choose an available follow-up answer for this child.' }, { status: 422 });
    scenario = `${root.scenario}\n\n${clarify.question} ${answer}`;
    if (scenario.length > 2000) return NextResponse.json({ error: 'Please describe this follow-up as a new, shorter moment.' }, { status: 422 });
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
        const safety = await classifySafety(scenario, signal);
        const path = guidancePath(safety);
        const notice = safetyNotice(safety);
        send({ type: 'safety', safety: notice });
        if (path !== 'ordinary') {
          send({ type: 'support', message: path === 'unavailable' ? 'We could not complete the safety check, so we have not generated advice or used your allowance. Try again shortly. If help cannot wait, open Immediate support.' : 'Use the immediate support information. No ordinary advice was generated and your allowance was not used. Consultation callbacks are not emergency support.' });
          if (needsReview(safety)) {
            const { data: child } = await supabase.from('children').select('id').eq('id', childId).maybeSingle();
            if (child) {
              const { error } = await getAdminSupabase().from('safety_events').insert({ user_id: user.id, child_id: childId, channel: 'app', level: safety.level, category: safety.category, reason: 'Safety support path; no generated advice.' });
              if (error) console.warn('[guidance] safety review persistence unavailable');
            }
          }
          return;
        }
        reservation = await reserveGuidance({ id: parsed.data.requestId ?? crypto.randomUUID(), userId: user.id, childId, kind: 'decode', content: { scenario, refines }, refines, free: safety.category !== 'none' });
        let resultId = reservation.resultId;
        if (!reservation.complete) {
          const context = await loadDecodeContext(supabase, childId);
          if (!context) throw new Error('Child unavailable');
          const route = await routeMessage(scenario, stageBandFor(context.child.age), context.child.name, signal);
          if (refines) route.clarify = null;
          send({ type: 'status', message: 'Preparing and checking your guidance…' });
          const { analysis } = await decodeBehavior(scenario, context, route, undefined, signal);
          signal.throwIfAborted();
          resultId = (await completeGuidance(reservation, { scenario, analysis, risk_level: safety.level, safety_category: safety.category, model: DECODE_MODEL })) ?? undefined;
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
