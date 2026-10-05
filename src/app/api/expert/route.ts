import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSupabase } from '@/lib/supabase-server';
import { STORY_LANGUAGES } from '@/lib/plans';

const bodySchema = z.object({
  concern: z.string().trim().min(5).max(2000),
  phone: z.string().trim().regex(/^\+?[0-9 ()-]{8,20}$/),
  preferredLanguage: z.enum(STORY_LANGUAGES).default('English'),
  preferredTime: z.string().trim().max(100).optional(),
  childId: z.string().uuid().optional(),
  source: z.enum(['menu', 'safety', 'report']).default('menu'),
});

// Concierge expert consultations: saved for the ops team, who call back to schedule and take payment.
export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Add a short description and a phone number we can call.' }, { status: 400 });
  }
  const { concern, phone, preferredLanguage, preferredTime, childId, source } = parsed.data;

  // One open request at a time keeps the queue honest.
  const { count } = await supabase
    .from('expert_requests')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .in('status', ['new', 'contacted']);
  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: 'We already have your request and will call you soon.' }, { status: 409 });
  }

  const { data, error } = await supabase
    .from('expert_requests')
    .insert({
      user_id: user.id,
      child_id: childId ?? null,
      concern,
      phone,
      preferred_language: preferredLanguage,
      preferred_time: preferredTime || null,
      source,
    })
    .select('id')
    .single();
  if (error) {
    console.error('[expert] insert failed', error.message);
    return NextResponse.json({ error: 'We could not send your request. Please try again.' }, { status: 500 });
  }

  await notifyOps({ id: data.id, email: user.email ?? '', phone, concern, preferredLanguage, preferredTime, source });
  return NextResponse.json({ ok: true });
}

async function notifyOps(r: {
  id: string; email: string; phone: string; concern: string;
  preferredLanguage: string; preferredTime?: string; source: string;
}) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.EXPERT_NOTIFY_EMAIL;
  if (!key || !to) return;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || 'Budding <alerts@budding.live>',
        to,
        subject: `${r.source === 'safety' ? '⚠️ Safety-flagged ' : ''}Expert request · ${r.preferredLanguage}`,
        text: [
          `Request ${r.id} (source: ${r.source})`,
          `Parent: ${r.email}`,
          `Phone: ${r.phone}`,
          `Language: ${r.preferredLanguage}`,
          `Preferred time: ${r.preferredTime || '—'}`,
          '',
          r.concern,
        ].join('\n'),
      }),
    });
    if (!res.ok) console.error('[expert] notify failed', res.status, await res.text());
  } catch (error) {
    console.error('[expert] notify failed', error);
  }
}
