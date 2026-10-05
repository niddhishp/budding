import { after } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-admin';
import { getEntitlement } from '@/lib/billing';
import { loadDecodeContext } from '@/lib/decodeContext';
import { classifySafety, decodeBehavior, DECODE_MODEL, safetyNotice } from '@/lib/ai/decode';
import { formatDecode, isValidTwilioRequest, sendWhatsApp, WHATSAPP_HELP } from '@/lib/whatsapp';

export const maxDuration = 60;

const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://budding.live').replace(/\/$/, '');
const OUTCOMES = { '1': 'worked', '2': 'partly', '3': 'did_not_work' } as const;

/**
 * Twilio → Budding. Twilio waits at most 15 s, while a decode can take longer, so we
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
    await sendWhatsApp(from, `Hi! I'm Budding 🌱 To use me here, open ${SITE}/app, tap your profile menu → *Connect WhatsApp*, and send the code it shows.`);
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
    await admin.from('decodes')
      .update({ outcome: OUTCOMES[command as keyof typeof OUTCOMES], outcome_at: new Date().toISOString() })
      .eq('id', last.id);
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

  const entitlement = await getEntitlement(admin, userId);
  if (entitlement.used >= entitlement.limit) {
    await sendWhatsApp(from, entitlement.plan === 'free'
      ? `You've used your ${entitlement.limit} free decodes this week. Go unlimited with Budding Plus: ${SITE}/app`
      : `You've reached today's limit of ${entitlement.limit} decodes. It resets within 24 hours.`);
    return;
  }

  const context = await loadDecodeContext(admin, child.id, userId);
  if (!context) return;

  const [safety, analysis] = await Promise.all([classifySafety(scenario), decodeBehavior(scenario, context)]);

  const { error } = await admin.from('decodes').insert({
    child_id: child.id,
    user_id: userId,
    scenario,
    analysis,
    risk_level: safety.level,
    model: DECODE_MODEL,
    channel: 'whatsapp',
  });
  if (error) throw error;
  await admin.from('whatsapp_links').update({ last_child_id: child.id }).eq('user_id', userId);

  const switchHint = kids.length > 1 && !named
    ? `\n\n_(About ${child.name}. Start with a name to switch, e.g. "${kids.find((k) => k.id !== child.id)?.name}: …")_`
    : '';
  await sendWhatsApp(from, formatDecode(child.name, analysis, safetyNotice(safety.level)) + switchHint);
}
