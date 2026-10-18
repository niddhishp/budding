import { processConsultationAlert } from '@/lib/consultation-delivery';
import { requireParentAccess } from '@/lib/access';
import { NextResponse, after } from 'next/server';
import { z } from 'zod';
import { STORY_LANGUAGES } from '@/lib/plans';
import { getServerSupabase } from '@/lib/supabase-server';

// Parents may read their request status even after withdrawing processing consent.
export async function GET() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  const { data, error } = await supabase.from('expert_requests').select('id,status,scheduled_at,created_at')
    .eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) return NextResponse.json({ error: 'Could not load your request.' }, { status: 503 });
  return NextResponse.json({ request: data }, { headers: { 'Cache-Control': 'private, no-store' } });
}

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
  const access = await requireParentAccess();
  if (access.response) return access.response;
  const { supabase, user } = access;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Add a short description and a phone number we can call.' }, { status: 400 });
  }
  const { concern, phone, preferredLanguage, preferredTime, childId, source } = parsed.data;

  if (childId) {
    const { data: child, error } = await supabase.from('children').select('id').eq('id', childId).eq('user_id', user.id).maybeSingle();
    if (error) return NextResponse.json({ error: 'Could not check the child profile. Please try again.' }, { status: 503 });
    if (!child) return NextResponse.json({ error: 'Child profile not found.' }, { status: 404 });
  }

  // One open request at a time keeps the queue honest.
  const { count, error: countError } = await supabase
    .from('expert_requests')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .in('status', ['new', 'contacted', 'scheduled']);
  if (countError) return NextResponse.json({ error: 'Could not check your existing request. Please retry.' }, { status: 503 });
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
    if (error.code === '23505') return NextResponse.json({ error: 'We already have your request.' }, { status: 409 });
    console.error('[expert] insert failed', error.message);
    return NextResponse.json({ error: 'We could not send your request. Please try again.' }, { status: 500 });
  }

  after(async () => {
    try { await processConsultationAlert(data.id); }
    catch { console.warn('[consultation] operations alert pending review'); }
  });
  return NextResponse.json({ ok: true });
}
