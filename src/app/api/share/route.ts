import { completeGuidance, failGuidance, guidanceErrorResponse, GuidanceRequestError, reserveGuidance, type Reservation } from '@/lib/guidance';
import { getAdminSupabase } from '@/lib/supabase-admin';
import { FREE_TRANSLATED_SHARES_PER_MONTH } from '@/lib/plans';
import { requireParentAccess } from '@/lib/access';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getEntitlement } from '@/lib/billing';
import { SHARE_LANGUAGES, writeShareMessage } from '@/lib/ai/decode';
import { HANDBOOK, type HandbookCard } from '@/data/handbook';
import type { AgentAnalysis } from '@/types';

export const maxDuration = 60;

const common = {
  language: z.enum(SHARE_LANGUAGES),
  audience: z.enum(['grandparent', 'nanny', 'partner', 'teacher']),
};
// Exactly one source: a saved decode, or a Handbook card shared for the selected child.
const bodySchema = z.union([
  z.object({ decodeId: z.string().uuid(), ...common }).strict(),
  z.object({ cardId: z.string().refine(id => HANDBOOK.some(c => c.id === id)), childId: z.string().uuid(), ...common }).strict(),
]);

// The card's own words become the plan, so the same message checks apply to both sources.
function cardPlan(card: HandbookCard): AgentAnalysis {
  return {
    sayThis: card.words,
    doThis: [card.activity, `If the child says "${card.resistance}", try: "${card.response}"`],
    avoid: card.avoid,
    interpretation: card.why,
    emotionalNeed: '', afterwards: '', skillBeingBuilt: '', developmentalContext: '',
  };
}

// Rewrites a decode or a Handbook card as a WhatsApp-ready message for another caregiver.
// English is free; Free families also get an allowance in other languages for any 30 days, unlimited on Plus.
export async function POST(req: Request) {
  const access = await requireParentAccess();
  if (access.response) return access.response;
  const { supabase, user } = access;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Choose a language and who it is for.' }, { status: 400 });
  const { language, audience } = parsed.data;

  let reservation: Reservation | undefined;
  try {
  // Free families get a few messages in another language in any 30 days; English is always free.
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
        { error: `You have used the ${FREE_TRANSLATED_SHARES_PER_MONTH} free messages in other languages for the last 30 days. English messages stay free, and Kahiye Plus has no 30-day limit.`, code: 'upgrade_required', entitlement },
        { status: 402 },
      );
    }
  }

  let childId: string, childName: string, scenario: string, analysis: AgentAnalysis, content: Record<string, string>;
  if ('decodeId' in parsed.data) {
    const { decodeId } = parsed.data;
    const { data: decode } = await supabase
      .from('decodes')
      .select('child_id, scenario, analysis, safety_category, children(name)')
      .eq('id', decodeId)
      .maybeSingle<{ child_id: string; safety_category: string; scenario: string; analysis: AgentAnalysis | null; children: { name: string } | null }>();
    if (!decode?.analysis) return NextResponse.json({ error: 'Decode not found.' }, { status: 404 });
    if (decode.analysis.conversation) return NextResponse.json({ error: 'Chat and fictional practice cannot be shared as a real parenting situation.' }, { status: 422 });
    if (decode.safety_category !== 'none') return NextResponse.json({ error: 'Use the original support information for this situation.' }, { status: 422 });
    childId = decode.child_id; childName = decode.children?.name ?? 'our child';
    scenario = decode.scenario; analysis = decode.analysis;
    content = { decodeId, language, audience };
  } else {
    const { cardId } = parsed.data;
    const card = HANDBOOK.find(c => c.id === cardId)!;
    // Row-level security returns only this parent's own child.
    const { data: owned } = await supabase.from('children').select('id, name').eq('id', parsed.data.childId)
      .maybeSingle<{ id: string; name: string }>();
    if (!owned) return NextResponse.json({ error: 'Child not found.' }, { status: 404 });
    childId = owned.id; childName = owned.name;
    scenario = card.title; analysis = cardPlan(card);
    content = { cardId, childId, language, audience };
  }

  reservation = await reserveGuidance({ id: crypto.randomUUID(), userId: user.id, childId, kind: 'share', content });
  if (language !== 'English') {
    const { error } = await getAdminSupabase().from('guidance_requests').update({ share_language: language }).eq('id', reservation.id).eq('lease', reservation.lease!);
    if (error) throw new GuidanceRequestError(503, 'unavailable', 'We could not prepare this message. Nothing has been used; please try again.');
  }
    const message = await writeShareMessage({
      childName, scenario, analysis, language,
      audience, signal: AbortSignal.any([req.signal, AbortSignal.timeout(45_000)]),
    });
    await completeGuidance(reservation, {});
    return NextResponse.json({ message, ...(translatedLeft !== null ? { translatedLeft: translatedLeft - 1 } : {}) });
  } catch (error) { await failGuidance(reservation).catch(() => undefined); return guidanceErrorResponse(error); }
}
