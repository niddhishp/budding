import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSupabase } from '@/lib/supabase-server';
import { getEntitlement } from '@/lib/billing';
import { DECODE_MODEL } from '@/lib/ai/decode';
import { writeStory } from '@/lib/ai/story';
import { CHILD_COLUMNS, childFromRow, STORY_COLUMNS, storyFromRow, type ChildRow, type StoryRow } from '@/lib/mappers';
import { FREE_STORIES_LIFETIME, PLUS_STORIES_PER_DAY, STORY_LANGUAGES } from '@/lib/plans';

export const maxDuration = 60;

export async function GET(req: Request) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });

  const childId = z.string().uuid().safeParse(new URL(req.url).searchParams.get('childId'));
  if (!childId.success) return NextResponse.json({ error: 'Missing child.' }, { status: 400 });

  const { data } = await supabase
    .from('stories')
    .select(STORY_COLUMNS)
    .eq('child_id', childId.data)
    .order('created_at', { ascending: false })
    .limit(20)
    .returns<StoryRow[]>();
  return NextResponse.json({ stories: (data ?? []).map(storyFromRow) });
}

const bodySchema = z.object({
  childId: z.string().uuid(),
  theme: z.string().trim().min(2).max(300),
  language: z.enum(STORY_LANGUAGES).default('English'),
});

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Tell us what the story should be about.' }, { status: 400 });
  const { childId, theme, language } = parsed.data;

  const entitlement = await getEntitlement(supabase, user.id);
  const plus = entitlement.plan === 'plus';

  if (!plus && language !== 'English') {
    return NextResponse.json(
      { error: `Stories in ${language} are part of Budding Plus.`, code: 'upgrade_required', entitlement },
      { status: 402 },
    );
  }

  const since = plus ? new Date(Date.now() - 86_400_000).toISOString() : '1970-01-01T00:00:00Z';
  const { count } = await supabase
    .from('stories')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', since);
  const used = count ?? 0;

  if (!plus && used >= FREE_STORIES_LIFETIME) {
    return NextResponse.json(
      { error: 'Make a new story every night with Budding Plus.', code: 'upgrade_required', entitlement },
      { status: 402 },
    );
  }
  if (plus && used >= PLUS_STORIES_PER_DAY) {
    return NextResponse.json({ error: `You've made ${PLUS_STORIES_PER_DAY} stories today. Come back tomorrow night.` }, { status: 429 });
  }

  const { data: childRow } = await supabase.from('children').select(CHILD_COLUMNS).eq('id', childId).maybeSingle<ChildRow>();
  if (!childRow) return NextResponse.json({ error: 'Child not found.' }, { status: 404 });

  try {
    const story = await writeStory({ child: childFromRow(childRow), theme, language });
    const { data: row, error } = await supabase
      .from('stories')
      .insert({ child_id: childId, user_id: user.id, theme, language, title: story.title, body: story.body, moral: story.moral, model: DECODE_MODEL })
      .select(STORY_COLUMNS)
      .single<StoryRow>();
    if (error) throw error;
    return NextResponse.json({ story: storyFromRow(row) });
  } catch (error) {
    console.error('[stories] generation failed', error);
    return NextResponse.json({ error: 'We could not write the story right now. Please try again.' }, { status: 502 });
  }
}
