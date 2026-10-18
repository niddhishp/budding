import { createHash } from 'node:crypto';
import { launchStatus } from '@/lib/launch';
import { after } from 'next/server';
import { checkUserConsent } from '@/lib/access';
import { getAdminSupabase } from '@/lib/supabase-admin';
import { reserveGuidance, completeGuidance, failGuidance, GuidanceRequestError } from '@/lib/guidance';
import { processGuidanceJob } from '@/lib/guidance-jobs';
import { loadDecodeContext } from '@/lib/decodeContext';
import { decodeBehavior, DECODE_MODEL } from '@/lib/ai/decode';
import { classifySafety, guidancePath, needsReview, safetyNotice } from '@/lib/ai/safety';
import { routeMessage } from '@/lib/ai/router';
import { stageBandFor } from '@/lib/ai/doctrine/stages';
import type { AgentAnalysis } from '@/types';
import { formatDecode, formatSafety, isValidTwilioRequest, sendWhatsApp, WHATSAPP_HELP } from '@/lib/whatsapp';

export const maxDuration = 60;

const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.kahiye.app').replace(/\/$/, '');
const OUTCOMES = { '1': 'worked', '2': 'partly', '3': 'did_not_work' } as const;

/**
 * Twilio → Kahiye. Twilio waits at most 15 s, while a decode can take longer, so we
 * acknowledge with empty TwiML at once and reply through the REST API from `after()`.
 */
export async function POST(req: Request) {
  if(!launchStatus().whatsapp)return new Response('Channel not enabled',{status:503});
  const form = await req.formData();
  const params = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));

  if (!isValidTwilioRequest(req.headers.get('x-twilio-signature') ?? '', params)) {
    return new Response('invalid signature', { status: 403 });
  }

  const from = params.From ?? '';
  const body = (params.Body ?? '').trim();
  const hasMedia = Number(params.NumMedia ?? 0) > 0;

  after(async () => {
    try {
      await handleMessage(from, body, hasMedia, params.MessageSid ?? '');
    } catch (error) {
      console.error('[whatsapp] handling failed', { name: error instanceof Error ? error.name : 'unknown' });
      await sendWhatsApp(from, 'Sorry, something went wrong on our side. Please try again in a moment.').catch(() => {});
    }
  });

  return new Response(EMPTY_TWIML, { headers: { 'Content-Type': 'text/xml' } });
}

