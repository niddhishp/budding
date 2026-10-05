import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

// Magic-link landing: exchange the one-time code for a session cookie, then continue into the app.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next');
  const destination = next && next.startsWith('/') && !next.startsWith('//') ? next : '/app';

  if (code) {
    const supabase = await getServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${destination}`);
    console.error('[auth] code exchange failed', error.message);
  }
  return NextResponse.redirect(`${origin}/login?error=link`);
}
