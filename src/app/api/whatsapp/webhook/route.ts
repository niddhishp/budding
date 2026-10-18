import { after } from 'next/server';
import { launchStatus } from '@/lib/launch';
import { getAdminSupabase } from '@/lib/supabase-admin';
import { readTwilioForm } from '@/lib/provider-webhooks';
import { processWhatsAppJob } from '@/lib/whatsapp-delivery';
export const maxDuration = 120;
export async function POST(req: Request) {
  if (!launchStatus().whatsapp) return new Response('Channel not enabled', { status: 503 });
  const params = await readTwilioForm(req, '/api/whatsapp/webhook');
  if (!params) return new Response('Invalid request', { status: 403 });
  if (!/^SM[0-9a-f]{32}$/i.test(params.MessageSid ?? '') || !/^whatsapp:\+[1-9]\d{7,14}$/.test(params.From ?? '') || (params.Body ?? '').length > 2000) return new Response('Invalid message', { status: 400 });
  const { error } = await getAdminSupabase().rpc('receive_whatsapp', {
    p_id: params.MessageSid, p_phone: params.From.slice(9), p_body: (params.Body ?? '').trim(), p_media: Number(params.NumMedia ?? 0) > 0,
  });
  if (error) return new Response('Please retry', { status: 503 });
  after(async () => { try { await processWhatsAppJob(params.MessageSid); } catch { console.error('[delivery] WhatsApp job deferred to recovery'); } });
  return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', { headers: { 'Content-Type': 'text/xml' } });
}
