import { getAdminSupabase } from '@/lib/supabase-admin';
import { validWorkerSecret } from '@/lib/provider-webhooks';
import { processConsultationAlert } from '@/lib/consultation-delivery';
import { processWhatsAppJob } from '@/lib/whatsapp-delivery';
import { launchStatus } from '@/lib/launch';
export const maxDuration=120;
export const dynamic='force-dynamic';
export async function GET(req:Request) {
  if (!validWorkerSecret(req.headers.get('authorization'))) return new Response('Unauthorized',{status:401});
  const db=getAdminSupabase(), start=Date.now(), status=launchStatus();
  let failures=0;
  try {
    const heartbeat=await db.from('delivery_worker_health').upsert({id:true,last_started_at:new Date().toISOString(),last_error:null});
    if(heartbeat.error)throw new Error('Heartbeat unavailable');
    const prune=await db.rpc('prune_delivery');if(prune.error)throw new Error('Retention unavailable');
    const photos=await db.from('family_photo_cleanup').select('path').lte('not_before',new Date().toISOString()).limit(100);
    if(photos.error)throw new Error('Photo erasure queue unavailable');
    if(photos.data.length){
      const paths=photos.data.map(p=>p.path);
      const removed=await db.storage.from('family-photos').remove(paths);
      if(removed.error)failures++;
      else if((await db.from('family_photo_cleanup').delete().in('path',paths)).error)failures++;
    }
    if(status.operationsEmail){
      const jobs=await db.from('consultation_alerts').select('request_id').in('state',['pending','failed','blocked','sending']).lt('updated_at',new Date(Date.now()-300000).toISOString()).order('updated_at').limit(5);
      if(jobs.error)throw new Error('Email queue unavailable');
      await Promise.all((jobs.data??[]).map(async job=>{try{await processConsultationAlert(job.request_id);}catch{failures++;}}));
    }
    if(status.whatsapp && Date.now()-start<15000){
      const jobs=await db.from('whatsapp_jobs').select('id').in('state',['pending','processing','ready','sending']).lte('next_attempt_at',new Date().toISOString()).order('created_at').limit(3);
      if(jobs.error)throw new Error('WhatsApp queue unavailable');
      await Promise.all((jobs.data??[]).map(async job=>{try{await processWhatsAppJob(job.id);}catch{failures++;}}));
    }
    const finished=await db.from('delivery_worker_health').update({last_finished_at:new Date().toISOString(),last_error:failures?'Some jobs need another recovery pass.':null}).eq('id',true);
    if(finished.error)throw new Error('Heartbeat save unavailable');
    return Response.json({ok:failures===0,failures},{status:failures?503:200,headers:{'Cache-Control':'no-store'}});
  }catch{
    await db.from('delivery_worker_health').update({last_error:'Recovery pass failed. Check provider configuration and database connectivity.'}).eq('id',true);
    return Response.json({error:'Recovery unavailable'},{status:503});
  }
}
