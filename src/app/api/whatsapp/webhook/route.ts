import { after } from 'next/server';
import { checkUserConsent } from '@/lib/access';
import { getAdminSupabase } from '@/lib/supabase-admin';
import { getEntitlement } from '@/lib/billing';
import { loadDecodeContext } from '@/lib/decodeContext';
import { decodeBehavior, DECODE_MODEL } from '@/lib/ai/decode';
import { bypassesPaywall, classifySafety, needsReview, safetyNotice } from '@/lib/ai/safety';
import { routeMessage } from '@/lib/ai/router';
import { rememberFromDecode, rememberOutcome } from '@/lib/ai/memory';
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
      await handleMessage(from, body, hasMedia);
    } catch (error) {
      console.error('[whatsapp] handling failed', error);
      await sendWhatsApp(from, 'Sorry, something went wrong on our side. Please try again in a moment.').catch(() => {});
    }
  });

  return new Response(EMPTY_TWIML, { headers: { 'Content-Type': 'text/xml' } });
}

async function handleMessage(from: string, body: string, hasMedia: boolean) {
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
    const { data: rated } = await admin.from('decodes')
      .update({ outcome, outcome_at: new Date().toISOString() })
      .eq('id', last.id)
      .select('id, child_id, scenario, analysis')
      .maybeSingle<{ id: string; child_id: string; scenario: string; analysis: AgentAnalysis | null }>();
    if (rated) {
      await rememberOutcome(admin, { userId, childId: rated.child_id, decodeId: rated.id, scenario: rated.scenario, analysis: rated.analysis, outcome });
    }
    await sendWhatsApp(from, command === '1'
      ? 'Wonderful. I\'ll remember what works. 🌱'
      : 'Thanks for telling me. Next time I\'ll suggest something different.');
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

  // Safety first, for every plan. Urgent help goes out before anything else is generated.
  const safety = await classifySafety(scenario);
  const notice = safetyNotice(safety);
  if (notice && notice.tier >= 2) await sendWhatsApp(from, formatSafety(notice));

  const entitlement = await getEntitlement(admin, userId);
  if (entitlement.used >= entitlement.limit && !bypassesPaywall(safety)) {
    await sendWhatsApp(from, entitlement.plan === 'free'
      ? `You've used your ${entitlement.limit} free decodes this week. Go unlimited with Kahiye Plus: ${SITE}/app`
      : `You've reached today's limit of ${entitlement.limit} decodes. It resets within 24 hours.`);
    return;
  }

  const context = await loadDecodeContext(admin, child.id, userId);
  if (!context) return;

  const route = await routeMessage(scenario, stageBandFor(context.child.age), context.child.name);
  const { analysis } = await decodeBehavior(scenario, context, route);

  const { data: row, error } = await admin.from('decodes').insert({
    child_id: child.id,
    user_id: userId,
    scenario,
    analysis,
    risk_level: safety.level,
    safety_category: safety.category,
    model: DECODE_MODEL,
    channel: 'whatsapp',
  }).select('id').single();
  if (error) throw error;
  await admin.from('whatsapp_links').update({ last_child_id: child.id }).eq('user_id', userId);

  const switchHint = kids.length > 1 && !named
    ? `

_(About ${child.name}. Start with a name to switch, e.g. "${kids.find((k) => k.id !== child.id)?.name}: …")_`
    : '';
  // Tier 2/3 notices were already sent; tier 1 (parent distress) rides along with the answer.
  await sendWhatsApp(from, formatDecode(child.name, analysis, notice && notice.tier === 1 ? notice : null) + switchHint);

  if (needsReview(safety)) {
    await admin.from('safety_events').insert({
      user_id: userId, child_id: child.id, decode_id: row.id, channel: 'whatsapp',
      level: safety.level, category: safety.category, reason: safety.reason,
    });
  }
  await rememberFromDecode(admin, { userId, childId: child.id, childName: child.name, decodeId: row.id, message: scenario });
}
