import { getAdminSupabase } from '@/lib/supabase-admin';
import { verifyEmailEvent } from '@/lib/provider-webhooks';
export async function POST(req:Request) {
  const secret=process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return new Response('Not configured',{status:503});
  const raw=await req.text();
  if (raw.length>100000) return new Response('Too large',{status:413});
  let event;
  try { event=verifyEmailEvent(raw,req.headers,secret); } catch { return new Response('Invalid event',{status:400}); }
  const {error}=await getAdminSupabase().rpc('record_email_delivery',{p_id:req.headers.get('svix-id'),p_provider:event.data.email_id,p_status:event.type,p_time:event.created_at});
  return new Response(error?'Please retry':'OK',{status:error?503:200});
}
