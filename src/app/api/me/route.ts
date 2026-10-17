import { processGuidanceJob } from '@/lib/guidance-jobs';
import { after, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { getEntitlement } from '@/lib/billing';

export async function GET() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  try {
    const entitlement = await getEntitlement(supabase, user.id);
    // Retry a durable pending job on return, in addition to the initial completion hook.
    after(() => processGuidanceJob(user.id));
    return NextResponse.json({ entitlement });
  } catch {
    return NextResponse.json({ error: 'We could not load your allowance. Please try again.' }, { status: 503 });
  }
}
