import { requireParentAccess } from '@/lib/access';
import { proposeLogMemories } from '@/lib/log-memories';
import { NextResponse, after } from 'next/server';
import { z } from 'zod';

const bodySchema = z.object({
  childId: z.string().uuid(),
  content: z.string().trim().min(1).max(2000),
  logType: z.enum(['struggle', 'milestone', 'observation', 'routine']).default('observation'),
});

export async function POST(req: Request) {
  const access = await requireParentAccess();
  if (access.response) return access.response;
  const { supabase, user } = access;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Write a short note (up to 2000 characters).' }, { status: 400 });

  const { childId, content, logType } = parsed.data;
  const { data: saved, error } = await supabase
    .from('context_logs')
    .insert({ child_id: childId, user_id: user.id, content, log_type: logType })
    .select('id')
    .single<{ id: string }>();

  // RLS refuses a note for a child this parent does not own (SQLSTATE 42501).
  if (error?.code === '42501') return NextResponse.json({ error: 'Child not found.' }, { status: 404 });
  if (error || !saved) {
    console.error('[log] insert failed', error?.message);
    return NextResponse.json({ error: 'Could not save this note. Please try again.' }, { status: 500 });
  }
  // The note feeds the weekly report directly. For guidance it only ever produces suggestions the parent reviews.
  after(() => proposeLogMemories({ userId: user.id, logId: saved.id, childId }));
  return NextResponse.json({ success: true, id: saved.id });
}
