import { requireParentAccess } from '@/lib/access';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminSupabase } from '@/lib/supabase-admin';
import { getEntitlement, getRazorpay, planIdFor } from '@/lib/billing';
import { launchStatus } from '@/lib/launch';
import { checkPaymentPlan } from '@/lib/payment-checks';

const bodySchema = z.object({ interval: z.enum(['monthly', 'yearly']) });

// Creates a Razorpay subscription; the client then opens Checkout with the returned id.
export async function POST(req: Request) {
  const access = await requireParentAccess();
  if (access.response) return access.response;
  const { supabase, user } = access;
  if(!launchStatus().billing)return NextResponse.json({error:'Paid plans are not open yet. You can continue using Kahiye Free.'},{status:503});

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Choose monthly or yearly.' }, { status: 400 });
  const { interval } = parsed.data;

  const entitlement = await getEntitlement(supabase, user.id);
  if (entitlement.plan === 'plus') return NextResponse.json({ error: 'You already have Kahiye Plus.' }, { status: 409 });

  try {
    await checkPaymentPlan(interval);
    const admin=getAdminSupabase();
    const {data:reservation,error:reservationError}=await admin.rpc('reserve_billing_checkout',{target:user.id});
    if(reservationError)throw reservationError;
    if(reservation.state==='review')return NextResponse.json({error:'An earlier checkout needs verification. Contact support before starting another payment.'},{status:409});
    if(reservation.state==='existing'){
      if(reservation.interval===interval&&['created','authenticated'].includes(reservation.status))return NextResponse.json({subscriptionId:reservation.id,keyId:process.env.RAZORPAY_KEY_ID,email:user.email});
      return NextResponse.json({error:'An existing subscription needs attention. Cancel it or contact support before starting another.'},{status:409});
    }
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
      paid_through:null,event_created_at:0,event_priority:0,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    const released=await admin.from('billing_checkout_attempts').delete().eq('user_id',user.id).eq('token',reservation.token);
    if(released.error)throw released.error;

    return NextResponse.json({
      subscriptionId: subscription.id,
      keyId: process.env.RAZORPAY_KEY_ID,
      email: user.email,
    });
  } catch (error) {
    console.error('[billing] subscribe failed', { name: error instanceof Error ? error.name : 'unknown' });
    return NextResponse.json({ error: 'We could not start checkout. Please try again.' }, { status: 502 });
  }
}
