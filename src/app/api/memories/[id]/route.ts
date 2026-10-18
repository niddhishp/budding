import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireParentAccess } from '@/lib/access';
import { MEMORY_COLUMNS, memoryFromRow, type MemoryRow } from '@/lib/mappers';
import { memoryExpiry, memoryUpdateSchema } from '@/lib/memory-controls';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireParentAccess();
  if (access.response) return access.response;
  const id = z.string().uuid().safeParse((await params).id);
  const parsed = memoryUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!id.success || !parsed.success) return NextResponse.json({ error: 'Check the memory details and try again.' }, { status: 400 });
  const { childId, revision, action, content, sensitive, retention } = parsed.data;
  const updates = action === 'archive' ? { archived: true } : action === 'restore' ? { archived: false } : {
    ...(action === 'edit' ? { content, edited_at: new Date().toISOString() } : {}),
    sensitive, confirmed_at: new Date().toISOString(), expires_at: memoryExpiry(retention!),
  };
  const { data, error } = await access.supabase.from('memories').update(updates).eq('id', id.data).eq('child_id', childId).eq('user_id', access.user.id).eq('revision', revision).select(MEMORY_COLUMNS).maybeSingle<MemoryRow>();
  if (error) return NextResponse.json({ error: 'This change was not confirmed saved. Try again.' }, { status: 503 });
  if (!data) return NextResponse.json({ error: 'This memory changed or is no longer available. Reload memories before editing again.' }, { status: 409 });
  return NextResponse.json({ memory: memoryFromRow(data) });
}
