import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { isSameOrigin } from '@/lib/access-policy';

// Refreshes the Supabase session on every request and gates the app behind sign-in.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('[middleware] Supabase env vars are missing; see .env.example');
    return NextResponse.json({ error: 'Sign-in is temporarily unavailable.' }, { status: 503 });
  }

  // These endpoints authenticate with browser cookies. Signed provider webhooks
  // are excluded by the matcher and retain their own signature verification.
  if (request.nextUrl.pathname.startsWith('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(request.method) && !isSameOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user && (request.nextUrl.pathname.startsWith('/app') || request.nextUrl.pathname.startsWith('/admin'))) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export const config = {
  // Public endpoints (OG images, Razorpay and Twilio webhooks) skip the session round-trip.
  matcher: ['/app/:path*', '/admin/:path*', '/api/((?!og|billing/webhook|whatsapp/webhook|whatsapp/status|email/webhook|cron/delivery|cron/shop).*)', '/auth/:path*'],
};
