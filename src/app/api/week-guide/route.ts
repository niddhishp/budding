import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSupabase } from '@/lib/supabase-server';
import { getAdminSupabase } from '@/lib/supabase-admin';
import { DECODE_MODEL } from '@/lib/ai/decode';
import { weekGuideSchema, writeWeekGuide } from '@/lib/ai/weekGuide';
import { STORY_LANGUAGES } from '@/lib/plans';

export const maxDuration = 60;

const querySchema = z.object({
  week: z.coerce.number().int().min(1).max(42),
  language: z.enum(STORY_LANGUAGES).default('English'),
});

// Shared cache: each (week, language) is written once by the server and read by every parent.
export async function GET(req: Request) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });

  const params = new URL(req.url).searchParams;
  const parsed = querySchema.safeParse({ week: params.get('week'), language: params.get('language') ?? undefined });
  if (!parsed.success) return NextResponse.json({ error: 'Invalid week.' }, { status: 400 });
  const { week, language } = parsed.data;

  const { data: cached } = await supabase
    .from('week_guides')
    .select('guide')
    .eq('week', week)
    .eq('language', language)
    .maybeSingle();
  const valid = weekGuideSchema.safeParse(cached?.guide);
  if (valid.success) return NextResponse.json({ guide: valid.data });

  try {
    const guide = await writeWeekGuide(week, language);
    const { error } = await getAdminSupabase()
      .from('week_guides')
      .upsert({ week, language, guide, model: DECODE_MODEL }, { onConflict: 'week,language', ignoreDuplicates: true });
    if (error) console.error('[week-guide] cache write failed', error.message);
    return NextResponse.json({ guide });
  } catch (error) {
    console.error('[week-guide] generation failed', error);
    return NextResponse.json({ error: 'This week\'s guide is not available right now.' }, { status: 502 });
  }
}
