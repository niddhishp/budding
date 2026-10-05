import 'server-only';
import twilio from 'twilio';
import type { AgentAnalysis, SafetyNotice } from '@/types';

let client: ReturnType<typeof twilio> | null = null;

function getTwilio() {
  if (!client) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (!sid || !token) throw new Error('TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN are not set. See .env.example.');
    client = twilio(sid, token);
  }
  return client;
}

/** The public URL Twilio posts to; must match the Console setting exactly for signature checks. */
export function webhookUrl() {
  return process.env.TWILIO_WEBHOOK_URL
    || `${(process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '')}/api/whatsapp/webhook`;
}

export function isValidTwilioRequest(signature: string, params: Record<string, string>) {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token || !signature) return false;
  return twilio.validateRequest(token, signature, webhookUrl(), params);
}

// Twilio rejects WhatsApp bodies over 1600 characters.
const MAX_BODY = 1600;

export async function sendWhatsApp(to: string, body: string) {
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!from) throw new Error('TWILIO_WHATSAPP_FROM is not set. See .env.example.');
  const text = body.length > MAX_BODY ? `${body.slice(0, MAX_BODY - 1)}…` : body;
  await getTwilio().messages.create({ from, to: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`, body: text });
}

/** WhatsApp-native formatting: *bold*, _italic_, short numbered steps, outcome prompt last. */
export function formatDecode(childName: string, analysis: AgentAnalysis, safety: SafetyNotice | null) {
  const parts: string[] = [];
  if (safety) {
    parts.push(`⚠️ *${safety.message}*`);
    parts.push(safety.helplines.map((h) => `📞 ${h.name}: *${h.number}*`).join('\n'));
  }
  parts.push(`*Say this to ${childName}*\n_“${analysis.sayThis}”_`);
  parts.push(`*Do this now*\n${analysis.doThis.map((s, i) => `${i + 1}. ${s}`).join('\n')}`);
  parts.push(`*Avoid:* ${analysis.avoid}`);
  parts.push(`*What's going on:* ${analysis.interpretation}`);
  parts.push(`*Later, when calm:* ${analysis.afterwards}`);
  parts.push('Did it work? Reply *1* worked · *2* partly · *3* didn\'t');
  return parts.join('\n\n');
}

export const WHATSAPP_HELP = [
  '*Kahiye on WhatsApp* 🌱',
  'Describe what is happening with your child and I will reply with the words to say.',
  'With more than one child, start with their name, e.g. _Aarav: won\'t brush his teeth_.',
  'After trying it, reply *1*, *2* or *3* to tell me if it worked.',
  'Reply *STOP* to disconnect.',
  'In an emergency in India, call *112*.',
].join('\n\n');
