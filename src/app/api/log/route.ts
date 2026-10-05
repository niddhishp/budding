import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSupabase } from '@/lib/supabase-server';

const bodySchema = z.object({
  childId: z.string().uuid(),
  content: z.string().trim().min(1).max(2000),
  logType: z.enum(['struggle', 'milestone', 'observation', 'routine']).default('observation'),
});

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Write a short note (up to 2000 characters).' }, { status: 400 });

  const { childId, content, logType } = parsed.data;
  const { error } = await supabase
    .from('context_logs')
    .insert({ child_id: childId, user_id: user.id, content, log_type: logType });

  if (error) {
    console.error('[log] insert failed', error.message);
    return NextResponse.json({ error: 'Could not save this note. Please try again.' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
