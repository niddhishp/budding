import { getAdminSupabase } from '@/lib/supabase-admin';
import { readTwilioForm } from '@/lib/provider-webhooks';
export async function POST(req:Request) {
  const id=new URL(req.url).searchParams.get('job');
  if (!id || !/^SM[0-9a-f]{32}$/i.test(id)) return new Response('Invalid job',{status:400});
  const params=await readTwilioForm(req,`/api/whatsapp/status?job=${id}`);
  if (!params) return new Response('Invalid signature',{status:403});
  const {error}=await getAdminSupabase().rpc('record_whatsapp_status',{p_id:id,p_provider:params.MessageSid ?? '',p_status:params.MessageStatus ?? '',p_error:params.ErrorCode && /^\d{1,8}$/.test(params.ErrorCode)?`Provider code ${params.ErrorCode}`:null});
  return new Response(error?'Please retry':'OK',{status:error?503:200});
}
