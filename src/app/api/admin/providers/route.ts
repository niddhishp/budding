import { requireAdminAccess } from '@/lib/access';
import { getAdminSupabase } from '@/lib/supabase-admin';
import { checkPaymentPlan } from '@/lib/payment-checks';
import { launchStatus } from '@/lib/launch';
import { launchReadiness } from '@/lib/launch-readiness';
import { assessDeliveryWorker } from '@/lib/delivery-health';
export async function GET(req:Request){
  const access=await requireAdminAccess({roles:['owner','operations']});
  if(access.response)return access.response;
  const db=getAdminSupabase();
  const [health,jobs]=await Promise.all([
    db.from('delivery_worker_health').select('last_started_at,last_finished_at,last_error').eq('id',true).maybeSingle(),
    db.from('whatsapp_jobs').select('id,state,delivery_status,last_error,created_at,updated_at').or('state.eq.needs_review,delivery_status.eq.failed,delivery_status.eq.undelivered').order('updated_at',{ascending:false}).limit(20),
  ]);
  if(health.error||jobs.error)return Response.json({error:'Delivery status unavailable'},{status:503});
  let payment:unknown=null;
  if(new URL(req.url).searchParams.get('check')==='plans'){
    try {payment={ok:true,mode:process.env.RAZORPAY_KEY_ID?.startsWith('rzp_live_')?'live':'test',plans:await Promise.all([checkPaymentPlan('monthly'),checkPaymentPlan('yearly')])};}
    catch{payment={ok:false,error:'Could not verify both plans. Check credentials, provider mode, INR prices and billing intervals.'};}
  }
  return Response.json({status:launchStatus(),readiness:launchReadiness(),health:health.data,worker:assessDeliveryWorker(health.data),checkedAt:new Date().toISOString(),attention:jobs.data,payment},{headers:{'Cache-Control':'private, no-store'}});
}
