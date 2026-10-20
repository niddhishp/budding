'use client';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { requestJson, formatTime } from './shared';
import type { LaunchService } from '@/lib/launch-readiness';
import type { WorkerAssessment, WorkerHeartbeat } from '@/lib/delivery-health';
import { LaunchConfiguration } from './LaunchConfiguration';
type Report={readiness:LaunchService[];checkedAt:string;worker:WorkerAssessment;health:WorkerHeartbeat|null;attention:{id:string;state:string;delivery_status:string|null;last_error:string|null;updated_at:string}[];payment:{ok:boolean;mode?:string;error?:string;plans?:{interval:string;amount:number;currency:string}[]}|null};
export function ProviderDelivery(){
  const [report,setReport]=useState<Report|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const load=useCallback(async(check=false)=>{
    setBusy(true);setError('');setReport(null);
    try{setReport(await requestJson(`/api/admin/providers${check?'?check=plans':''}`));}
    catch{setError('Could not load delivery status. Please retry.');}finally{setBusy(false);}
  },[]);
  useEffect(()=>{void load();},[load]);
  return <section className="border-t py-6"><h2 className="font-heading text-2xl">Provider setup and delivery</h2>
    <p className="text-sm text-muted-foreground mt-3">These checks do not charge a card or send a message. Queued work resumes automatically when its provider is configured.</p>
    <div className="flex flex-wrap gap-3 mt-4"><Button variant="outline" disabled={busy} onClick={()=>void load()}>Refresh delivery status</Button><Button variant="outline" disabled={busy} onClick={()=>void load(true)}>Check Razorpay plans</Button></div>
    {busy&&<p role="status" className="mt-3">Checking…</p>}{error&&<p role="alert" className="mt-3 text-destructive">{error}</p>}
    {report&&<div className="mt-5 space-y-4">
      <p className="text-sm text-muted-foreground">Snapshot checked: {formatTime(report.checkedAt)}. Refresh to check again; this page does not monitor in the background.</p>
      <LaunchConfiguration services={report.readiness} />
      <h3 className="font-heading text-2xl">Recovery worker</h3>
      <p role="status" className={report.worker.state === 'attention' ? 'font-semibold text-destructive' : ''}>{report.worker.message}</p>
      <p>Last completed recovery pass: {report.health?.last_finished_at?formatTime(report.health.last_finished_at):'Not recorded yet — configure the worker secret and verify the schedule.'}</p>
      {report.health?.last_error&&<p role="status">{report.health.last_error}</p>}
      {report.payment&&<p role="status">{report.payment.ok?`${report.payment.mode==='live'?'Live':'Test'} plans verified: ₹299 monthly and ₹1,999 yearly. This confirms configuration, not a successful charge.`:report.payment.error}</p>}
      <h3 className="font-semibold">WhatsApp delivery needing review</h3>
      {report.attention.length===0?<p className="text-sm text-muted-foreground">No unresolved delivery jobs are recorded.</p>:<ul className="space-y-4">{report.attention.map(job=><li key={job.id} className="border rounded-lg p-4"><p className="text-sm break-all">Message reference: {job.id}</p><p className="mt-1">{job.delivery_status??job.state.replaceAll('_',' ')}</p><p className="text-sm text-muted-foreground">{job.last_error} · {formatTime(job.updated_at)}</p></li>)}</ul>}
      <p className="text-xs text-muted-foreground">Up to 20 recent jobs, retained for seven days. An uncertain send needs Twilio history review; do not resend it blindly. Email delivery details appear on each consultation.</p>
    </div>}
  </section>;
}
