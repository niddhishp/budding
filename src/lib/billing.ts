import 'server-only';
import Razorpay from 'razorpay';
import type { SupabaseClient } from '@supabase/supabase-js';
import { FREE_DECODES_PER_WEEK, PLUS_DECODES_PER_DAY, type BillingInterval, type Entitlement } from '@/lib/plans';

let razorpay: Razorpay | null = null;

export function getRazorpay(): Razorpay {
  if (!razorpay) {
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_id || !key_secret) throw new Error('RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set. See .env.example.');
    razorpay = new Razorpay({ key_id, key_secret });
  }
  return razorpay;
}

export function planIdFor(interval: BillingInterval): string {
  const id = interval === 'monthly' ? process.env.RAZORPAY_PLAN_MONTHLY : process.env.RAZORPAY_PLAN_YEARLY;
  if (!id) throw new Error(`RAZORPAY_PLAN_${interval.toUpperCase()} is not set. See .env.example.`);
  return id;
}

// Only a captured subscription charge grants a bounded paid period.
const ACCESS_STATUSES = new Set(['active', 'pending', 'halted', 'cancelled', 'completed']);

export interface SubscriptionRow {
  status: string;
  interval: BillingInterval;
  current_period_end: string | null;
  paid_through?: string | null;
  cancel_at_period_end: boolean;
  razorpay_subscription_id: string;
}

export function hasAccess(sub: SubscriptionRow | null, now = new Date()): boolean {
  if (!sub) return false;
  return ACCESS_STATUSES.has(sub.status) && !!sub.paid_through && new Date(sub.paid_through) > now;
}

/** Resolve plan and usage for the signed-in parent. `supabase` must be the user-scoped client. */
export async function getEntitlement(supabase: SupabaseClient, userId: string): Promise<Entitlement> {
  const { data: sub, error: subscriptionError } = await supabase
    .from('subscriptions')
    .select('status, interval, current_period_end, paid_through, cancel_at_period_end, razorpay_subscription_id')
    .eq('user_id', userId)
    .maybeSingle<SubscriptionRow>();

  if (subscriptionError) throw new Error('Subscription lookup unavailable');
  const plus = hasAccess(sub);
  const windowMs = plus ? 86_400_000 : 7 * 86_400_000;
  const { count, error: usageError } = await supabase
    .from('decodes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    // Safety never consumes quota: turns with any safety signal, and refinements, are free.
    .eq('safety_category', 'none')
    .is('refines', null)
    .gte('created_at', new Date(Date.now() - windowMs).toISOString());

  if (usageError || count === null) throw new Error('Usage lookup unavailable');
  return {
    canCancel:!!sub&&!sub.cancel_at_period_end&&!['cancelled','completed','expired'].includes(sub.status),
    plan: plus ? 'plus' : 'free',
    used: count ?? 0,
    limit: plus ? PLUS_DECODES_PER_DAY : FREE_DECODES_PER_WEEK,
    window: plus ? 'day' : 'week',
    renewsAt: plus ? sub?.paid_through ?? null : null,
    cancelAtPeriodEnd: plus ? !!sub?.cancel_at_period_end : false,
  };
}

/** Map a Razorpay subscription entity onto our row shape, plus the user id we attached in notes. */
export function rowFromRazorpay(entity: {
  id: string;
  status: string;
  current_end?: number | null;
  notes?: unknown;
}) {
  const notes = (entity.notes && typeof entity.notes === 'object' && !Array.isArray(entity.notes)
    ? entity.notes
    : {}) as Record<string, string | undefined>;
  const interval: BillingInterval = notes.interval === 'yearly' ? 'yearly' : 'monthly';
  return {
    userId: notes.user_id,
    row: {
      status: entity.status,
      razorpay_subscription_id: entity.id,
      current_period_end: entity.current_end ? new Date(entity.current_end * 1000).toISOString() : null,
      interval,
      updated_at: new Date().toISOString(),
    },
  };
}
