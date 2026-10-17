import { completeGuidance, failGuidance, guidanceErrorResponse, reserveGuidance, type Reservation } from '@/lib/guidance';
import { classifySafety, guidancePath } from '@/lib/ai/safety';
import { requireParentAccess } from '@/lib/access';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getEntitlement } from '@/lib/billing';
import { DECODE_MODEL } from '@/lib/ai/decode';
import { writeStory } from '@/lib/ai/story';
import { CHILD_COLUMNS, childFromRow, STORY_COLUMNS, storyFromRow, type ChildRow, type StoryRow } from '@/lib/mappers';
import { STORY_LANGUAGES } from '@/lib/plans';

export const maxDuration = 60;

export async function GET(req: Request) {
  const access = await requireParentAccess();
  if (access.response) return access.response;
  const { supabase } = access;

  const childId = z.string().uuid().safeParse(new URL(req.url).searchParams.get('childId'));
  if (!childId.success) return NextResponse.json({ error: 'Missing child.' }, { status: 400 });

  const { data, error } = await supabase
    .from('stories')
    .select(STORY_COLUMNS)
    .eq('child_id', childId.data)
    .order('created_at', { ascending: false })
    .limit(20)
    .returns<StoryRow[]>();
  if (error) return NextResponse.json({ error: 'Saved stories are unavailable. Please retry.' }, { status: 503 });
  return NextResponse.json({ stories: (data ?? []).map(storyFromRow) });
}

const bodySchema = z.object({
  childId: z.string().uuid(), requestId: z.string().uuid().optional(),
  theme: z.string().trim().min(2).max(300),
  language: z.enum(STORY_LANGUAGES).default('English'),
});

export async function POST(req: Request) {
  const access = await requireParentAccess();
  if (access.response) return access.response;
  const { supabase, user } = access;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Tell us what the story should be about.' }, { status: 400 });
  const { childId, theme, language } = parsed.data;

  let reservation: Reservation | undefined;
  try {
    const signal = AbortSignal.any([req.signal, AbortSignal.timeout(54_000)]);
    const safety = await classifySafety(theme, signal);
    if (guidancePath(safety) !== 'ordinary') return NextResponse.json({ error: 'A bedtime story is not the right support for this situation. Open Immediate support, or describe the moment in Ask for help.', code: 'support_required' }, { status: 422 });
    const entitlement = await getEntitlement(supabase, user.id);
    if (entitlement.plan !== 'plus' && language !== 'English') return NextResponse.json({ error: 'Stories in this language are part of Kahiye Plus.', code: 'upgrade_required', entitlement }, { status: 402 });
    reservation = await reserveGuidance({ id: parsed.data.requestId ?? crypto.randomUUID(), userId: user.id, childId, kind: 'story', content: { theme, language } });
    let resultId = reservation.resultId;
    if (!reservation.complete) {
      const { data: childRow, error } = await supabase.from('children').select(CHILD_COLUMNS).eq('id', childId).single<ChildRow>();
      if (error || !childRow) throw new Error('Child unavailable');
      const story = await writeStory({ child: childFromRow(childRow), theme, language, signal });
      signal.throwIfAborted();
      resultId = (await completeGuidance(reservation, { theme, language, ...story, model: DECODE_MODEL })) ?? undefined;
    }
    const { data: row, error } = await supabase.from('stories').select(STORY_COLUMNS).eq('id', resultId!).eq('child_id', childId).single<StoryRow>();
    if (error) throw new Error('Saved story unavailable');
    return NextResponse.json({ story: storyFromRow(row) });
  } catch (error) { await failGuidance(reservation).catch(() => undefined); return guidanceErrorResponse(error); }
}
