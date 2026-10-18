import { createHash } from 'node:crypto';
import { checkUserConsent } from '@/lib/access';
import { getAdminSupabase } from '@/lib/supabase-admin';
import { reserveGuidance, completeGuidance, failGuidance, GuidanceRequestError } from '@/lib/guidance';
import { loadDecodeContext } from '@/lib/decodeContext';
import { decodeBehavior, DECODE_MODEL } from '@/lib/ai/decode';
import { classifySafety, guidancePath, needsReview, safetyNotice } from '@/lib/ai/safety';
import { routeMessage } from '@/lib/ai/router';
import { stageBandFor } from '@/lib/ai/doctrine/stages';
import type { AgentAnalysis } from '@/types';
import { formatDecode, formatSafety, WHATSAPP_HELP } from '@/lib/whatsapp';

const SITE = 'https://www.kahiye.app';
const OUTCOMES = { '1': 'worked', '2': 'partly', '3': 'did_not_work' } as const;

export async function prepareWhatsAppReply(from: string, body: string, hasMedia: boolean, messageId: string, expectedUser: string): Promise<string> {
  const phone = from.replace(/^whatsapp:/, '');
  const admin = getAdminSupabase();
  const command = body.toUpperCase();

  const { data: link } = await admin
    .from('whatsapp_links')
    .select('user_id, last_child_id')
    .eq('phone', phone)
    .maybeSingle();

  if (!link || link.user_id !== expectedUser) {
    return `Hi! I'm Kahiye 🌱 To use me here, open ${SITE}/app, tap your profile menu → *Connect WhatsApp*, and send the code it shows.`;
  }
  const userId: string = link.user_id;

  // ── Commands ───────────────────────────────────────────────────────────────
  if (command === 'STOP' || command === 'UNLINK') {
    await admin.from('whatsapp_links').delete().eq('user_id', userId);
    return 'Disconnected. You can reconnect anytime from the app.';
  }
  if (command === 'HELP' || command === 'HI' || command === 'HELLO') {
    return WHATSAPP_HELP;
  }
  if (!await checkUserConsent(admin, userId)) {
    return `Please review the current privacy notice at ${SITE}/app before continuing. You can still send STOP to disconnect.`;
  }
  if (command in OUTCOMES) {
    const outcome = OUTCOMES[command as keyof typeof OUTCOMES];
    const { data, error } = await admin.rpc('record_whatsapp_feedback',{p_job:messageId,p_outcome:outcome});
    if (error) throw error;
    return data as string;
  }
  if (!body) {
    return hasMedia
      ? 'I can\'t read voice notes or photos yet. Please type what happened in a sentence or two.'
      : WHATSAPP_HELP;
  }
  if (body.length < 3 || body.length > 2000) {
    return 'Please describe what happened in a sentence or two.';
  }

  // Safety precedes profile selection and allowance checks.
  const signal = AbortSignal.timeout(45_000);
  const safety = await classifySafety(body, signal);
  const notice = safetyNotice(safety);
  if (guidancePath(safety) !== 'ordinary') {
    if (needsReview(safety)) {
      const hash=createHash('sha256').update(`wa-safety:${messageId}`).digest('hex');
      const id=`${hash.slice(0,8)}-${hash.slice(8,12)}-${hash.slice(12,16)}-${hash.slice(16,20)}-${hash.slice(20,32)}`;
      const { error } = await admin.from('safety_events').upsert({id,user_id:userId,channel:'whatsapp',level:safety.level,category:safety.category,reason:'Support route selected by safety triage.'},{onConflict:'id',ignoreDuplicates:true});
      if(error)console.error('[whatsapp] safety event save failed');
    }
    return (notice ? formatSafety(notice) : 'I could not safely check this message. Please try again later.') + `\n\nImmediate support: ${SITE}/help-now`;
  }

  // ── Decode ─────────────────────────────────────────────────────────────────
  const { data: kids } = await admin
    .from('children')
    .select('id, name')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (!kids?.length) {
    return `Add your child's profile first at ${SITE}/app, then message me here.`;
  }

  // "Aarav: …" / "Aarav, …" picks a child; otherwise the last child discussed, else the first.
  let scenario = body;
  let child = kids.find((k) => k.id === link.last_child_id) ?? kids[0];
  const prefix = body.match(/^([^:,\n]{1,40})[:,]\s*([\s\S]+)$/);
  const named = prefix && kids.find((k) => k.name.toLowerCase() === prefix[1].trim().toLowerCase());
  if (kids.length > 1 && !named && !kids.some(k => k.id === link.last_child_id)) return 'Which child is this about? Start your message with their name followed by a colon.';
  if (named && prefix) {
    child = named;
    scenario = prefix[2].trim();
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
    const reply=formatDecode(child.name, analysis, notice);
    return reply.length+switchHint.length<=1600?reply+switchHint:reply;
  } catch (error) {
    await failGuidance(reservation);
    if (error instanceof GuidanceRequestError) {
      return error.message + `\n\nImmediate support: ${SITE}/help-now`;
    }
    throw error;
  }
}
