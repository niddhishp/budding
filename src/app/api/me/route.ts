import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { getEntitlement } from '@/lib/billing';

export async function GET() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  return NextResponse.json({ entitlement: await getEntitlement(supabase, user.id) });
}
