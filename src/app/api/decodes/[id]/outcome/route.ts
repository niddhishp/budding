import { requireParentAccess } from '@/lib/access';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { rememberOutcome } from '@/lib/ai/memory';
import type { AgentAnalysis } from '@/types';

const bodySchema = z.object({ outcome: z.enum(['worked', 'partly', 'did_not_work']) });

/** Records "did it work?" and turns it into a what-worked / what-didn't memory. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireParentAccess();
  if (access.response) return access.response;
  const { supabase, user } = access;

  const id = z.string().uuid().safeParse((await params).id);
  const body = bodySchema.safeParse(await req.json().catch(() => null));
  if (!id.success || !body.success) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });

  // RLS: only the owner's decode is visible and updatable.
  const { data: decode, error } = await supabase
    .from('decodes')
    .update({ outcome: body.data.outcome, outcome_at: new Date().toISOString() })
    .eq('id', id.data)
    .select('id, child_id, scenario, analysis')
    .maybeSingle<{ id: string; child_id: string; scenario: string; analysis: AgentAnalysis | null }>();
  if (error || !decode) return NextResponse.json({ error: 'Could not save that. Please try again.' }, { status: error ? 500 : 404 });

  await rememberOutcome(supabase, {
    userId: user.id,
    childId: decode.child_id,
    decodeId: decode.id,
    scenario: decode.scenario,
    analysis: decode.analysis,
    outcome: body.data.outcome,
  });
  return NextResponse.json({ ok: true });
}
