import { requireParentAccess } from '@/lib/access';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { weekGuideSchema } from '@/lib/ai/weekGuide';
import { STORY_LANGUAGES } from '@/lib/plans';

export const maxDuration = 60;

const querySchema = z.object({
  week: z.coerce.number().int().min(1).max(42),
  language: z.enum(STORY_LANGUAGES).default('English'),
});

// Shared cache: each (week, language) is written once by the server and read by every parent.
export async function GET(req: Request) {
  const access = await requireParentAccess();
  if (access.response) return access.response;
  const { supabase } = access;

  const params = new URL(req.url).searchParams;
  const parsed = querySchema.safeParse({ week: params.get('week'), language: params.get('language') ?? undefined });
  if (!parsed.success) return NextResponse.json({ error: 'Invalid week.' }, { status: 400 });
  const { week, language } = parsed.data;

  const { data: cached } = await supabase
    .from('week_guides')
    .select('guide')
    .eq('week', week)
    .eq('language', language)
    .not('reviewed_at', 'is', null)
    .maybeSingle();
  const valid = weekGuideSchema.safeParse(cached?.guide);
  if (valid.success) return NextResponse.json({ guide: valid.data });

  return NextResponse.json({ error: 'A reviewed guide for this week is not published yet. Keep your antenatal appointments and ask your clinician for advice specific to your pregnancy.' }, { status: 404 });
}
