import { NextResponse } from 'next/server';
import { randomInt } from 'node:crypto';
import { getServerSupabase } from '@/lib/supabase-server';
import { getAdminSupabase } from '@/lib/supabase-admin';

const CODE_TTL_MS = 15 * 60_000;

/** Link status for the signed-in parent. */
export async function GET() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });

  const { data } = await supabase.from('whatsapp_links').select('phone').eq('user_id', user.id).maybeSingle();
  return NextResponse.json({ phone: data?.phone ?? null, number: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? null });
}

/** Issue a one-time code; the parent sends "LINK <code>" from WhatsApp to prove the number is theirs. */
export async function POST() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });

  const admin = getAdminSupabase();
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = String(randomInt(100000, 1000000));
    const { error } = await admin.from('whatsapp_link_codes').upsert({
      user_id: user.id,
      code,
      expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
    });
    if (!error) return NextResponse.json({ code, number: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? null });
    if (error.code !== '23505') {
      console.error('[whatsapp] code issue failed', error.message);
      break;
    }
    // 23505 = code collision with another parent's live code; draw again.
  }
  return NextResponse.json({ error: 'Could not create a code. Please try again.' }, { status: 500 });
}

export async function DELETE() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });

  const { error } = await supabase.from('whatsapp_links').delete().eq('user_id', user.id);
  if (error) return NextResponse.json({ error: 'Could not disconnect. Please try again.' }, { status: 500 });
  return NextResponse.json({ phone: null });
}
