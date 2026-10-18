import 'server-only';
import twilio from 'twilio';
import type { AgentAnalysis, SafetyNotice } from '@/types';

let client: ReturnType<typeof twilio> | null = null;

function getTwilio() {
  if (!client) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (!sid || !token) throw new Error('TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN are not set. See .env.example.');
    client = twilio(sid, token, { timeout: 8000, autoRetry: false });
  }
  return client;
}

// Twilio rejects WhatsApp bodies over 1600 characters.
const MAX_BODY = 1600;

export async function sendWhatsApp(to: string, body: string, statusCallback: string) {
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!from) throw new Error('TWILIO_WHATSAPP_FROM is not set. See .env.example.');
  if(body.length>MAX_BODY)throw new Error('Reply exceeds transport limit');
  const text = body;
  const message = await getTwilio().messages.create({ from, to: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`, body: text, statusCallback });
  return message.sid;
}

/** Safety protocol as its own message, sent before any guidance. */
export function formatSafety(notice: SafetyNotice) {
  return [
    `⚠️ *${notice.message}*`,
    notice.steps.length ? notice.steps.map((s, i) => `${i + 1}. ${s}`).join(NL) : '',
    notice.helplines.map((h) => `📞 ${h.name}: *${h.number}* — ${h.note}`).join(NL),
  ].filter(Boolean).join(NL + NL);
}

const NL = '\n';

/** WhatsApp-native formatting: *bold*, _italic_, short numbered steps, outcome prompt last. */
export function formatDecode(childName: string, analysis: AgentAnalysis, safety: SafetyNotice | null) {
  const parts: string[] = [];
  if (safety) parts.push(formatSafety(safety));
  if (analysis.rightNow) parts.push(`*Right now:* ${analysis.rightNow}`);
  parts.push(`*Say this to ${childName}*${NL}_“${analysis.sayThis}”_`);
  parts.push(`*Do this now*${NL}${analysis.doThis.map((s, i) => `${i + 1}. ${s}`).join(NL)}`);
  parts.push(`*Avoid:* ${analysis.avoid}`);
  const why = analysis.hypotheses?.length
    ? analysis.hypotheses.slice(0, 2).map((h) => `• ${h.text}`).join(NL)
    : analysis.interpretation;
  parts.push(`*What may be going on*${NL}${why}`);
  parts.push(`*Later, when calm:* ${analysis.afterwards}`);
  if (analysis.seekHelpIf) parts.push(`*Talk to a professional if:* ${analysis.seekHelpIf}`);
  parts.push("Did it work? Reply *1* worked · *2* partly · *3* didn't");
  const complete=parts.join(NL + NL);
  return complete.length<=MAX_BODY?complete:'Your guidance has been saved in Kahiye. Open https://www.kahiye.app/app to read the complete response, including the safety and follow-up notes. For immediate support, visit https://www.kahiye.app/help-now.';
}

export const WHATSAPP_HELP = [
  '*Kahiye on WhatsApp* 🌱',
  'Describe what is happening with your child and I will reply with the words to say.',
  'With more than one child, start with their name, e.g. _Aarav: won\'t brush his teeth_.',
  'After trying it, reply *1*, *2* or *3* to tell me if it worked.',
  'Reply *STOP* to disconnect.',
  'In an emergency in India, call *112*.',
].join('\n\n');
