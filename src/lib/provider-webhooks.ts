import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import twilio from 'twilio';
import { Webhook } from 'svix';
import { z } from 'zod';
export function providerUrl(path: string) {
  const url = new URL(path, process.env.NEXT_PUBLIC_SITE_URL || 'https://www.kahiye.app');
  if (url.protocol !== 'https:') throw new Error('Provider callback requires HTTPS');
  return url.toString();
}
export function validWorkerSecret(header: string | null, secret = process.env.CRON_SECRET) {
  if (!secret || secret.length < 32 || !header) return false;
  const actual=Buffer.from(header), expected=Buffer.from(`Bearer ${secret}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export async function readTwilioForm(req: Request, path: string) {
  if (!process.env.TWILIO_AUTH_TOKEN || !req.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded')) return null;
  const raw=await req.text();
  if (raw.length > 20000) return null;
  const entries=new URLSearchParams(raw);
  const params: Record<string,string>={};
  for (const [key,value] of entries) { if (key in params) return null; params[key]=value; }
  if (params.AccountSid !== process.env.TWILIO_ACCOUNT_SID) return null;
  if (path === '/api/whatsapp/webhook' && params.To !== process.env.TWILIO_WHATSAPP_FROM) return null;
  const url = path === '/api/whatsapp/webhook' && process.env.TWILIO_WEBHOOK_URL ? process.env.TWILIO_WEBHOOK_URL : providerUrl(path);
  return twilio.validateRequest(process.env.TWILIO_AUTH_TOKEN, req.headers.get('x-twilio-signature') ?? '', url, params) ? params : null;
}
const emailEvent = z.object({type:z.string().max(100),created_at:z.iso.datetime({offset:true}),data:z.object({email_id:z.string().min(1).max(100)})});
export function verifyEmailEvent(raw:string, headers:Headers, secret:string) {
  new Webhook(secret).verify(raw,{
    'svix-id':headers.get('svix-id') ?? '', 'svix-timestamp':headers.get('svix-timestamp') ?? '', 'svix-signature':headers.get('svix-signature') ?? '',
  });
  return emailEvent.parse(JSON.parse(raw));
}
