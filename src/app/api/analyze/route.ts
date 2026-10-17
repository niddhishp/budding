import { requireParentAccess } from '@/lib/access';
import { NextResponse, after } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import type { getServerSupabase } from '@/lib/supabase-server';
import { getAdminSupabase } from '@/lib/supabase-admin';
import { getEntitlement } from '@/lib/billing';
import { decodeBehavior, DecodeError, DECODE_MODEL } from '@/lib/ai/decode';
import { bypassesPaywall, classifySafety, needsReview, safetyNotice } from '@/lib/ai/safety';
import { routeMessage } from '@/lib/ai/router';
import { rememberFromDecode } from '@/lib/ai/memory';
import { stageBandFor } from '@/lib/ai/doctrine/stages';
import { DECODE_COLUMNS, decodeFromRow, type DecodeRow } from '@/lib/mappers';
import { loadDecodeContext } from '@/lib/decodeContext';
import type { DecodeStreamEvent } from '@/types';

export const maxDuration = 60;

const bodySchema = z.object({
  childId: z.string().uuid(),
  scenario: z.string().trim().min(3).max(2000),
  /** A refinement of an earlier decode (answering its clarifying question). Free. */
  refines: z.string().uuid().optional(),
});

const REFINE_WINDOW_MS = 30 * 60_000;

/**
 * Orchestrated decode. Order is constitutional:
 *   1. safety triage starts first and runs for every plan;
 *   2. the paywall applies only if the turn carries no safety signal;
 *   3. router → composed doctrine → one streamed generation → critic;
 *   4. memory + human-review queue are written after the response (never on the hot path).
 * Responds with NDJSON events: `safety`, `delta`, then `done` or `error`.
 */
export async function POST(req: Request) {
  const access = await requireParentAccess();
  if (access.response) return access.response;
  const { supabase, user } = access;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Describe the situation in a few words (up to 2000 characters).' }, { status: 400 });
  }
  const { childId, scenario, refines } = parsed.data;

  // 1. Safety first, for everyone.
  const safetyPromise = classifySafety(scenario);

  const [entitlement, contextResult, refineOk] = await Promise.all([
    getEntitlement(supabase, user.id),
    loadDecodeContext(supabase, childId).then((c) => ({ c }), (error) => ({ error })),
    refines ? isRecentOwnDecode(supabase, refines) : Promise.resolve(false),
  ]);
  if ('error' in contextResult) return dbError(contextResult.error as { message: string });
  const context = contextResult.c;
  if (!context) return NextResponse.json({ error: 'Child not found.' }, { status: 404 });

  // 2. Paywall only after safety: crisis-adjacent turns are never blocked.
  if (entitlement.used >= entitlement.limit && !refineOk) {
    const safety = await safetyPromise;
    if (!bypassesPaywall(safety)) {
      return NextResponse.json(
        {
          error: entitlement.plan === 'free'
            ? `You've used your ${entitlement.limit} free decodes this week.`
            : `You've reached today's fair-use limit of ${entitlement.limit} decodes. It resets within 24 hours.`,
          code: entitlement.plan === 'free' ? 'upgrade_required' : 'daily_limit',
          entitlement,
        },
        { status: entitlement.plan === 'free' ? 402 : 429 },
      );
    }
  }

  // 3. Route while safety finishes.
  const routePromise = routeMessage(scenario, stageBandFor(context.child.age), context.child.name);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: DecodeStreamEvent) => controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));

      const reportedSafety = safetyPromise.then((safety) => {
        send({ type: 'safety', safety: safetyNotice(safety) });
        return safety;
      });

      try {
        const route = await routePromise;
        const { analysis, violations, repaired } = await decodeBehavior(scenario, context, route, (text) => send({ type: 'delta', text }));
        const safety = await reportedSafety;
        if (violations.length) console.warn('[analyze] critic', { violations, repaired, modules: route.modules });

        const { data: row, error } = await supabase
          .from('decodes')
          .insert({
            child_id: childId,
            user_id: user.id,
            scenario,
            analysis,
            risk_level: safety.level,
            safety_category: safety.category,
            refines: refineOk ? refines : null,
            model: DECODE_MODEL,
          })
          .select(DECODE_COLUMNS)
          .single<DecodeRow>();
        if (error) throw error;

        const counted = safety.category === 'none' && !refineOk;
        send({ type: 'done', decode: decodeFromRow(row), entitlement: { ...entitlement, used: entitlement.used + (counted ? 1 : 0) } });

        // 4. Off the hot path.
        after(async () => {
          if (needsReview(safety)) {
            const { error: reviewError } = await getAdminSupabase().from('safety_events').insert({
              user_id: user.id, child_id: childId, decode_id: row.id, channel: 'app',
              level: safety.level, category: safety.category, reason: safety.reason,
            });
            if (reviewError) console.error('[analyze] safety event not queued', reviewError.message);
          }
          await rememberFromDecode(supabase, { userId: user.id, childId, childName: context.child.name, decodeId: row.id, message: scenario });
        });
      } catch (error) {
        await reportedSafety.catch(() => undefined);
        send({ type: 'error', error: describeError(error) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    },
  });
}

async function isRecentOwnDecode(supabase: Awaited<ReturnType<typeof getServerSupabase>>, id: string) {
  const { data } = await supabase.from('decodes').select('created_at').eq('id', id).maybeSingle();
  return !!data && Date.now() - new Date(data.created_at as string).getTime() < REFINE_WINDOW_MS;
}

function dbError(error: { message: string }) {
  console.error('[analyze] database error', error.message);
  return NextResponse.json({ error: 'Could not reach your saved data. Please try again.' }, { status: 500 });
}

function describeError(error: unknown): string {
  if (error instanceof DecodeError) {
    console.error('[analyze] decode failed', error.code, error.message);
    return 'We could not produce guidance for this one. Try rephrasing in a sentence or two.';
  }
  if (error instanceof Anthropic.RateLimitError) return 'Kahiye is busy right now. Please try again in a moment.';
  if (error instanceof Anthropic.AuthenticationError) {
    console.error('[analyze] ANTHROPIC_API_KEY is missing or invalid');
    return 'Kahiye is not configured correctly. Please contact support.';
  }
  if (error instanceof Anthropic.APIError) {
    console.error('[analyze] API error', error.status, error.message);
    return 'Kahiye could not respond. Please try again.';
  }
  if (error instanceof z.ZodError || error instanceof SyntaxError) {
    console.error('[analyze] malformed model output', error);
    return 'We could not produce guidance for this one. Please try again.';
  }
  console.error('[analyze] unexpected error', error);
  return 'Something went wrong. Please try again.';
}
