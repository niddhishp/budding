import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireParentAccess } from '@/lib/access';
import { MEMORY_COLUMNS, memoryFromRow, type MemoryRow } from '@/lib/mappers';
import { memoryCreateSchema, memoryExpiry } from '@/lib/memory-controls';

const querySchema = z.object({ childId: z.string().uuid(), offset: z.coerce.number().int().min(0).max(100000).default(0) });
export async function GET(req: Request) {
  const access = await requireParentAccess();
  if (access.response) return access.response;
  const query = querySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!query.success) return NextResponse.json({ error: 'Choose a child.' }, { status: 400 });
  const { childId, offset } = query.data;
  const { data: child, error: childError } = await access.supabase.from('children').select('id,memory_enabled').eq('id', childId).eq('user_id', access.user.id).maybeSingle();
  if (childError) return NextResponse.json({ error: 'Could not load memory settings. Try again.' }, { status: 503 });
  if (!child) return NextResponse.json({ error: 'Child unavailable.' }, { status: 404 });
  const { data, error } = await access.supabase.from('memories').select(MEMORY_COLUMNS).eq('child_id', childId).eq('user_id', access.user.id).order('created_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + 49).returns<MemoryRow[]>();
  if (error) return NextResponse.json({ error: 'Could not load memories. Your saved entries are unchanged.' }, { status: 503 });
  return NextResponse.json({ memories: (data ?? []).map(memoryFromRow), enabled: child.memory_enabled, nextOffset: data?.length === 50 ? offset + 50 : null });
}
export async function POST(req: Request) {
  const access = await requireParentAccess();
  if (access.response) return access.response;
  const parsed = memoryCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Add a note of up to 500 characters and choose its privacy and review date.' }, { status: 400 });
  const { id, childId, content, sensitive, retention } = parsed.data;
  const { data, error } = await access.supabase.from('memories').insert({ id, child_id: childId, user_id: access.user.id, kind: 'fact', content, sensitive, source: 'parent_said', confidence: 1, confirmed_at: new Date().toISOString(), expires_at: memoryExpiry(retention) }).select(MEMORY_COLUMNS).single<MemoryRow>();
  if (!error) return NextResponse.json({ memory: memoryFromRow(data) });
  if (error.code === '23505') {
    const existing = await access.supabase.from('memories').select(MEMORY_COLUMNS).eq('id', id).eq('child_id', childId).eq('user_id', access.user.id).maybeSingle<MemoryRow>();
    if (!existing.error && existing.data?.content === content && existing.data.sensitive === sensitive) return NextResponse.json({ memory: memoryFromRow(existing.data) });
  }
  return NextResponse.json({ error: 'Could not confirm the save. Your note is still here; try again.' }, { status: 503 });
}
export async function PATCH(req: Request) {
  const access = await requireParentAccess();
  if (access.response) return access.response;
  const parsed = z.object({ childId: z.string().uuid(), enabled: z.boolean() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Choose a child and memory setting.' }, { status: 400 });
  const { data, error } = await access.supabase.from('children').update({ memory_enabled: parsed.data.enabled }).eq('id', parsed.data.childId).eq('user_id', access.user.id).select('id,memory_enabled').maybeSingle();
  if (error || !data) return NextResponse.json({ error: 'Memory setting was not saved. Try again.' }, { status: 503 });
  return NextResponse.json({ enabled: data.memory_enabled });
}
