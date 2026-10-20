import { requireParentAccess } from '@/lib/access';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const bodySchema = z.object({ outcome: z.enum(['worked', 'partly', 'did_not_work']) });

/** Records "did it work?" and turns it into a what-worked / what-didn't memory. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireParentAccess();
  if (access.response) return access.response;
  const { supabase } = access;

  const id = z.string().uuid().safeParse((await params).id);
  const body = bodySchema.safeParse(await req.json().catch(() => null));
  if (!id.success || !body.success) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  const { data: source, error: readError } = await supabase.from('decodes').select('analysis').eq('id', id.data).maybeSingle();
  if (readError) return NextResponse.json({ error: 'Saved guidance is unavailable. Please retry.' }, { status: 503 });
  if (!source) return NextResponse.json({ error: 'Saved guidance not found.' }, { status: 404 });
  if (source.analysis?.conversation) return NextResponse.json({ error: 'Chat and practice cannot be rated as a real child outcome.' }, { status: 422 });

  const { error } = await supabase.rpc('record_decode_outcome', { p_id: id.data, p_outcome: body.data.outcome });
  if (error) return NextResponse.json({ error: 'Could not save that. Please retry your choice.' }, { status: 503 });
  return NextResponse.json({ ok: true });
}
