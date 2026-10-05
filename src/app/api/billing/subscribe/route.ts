import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSupabase } from '@/lib/supabase-server';
import { getAdminSupabase } from '@/lib/supabase-admin';
import { getEntitlement, getRazorpay, planIdFor } from '@/lib/billing';

const bodySchema = z.object({ interval: z.enum(['monthly', 'yearly']) });

// Creates a Razorpay subscription; the client then opens Checkout with the returned id.
export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Choose monthly or yearly.' }, { status: 400 });
  const { interval } = parsed.data;

  const entitlement = await getEntitlement(supabase, user.id);
  if (entitlement.plan === 'plus') return NextResponse.json({ error: 'You already have Kahiye Plus.' }, { status: 409 });

  try {
    const subscription = await getRazorpay().subscriptions.create({
      plan_id: planIdFor(interval),
      // Razorpay requires a finite cycle count: 10 years either way.
      total_count: interval === 'monthly' ? 120 : 10,
      customer_notify: 1,
      notes: { user_id: user.id, interval },
    });

    const { error } = await getAdminSupabase().from('subscriptions').upsert({
      user_id: user.id,
      interval,
      status: subscription.status,
      razorpay_subscription_id: subscription.id,
      current_period_end: null,
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;

    return NextResponse.json({
      subscriptionId: subscription.id,
      keyId: process.env.RAZORPAY_KEY_ID,
      email: user.email,
    });
  } catch (error) {
    console.error('[billing] subscribe failed', error);
    return NextResponse.json({ error: 'We could not start checkout. Please try again.' }, { status: 502 });
  }
}