async function handleMessage(from: string, body: string, hasMedia: boolean, messageId: string) {
  const phone = from.replace(/^whatsapp:/, '');
  const admin = getAdminSupabase();
  const command = body.toUpperCase();

  // ── Linking ────────────────────────────────────────────────────────────────
  const linkMatch = command.match(/^LINK\s*(\d{6})$/);
  if (linkMatch) {
    const { data: code } = await admin
      .from('whatsapp_link_codes')
      .select('user_id, expires_at')
      .eq('code', linkMatch[1])
      .maybeSingle();
    if (!code || new Date(code.expires_at) < new Date()) {
      await sendWhatsApp(from, `That code has expired. Open ${SITE}/app → menu → *Connect WhatsApp* for a new one.`);
      return;
    }
    if (!await checkUserConsent(admin, code.user_id)) {
      await sendWhatsApp(from, `Please review the current privacy notice at ${SITE}/app before connecting WhatsApp.`);
      return;
    }
    // A number belongs to one account: move it if it was linked elsewhere.
    await admin.from('whatsapp_links').delete().eq('phone', phone);
    const { error } = await admin.from('whatsapp_links').upsert({ user_id: code.user_id, phone, linked_at: new Date().toISOString() });
    if (error) throw error;
    await admin.from('whatsapp_link_codes').delete().eq('user_id', code.user_id);

    const { data: kids } = await admin.from('children').select('name').eq('user_id', code.user_id);
    const names = (kids ?? []).map((k) => k.name).join(', ');
    await sendWhatsApp(from, `✅ Connected${names ? ` for ${names}` : ''}.\n\n${WHATSAPP_HELP}`);
    return;
  }

  const { data: link } = await admin
    .from('whatsapp_links')
    .select('user_id, last_child_id')
    .eq('phone', phone)
    .maybeSingle();

  if (!link) {
    await sendWhatsApp(from, `Hi! I'm Kahiye 🌱 To use me here, open ${SITE}/app, tap your profile menu → *Connect WhatsApp*, and send the code it shows.`);
    return;
  }
  const userId: string = link.user_id;

  // ── Commands ───────────────────────────────────────────────────────────────
  if (command === 'STOP' || command === 'UNLINK') {
    await admin.from('whatsapp_links').delete().eq('user_id', userId);
    await sendWhatsApp(from, 'Disconnected. You can reconnect anytime from the app.');
    return;
  }
  if (command === 'HELP' || command === 'HI' || command === 'HELLO') {
    await sendWhatsApp(from, WHATSAPP_HELP);
    return;
  }
  if (!await checkUserConsent(admin, userId)) {
    await sendWhatsApp(from, `Please review the current privacy notice at ${SITE}/app before continuing. You can still send STOP to disconnect.`);
    return;
  }
  if (command in OUTCOMES) {
    const { data: last } = await admin
      .from('decodes')
      .select('id')
      .eq('user_id', userId)
      .eq('channel', 'whatsapp')
      .eq('child_id', link.last_child_id ?? '00000000-0000-0000-0000-000000000000')
      .is('outcome', null)
      .gte('created_at', new Date(Date.now() - 2 * 86_400_000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!last) {
      await sendWhatsApp(from, 'Thanks! There\'s no recent suggestion waiting for feedback.');
      return;
    }
    const outcome = OUTCOMES[command as keyof typeof OUTCOMES];
    const { error } = await admin.from('decodes')
      .update({ outcome, outcome_at: new Date().toISOString() })
      .eq('id', last.id).eq('user_id', userId);
    if (error) throw error;
    await sendWhatsApp(from, 'Thank you. Your feedback has been saved.');
    return;
  }
  if (!body) {
    await sendWhatsApp(from, hasMedia
      ? 'I can\'t read voice notes or photos yet. Please type what happened in a sentence or two.'
      : WHATSAPP_HELP);
    return;
  }
  if (body.length < 3 || body.length > 2000) {
    await sendWhatsApp(from, 'Please describe what happened in a sentence or two.');
    return;
  }

  // ── Decode ─────────────────────────────────────────────────────────────────
  const { data: kids } = await admin
    .from('children')
    .select('id, name')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (!kids?.length) {
    await sendWhatsApp(from, `Add your child's profile first at ${SITE}/app, then message me here.`);
    return;
  }

  // "Aarav: …" / "Aarav, …" picks a child; otherwise the last child discussed, else the first.
  let scenario = body;
  let child = kids.find((k) => k.id === link.last_child_id) ?? kids[0];
  const prefix = body.match(/^([^:,\n]{1,40})[:,]\s*([\s\S]+)$/);
  const named = prefix && kids.find((k) => k.name.toLowerCase() === prefix[1].trim().toLowerCase());
  if (named && prefix) {
    child = named;
    scenario = prefix[2].trim();
  }

  // Support is terminal: never follow urgent or uncertain triage with generated advice.
  const signal = AbortSignal.timeout(45_000);
  const safety = await classifySafety(scenario, signal);
  const notice = safetyNotice(safety);
  if (guidancePath(safety) !== 'ordinary') {
    await sendWhatsApp(from, (notice ? formatSafety(notice) : 'I could not safely check this message. Please try again later.') + `\n\nImmediate support: ${SITE}/help-now`);
    if (needsReview(safety)) {
      const { error } = await admin.from('safety_events').insert({ user_id: userId, child_id: child.id, channel: 'whatsapp', level: safety.level, category: safety.category, reason: 'Support route selected by safety triage.' });
      if (error) console.error('[whatsapp] safety event save failed');
    }
    return;
  }
  if (!messageId) throw new Error('Missing message identity');
  const hash = createHash('sha256').update(`whatsapp:${userId}:${messageId}`).digest('hex');
  const id = `${hash.slice(0,8)}-${hash.slice(8,12)}-${hash.slice(12,16)}-${hash.slice(16,20)}-${hash.slice(20,32)}`;
  let reservation;
  try {
    reservation = await reserveGuidance({ id, userId, childId: child.id, kind: 'decode', content: { scenario, channel: 'whatsapp' }, free: safety.category !== 'none' });
    let analysis: AgentAnalysis;
    if (reservation.complete) {
      // Twilio delivery retries must not regenerate or consume another allowance.
      const { data, error } = await admin.from('decodes').select('analysis').eq('id', reservation.resultId!).eq('user_id', userId).single();
      if (error || !data) throw new Error('Saved guidance unavailable');
      analysis = data.analysis as AgentAnalysis;
    } else {
      const context = await loadDecodeContext(admin, child.id, userId);
      if (!context) throw new Error('Child unavailable');
      const route = await routeMessage(scenario, stageBandFor(context.child.age), context.child.name, signal);
      ({ analysis } = await decodeBehavior(scenario, context, route, undefined, signal));
      signal.throwIfAborted();
      await completeGuidance(reservation, { scenario, analysis, risk_level: safety.level, safety_category: safety.category, model: DECODE_MODEL, channel: 'whatsapp' });
    }
    const { error } = await admin.from('whatsapp_links').update({ last_child_id: child.id }).eq('user_id', userId);
    if (error) throw error;
    const switchHint = kids.length > 1 && !named ? `\n\n_(About ${child.name}. Start with a child's name to switch.)_` : '';
    await sendWhatsApp(from, formatDecode(child.name, analysis, notice) + switchHint);
    await processGuidanceJob(userId);
  } catch (error) {
    await failGuidance(reservation);
    if (error instanceof GuidanceRequestError) {
      await sendWhatsApp(from, error.message + `\n\nImmediate support: ${SITE}/help-now`);
      return;
    }
    throw error;
  }
}
