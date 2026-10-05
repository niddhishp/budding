import { NextResponse } from 'next/server';
import { validateWebhookSignature } from 'razorpay/dist/utils/razorpay-utils';
import { getAdminSupabase } from '@/lib/supabase-admin';
import { rowFromRazorpay } from '@/lib/billing';

// Razorpay → Dashboard → Webhooks: point at /api/billing/webhook with the subscription.* events
// and the secret in RAZORPAY_WEBHOOK_SECRET. Handlers are idempotent: each event overwrites
// the row with the subscription's current state.
export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get('x-razorpay-signature') ?? '';
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[billing] RAZORPAY_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'not configured' }, { status: 500 });
  }
  if (!signature || !validateWebhookSignature(raw, signature, secret)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  const event = JSON.parse(raw) as {
    event: string;
    payload?: { subscription?: { entity: Parameters<typeof rowFromRazorpay>[0] } };
  };
  const entity = event.payload?.subscription?.entity;
  if (!event.event.startsWith('subscription.') || !entity) return NextResponse.json({ ok: true });

  const { userId, row } = rowFromRazorpay(entity);
  const update = {
    ...row,
    ...(event.event === 'subscription.cancelled' ? { cancel_at_period_end: true } : {}),
  };

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('subscriptions')
    .update(update)
    .eq('razorpay_subscription_id', entity.id)
    .select('user_id');

  if (error) {
    console.error('[billing] webhook update failed', event.event, error.message);
    return NextResponse.json({ error: 'update failed' }, { status: 500 }); // Razorpay retries
  }

  // Row missing (e.g. created outside the app): recreate it from the notes we attached at checkout.
  if (!data?.length && userId) {
    const { error: insertError } = await admin.from('subscriptions').upsert({ user_id: userId, ...update });
    if (insertError) {
      console.error('[billing] webhook upsert failed', insertError.message);
      return NextResponse.json({ error: 'upsert failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
