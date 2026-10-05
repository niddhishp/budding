import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { getServerSupabase } from '@/lib/supabase-server';
import { getEntitlement } from '@/lib/billing';
import { classifySafety, decodeBehavior, DecodeError, DECODE_MODEL, safetyNotice } from '@/lib/ai/decode';
import { DECODE_COLUMNS, decodeFromRow, type DecodeRow } from '@/lib/mappers';
import { loadDecodeContext } from '@/lib/decodeContext';
import type { DecodeStreamEvent } from '@/types';

export const maxDuration = 60;

const bodySchema = z.object({
  childId: z.string().uuid(),
  scenario: z.string().trim().min(3).max(2000),
});

/**
 * Responds with newline-delimited JSON (DecodeStreamEvent per line):
 * `safety` as soon as it is known, `delta` text chunks of the JSON analysis, then `done` or `error`.
 * Failures before streaming starts return a normal JSON error with a status code.
 */
export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Describe the situation in a few words (up to 2000 characters).' }, { status: 400 });
  }
  const { childId, scenario } = parsed.data;

  const entitlement = await getEntitlement(supabase, user.id);
  if (entitlement.used >= entitlement.limit) {
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

  // RLS guarantees the child belongs to this parent; a foreign id simply returns nothing.
  let context;
  try {
    context = await loadDecodeContext(supabase, childId);
  } catch (error) {
    return dbError(error as { message: string });
  }
  if (!context) return NextResponse.json({ error: 'Child not found.' }, { status: 404 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: DecodeStreamEvent) => controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));

      // Safety is reported the moment it resolves, independent of the decode.
      const safetyPromise = classifySafety(scenario).then((safety) => {
        send({ type: 'safety', safety: safetyNotice(safety.level) });
        return safety;
      });

      try {
        const analysis = await decodeBehavior(scenario, context, (text) => send({ type: 'delta', text }));
        const safety = await safetyPromise;

        const { data: row, error } = await supabase
          .from('decodes')
          .insert({ child_id: childId, user_id: user.id, scenario, analysis, risk_level: safety.level, model: DECODE_MODEL })
          .select(DECODE_COLUMNS)
          .single<DecodeRow>();
        if (error) throw error;

        send({
          type: 'done',
          decode: decodeFromRow(row),
          entitlement: { ...entitlement, used: entitlement.used + 1 },
        });
      } catch (error) {
        await safetyPromise.catch(() => undefined);
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

function dbError(error: { message: string }) {
  console.error('[analyze] database error', error.message);
  return NextResponse.json({ error: 'Could not reach your saved data. Please try again.' }, { status: 500 });
}

function describeError(error: unknown): string {
  if (error instanceof DecodeError) {
    console.error('[analyze] decode failed', error.code, error.message);
    return 'We could not produce guidance for this one. Try rephrasing in a sentence or two.';
  }
  if (error instanceof Anthropic.RateLimitError) return 'Budding is busy right now. Please try again in a moment.';
  if (error instanceof Anthropic.AuthenticationError) {
    console.error('[analyze] ANTHROPIC_API_KEY is missing or invalid');
    return 'Budding is not configured correctly. Please contact support.';
  }
  if (error instanceof Anthropic.APIError) {
    console.error('[analyze] API error', error.status, error.message);
    return 'Budding could not respond. Please try again.';
  }
  if (error instanceof z.ZodError || error instanceof SyntaxError) {
    console.error('[analyze] malformed model output', error);
    return 'We could not produce guidance for this one. Please try again.';
  }
  console.error('[analyze] unexpected error', error);
  return 'Something went wrong. Please try again.';
}
