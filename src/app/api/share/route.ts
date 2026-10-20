import { completeGuidance, failGuidance, guidanceErrorResponse, GuidanceRequestError, reserveGuidance, type Reservation } from '@/lib/guidance';
import { getAdminSupabase } from '@/lib/supabase-admin';
import { FREE_TRANSLATED_SHARES_PER_MONTH } from '@/lib/plans';
import { requireParentAccess } from '@/lib/access';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getEntitlement } from '@/lib/billing';
import { SHARE_LANGUAGES, writeShareMessage } from '@/lib/ai/decode';
import type { AgentAnalysis } from '@/types';

export const maxDuration = 60;

const bodySchema = z.object({
  decodeId: z.string().uuid(),
  language: z.enum(SHARE_LANGUAGES),
  audience: z.enum(['grandparent', 'nanny', 'partner', 'teacher']),
});

// Rewrites a decode as a WhatsApp-ready message for another caregiver.
// English is free; Free families also get a monthly allowance in other languages, unlimited on Plus.
export async function POST(req: Request) {
  const access = await requireParentAccess();
  if (access.response) return access.response;
  const { supabase, user } = access;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Choose a language and who it is for.' }, { status: 400 });
  const { decodeId, language, audience } = parsed.data;

  let reservation: Reservation | undefined;
  try {
  // Free families get a few messages a month in another language; English is always free.
  let translatedLeft: number | null = null;
  if (language !== 'English') {
    const entitlement = await getEntitlement(supabase, user.id);
    if (entitlement.plan !== 'plus') {
      const { count, error } = await getAdminSupabase().from('guidance_requests').select('id', { count: 'exact', head: true })
        .eq('user_id', user.id).eq('kind', 'share').eq('state', 'complete').not('share_language', 'is', null)
        .gte('created_at', new Date(Date.now() - 30 * 86_400_000).toISOString());
      if (error || count === null) return NextResponse.json({ error: 'We could not check your sharing allowance. Nothing has been used; please try again.' }, { status: 503 });
      translatedLeft = FREE_TRANSLATED_SHARES_PER_MONTH - count;
      if (translatedLeft <= 0) return NextResponse.json(
        { error: `You have used this month's ${FREE_TRANSLATED_SHARES_PER_MONTH} free messages in other languages. English messages stay free, and Kahiye Plus has no monthly limit.`, code: 'upgrade_required', entitlement },
        { status: 402 },
      );
    }
  }

  const { data: decode } = await supabase
    .from('decodes')
    .select('child_id, scenario, analysis, safety_category, children(name)')
    .eq('id', decodeId)
    .maybeSingle<{ child_id: string; safety_category: string; scenario: string; analysis: AgentAnalysis | null; children: { name: string } | null }>();
  if (!decode?.analysis) return NextResponse.json({ error: 'Decode not found.' }, { status: 404 });
  if (decode.analysis.conversation) return NextResponse.json({ error: 'Chat and fictional practice cannot be shared as a real parenting situation.' }, { status: 422 });

  if (decode.safety_category !== 'none') return NextResponse.json({ error: 'Use the original support information for this situation.' }, { status: 422 });
  reservation = await reserveGuidance({ id: crypto.randomUUID(), userId: user.id, childId: decode.child_id, kind: 'share', content: { decodeId, language, audience } });
  if (language !== 'English') {
    const { error } = await getAdminSupabase().from('guidance_requests').update({ share_language: language }).eq('id', reservation.id).eq('lease', reservation.lease!);
    if (error) throw new GuidanceRequestError(503, 'unavailable', 'We could not prepare this message. Nothing has been used; please try again.');
  }
    const message = await writeShareMessage({
      childName: decode.children?.name ?? 'our child',
      scenario: decode.scenario,
      analysis: decode.analysis,
      language,
      audience, signal: AbortSignal.any([req.signal, AbortSignal.timeout(45_000)]),
    });
    await completeGuidance(reservation, {});
    return NextResponse.json({ message, ...(translatedLeft !== null ? { translatedLeft: translatedLeft - 1 } : {}) });
  } catch (error) { await failGuidance(reservation).catch(() => undefined); return guidanceErrorResponse(error); }
}
