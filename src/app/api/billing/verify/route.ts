import { NextResponse } from 'next/server';
import { z } from 'zod';
import { validatePaymentVerification } from 'razorpay/dist/utils/razorpay-utils';
import { getServerSupabase } from '@/lib/supabase-server';
import { getAdminSupabase } from '@/lib/supabase-admin';
import { getEntitlement, getRazorpay, rowFromRazorpay } from '@/lib/billing';

const bodySchema = z.object({
  razorpay_payment_id: z.string().min(1),
  razorpay_subscription_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

// Called by Checkout's success handler. Grants access immediately; the webhook keeps it in sync afterwards.
export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payment confirmation.' }, { status: 400 });
  const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = parsed.data;

  const valid = validatePaymentVerification(
    { subscription_id: razorpay_subscription_id, payment_id: razorpay_payment_id },
    razorpay_signature,
    process.env.RAZORPAY_KEY_SECRET!,
  );
  if (!valid) return NextResponse.json({ error: 'Payment could not be verified.' }, { status: 400 });

  const admin = getAdminSupabase();
  const { data: owned } = await admin
    .from('subscriptions')
    .select('user_id')
    .eq('razorpay_subscription_id', razorpay_subscription_id)
    .maybeSingle();
  if (owned?.user_id !== user.id) return NextResponse.json({ error: 'Subscription not found.' }, { status: 404 });

  try {
    const subscription = await getRazorpay().subscriptions.fetch(razorpay_subscription_id);
    const { row } = rowFromRazorpay(subscription);
    const { error } = await admin.from('subscriptions').update(row).eq('user_id', user.id);
    if (error) throw error;
  } catch (error) {
    console.error('[billing] verify sync failed', error);
    return NextResponse.json({ error: 'Payment received, but we could not activate Plus yet. It will activate within a few minutes.' }, { status: 502 });
  }

  return NextResponse.json({ entitlement: await getEntitlement(supabase, user.id) });
}
