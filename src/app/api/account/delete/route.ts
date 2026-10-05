import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { getAdminSupabase } from '@/lib/supabase-admin';
import { getRazorpay, hasAccess, type SubscriptionRow } from '@/lib/billing';

// Right to erasure: cancels any running subscription, then deletes the auth user.
// Every Budding table references auth.users with ON DELETE CASCADE, so all
// children, logs, decodes, consents and subscription rows go with it.
export async function POST() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('status, interval, current_period_end, cancel_at_period_end, razorpay_subscription_id')
    .eq('user_id', user.id)
    .maybeSingle<SubscriptionRow>();

  if (sub && hasAccess(sub) && sub.status !== 'cancelled') {
    try {
      await getRazorpay().subscriptions.cancel(sub.razorpay_subscription_id, false);
    } catch (error) {
      console.error('[account] could not cancel subscription before delete', error);
      return NextResponse.json(
        { error: 'We could not cancel your subscription, so nothing was deleted. Please try again or contact support.' },
        { status: 502 },
      );
    }
  }

  const admin = getAdminSupabase();

  // Storage objects don't cascade with the database; remove narration audio explicitly.
  const { data: audioFiles } = await admin.storage.from('story-audio').list(user.id, { limit: 1000 });
  if (audioFiles?.length) {
    const { error: storageError } = await admin.storage
      .from('story-audio')
      .remove(audioFiles.map((f) => `${user.id}/${f.name}`));
    if (storageError) console.error('[account] audio cleanup failed', storageError.message);
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error('[account] delete failed', error.message);
    return NextResponse.json({ error: 'We could not delete your account. Please try again.' }, { status: 500 });
  }

  await supabase.auth.signOut();
  return NextResponse.json({ deleted: true });
}
