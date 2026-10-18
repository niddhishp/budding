import { NextResponse } from 'next/server';
import { z } from 'zod';
import { validatePaymentVerification } from 'razorpay/dist/utils/razorpay-utils';
import { getServerSupabase } from '@/lib/supabase-server';
import { getAdminSupabase } from '@/lib/supabase-admin';
import { getEntitlement } from '@/lib/billing';

const bodySchema = z.object({
  razorpay_payment_id: z.string().min(1).max(100),
  razorpay_subscription_id: z.string().min(1).max(100),
  razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/i),
});

// Checkout verifies ownership/signature; only a captured-charge webhook grants access.
export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payment confirmation.' }, { status: 400 });
  const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = parsed.data;

  if(!process.env.RAZORPAY_KEY_SECRET)return NextResponse.json({error:'Payment verification is unavailable.'},{status:503});
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

  // The signed subscription.charged receipt grants access; a mandate alone does not.
  return NextResponse.json({ entitlement: await getEntitlement(supabase, user.id) });
}
