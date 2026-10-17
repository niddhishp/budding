import { completeGuidance, failGuidance, guidanceErrorResponse, reserveGuidance, type Reservation } from '@/lib/guidance';
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
// English is free; other languages are a Plus feature.
export async function POST(req: Request) {
  const access = await requireParentAccess();
  if (access.response) return access.response;
  const { supabase, user } = access;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Choose a language and who it is for.' }, { status: 400 });
  const { decodeId, language, audience } = parsed.data;

  let reservation: Reservation | undefined;
  try {
  if (language !== 'English') {
    const entitlement = await getEntitlement(supabase, user.id);
    if (entitlement.plan !== 'plus') {
      return NextResponse.json(
        { error: `Sharing in ${language} is part of Kahiye Plus.`, code: 'upgrade_required', entitlement },
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

  if (decode.safety_category !== 'none') return NextResponse.json({ error: 'Use the original support information for this situation.' }, { status: 422 });
  reservation = await reserveGuidance({ id: crypto.randomUUID(), userId: user.id, childId: decode.child_id, kind: 'share', content: { decodeId, language, audience } });
    const message = await writeShareMessage({
      childName: decode.children?.name ?? 'our child',
      scenario: decode.scenario,
      analysis: decode.analysis,
      language,
      audience, signal: AbortSignal.any([req.signal, AbortSignal.timeout(45_000)]),
    });
    await completeGuidance(reservation, {});
    return NextResponse.json({ message });
  } catch (error) { await failGuidance(reservation).catch(() => undefined); return guidanceErrorResponse(error); }
}
