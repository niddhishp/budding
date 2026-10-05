import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSupabase } from '@/lib/supabase-server';
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
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Choose a language and who it is for.' }, { status: 400 });
  const { decodeId, language, audience } = parsed.data;

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
    .select('scenario, analysis, children(name)')
    .eq('id', decodeId)
    .maybeSingle<{ scenario: string; analysis: AgentAnalysis | null; children: { name: string } | null }>();
  if (!decode?.analysis) return NextResponse.json({ error: 'Decode not found.' }, { status: 404 });

  try {
    const message = await writeShareMessage({
      childName: decode.children?.name ?? 'our child',
      scenario: decode.scenario,
      analysis: decode.analysis,
      language,
      audience,
    });
    return NextResponse.json({ message });
  } catch (error) {
    console.error('[share] failed', error);
    return NextResponse.json({ error: 'We could not write that message. Please try again.' }, { status: 502 });
  }
}
