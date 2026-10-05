import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { getAdminSupabase } from '@/lib/supabase-admin';
import { getEntitlement, getRazorpay, hasAccess, type SubscriptionRow } from '@/lib/billing';

// Cancels at the end of the paid period; access continues until then.
export async function POST() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('status, interval, current_period_end, cancel_at_period_end, razorpay_subscription_id')
    .eq('user_id', user.id)
    .maybeSingle<SubscriptionRow>();
  if (!sub || !hasAccess(sub)) return NextResponse.json({ error: 'No active plan to cancel.' }, { status: 404 });
  if (sub.cancel_at_period_end) return NextResponse.json({ entitlement: await getEntitlement(supabase, user.id) });

  try {
    await getRazorpay().subscriptions.cancel(sub.razorpay_subscription_id, true);
    const { error } = await getAdminSupabase()
      .from('subscriptions')
      .update({ cancel_at_period_end: true, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);
    if (error) throw error;
  } catch (error) {
    console.error('[billing] cancel failed', error);
    return NextResponse.json({ error: 'We could not cancel right now. Please try again.' }, { status: 502 });
  }

  return NextResponse.json({ entitlement: await getEntitlement(supabase, user.id) });
}
