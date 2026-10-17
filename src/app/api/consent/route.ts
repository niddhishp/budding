import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { POLICY_VERSION } from '@/lib/consent';
import { isSameOrigin } from '@/lib/access-policy';

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (body?.policyVersion !== POLICY_VERSION || body?.accepted !== true) {
    return NextResponse.json({ error: 'Please review the current privacy notice before continuing.' }, { status: 400 });
  }
  // The database sets the timestamp and writes an immutable receipt atomically.
  const { error } = await supabase.from('consents').upsert({ user_id: user.id, policy_version: POLICY_VERSION });
  if (error) return NextResponse.json({ error: 'Your privacy choice could not be saved. Please try again.' }, { status: 503 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  const { error } = await supabase.from('consents').delete().eq('user_id', user.id);
  if (error) return NextResponse.json({ error: 'Your privacy choice could not be saved. Please try again.' }, { status: 503 });
  return NextResponse.json({ ok: true });
}
