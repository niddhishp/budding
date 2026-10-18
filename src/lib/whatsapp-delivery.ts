import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAdminSupabase } from './supabase-admin';
import { prepareWhatsAppReply } from './whatsapp-reply';
import { sendWhatsApp } from './whatsapp';
import { providerUrl } from './provider-webhooks';
import { launchStatus } from './launch';
/** Durable work; never retry an uncertain Twilio POST automatically. */
export async function processWhatsAppJob(id:string, options?:{db?:SupabaseClient; prepare?:typeof prepareWhatsAppReply; send?:typeof sendWhatsApp; enabled?:boolean}) {
  if (!(options?.enabled ?? launchStatus().whatsapp)) return;
  const db=options?.db ?? getAdminSupabase();
  const claimed=await db.rpc('claim_whatsapp',{p_id:id,p_send:false});
  if (claimed.error) throw new Error('Could not claim message');
  if (claimed.data) {
    const job=claimed.data;
    let response:string|null=null;
    try { response=await (options?.prepare ?? prepareWhatsAppReply)(job.phone,job.body,job.has_media,id,job.user_id); }
    catch { /* Retry bounded generation, using the same guidance receipt. */ }
    if(response && response.length>1600)response='This response needs more space than a WhatsApp message. Open https://www.kahiye.app/app for help. For immediate support, visit https://www.kahiye.app/help-now.';
    const finished=await db.rpc('finish_whatsapp',{p_id:id,p_token:job.lease,p_response:response,p_provider:null,p_error:response?null:'Response preparation interrupted.'});
    if (finished.error) throw new Error('Could not persist response');
  }
  const outbound=await db.rpc('claim_whatsapp',{p_id:id,p_send:true});
  if (outbound.error) throw new Error('Could not claim response');
  if (!outbound.data) return;
  const job=outbound.data;
  let provider:string|null=null;
  try { provider=await (options?.send ?? sendWhatsApp)(job.phone,job.response,providerUrl(`/api/whatsapp/status?job=${id}`)); }
  catch { /* Unknown acceptance is quarantined. A signed callback can still resolve it. */ }
  const result=await db.rpc('finish_whatsapp',{p_id:id,p_token:job.lease,p_response:null,p_provider:provider,p_error:provider?null:'Provider acceptance uncertain. Review Twilio history; do not resend blindly.'});
  if (result.error) throw new Error('Could not persist send result');
}
