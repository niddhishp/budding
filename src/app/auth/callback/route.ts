import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { safeAuthDestination } from '@/lib/auth-flow';

// Email verification/recovery (and previously issued links) exchange PKCE codes.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next');
  const destination = safeAuthDestination(next);

  if (code) {
    const supabase = await getServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${destination}`);
    console.error('[auth] code exchange failed', error.message);
  }
  return NextResponse.redirect(`${origin}/login?error=link&next=${encodeURIComponent(destination)}`);
}
