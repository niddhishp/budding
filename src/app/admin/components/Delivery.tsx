'use client';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CONTACT_OUTCOMES, localDateTime, type AlertDelivery, type Consultation } from '@/lib/admin-operations';
import { formatTime, requestJson } from './shared';

export function ContactForm({ request, onSaved }: { request: Consultation; onSaved: () => void }) {
  const [channel, setChannel] = useState('phone');
  const [outcome, setOutcome] = useState<keyof typeof CONTACT_OUTCOMES>('no_answer');
  const [time, setTime] = useState(localDateTime(request.next_due_at && new Date(request.next_due_at).getTime() > Date.now() ? request.next_due_at : new Date(Date.now()+86400000).toISOString()));
  const [note, setNote] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const receipt = useRef<{ key: string; id: string } | null>(null);
  const active = useRef(false);
  if (['completed','cancelled'].includes(request.status)) return null;
  async function save(e: React.FormEvent) {
    e.preventDefault(); if (active.current) return;
    active.current = true; setBusy(true); setError('');
    try {
      const payload = { id: request.id, version: request.version, channel, outcome, follow_up_at: new Date(time).toISOString(), note };
      const key = JSON.stringify(payload);
      if (receipt.current?.key !== key) receipt.current = { key, id: crypto.randomUUID() };
      await requestJson(`/api/admin/consultations/${request.id}/contact`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ ...payload, event_id: receipt.current.id }) });
      onSaved();
    } catch(e) { setError(e instanceof Error ? e.message : 'Contact was not saved.'); }
    finally { active.current=false; setBusy(false); }
  }
  return <section className="mt-8 border-t pt-7"><h2 className="font-heading text-2xl mb-3">Record contact & follow-up</h2><p className="text-sm text-muted-foreground mb-5">Record an action your team has already taken. This form does not call or message the parent.</p>
    <form onSubmit={save} className="space-y-5"><fieldset disabled={busy || !request.consent_current} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4"><label>Contact method<select value={channel} onChange={e=>setChannel(e.target.value)}><option value="phone">Phone call</option><option value="email">Email</option><option value="whatsapp">WhatsApp</option><option value="coordination">Team coordination</option></select></label>
      <label>What happened<select value={outcome} onChange={e=>setOutcome(e.target.value as keyof typeof CONTACT_OUTCOMES)}>{Object.entries(CONTACT_OUTCOMES).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label></div>
      <label>Next follow-up · {Intl.DateTimeFormat().resolvedOptions().timeZone}<input type="datetime-local" required value={time} onChange={e=>setTime(e.target.value)} /></label>
      <label>Contact note<textarea maxLength={2000} value={note} onChange={e=>setNote(e.target.value)} placeholder="For example: No answer; try again at the preferred time." /></label>
      <Button type="submit">{busy ? 'Saving…' : 'Record contact'}</Button>
    </fieldset>{error && <p role="alert" className="text-sm text-destructive">{error} Your draft is still here. If the request changed, reload the page to review it before trying again.</p>}</form>
  </section>;
}
const deliveryLabels: Record<AlertDelivery['state'],string> = { pending:'Waiting for a send attempt', sending:'Send in progress — refresh to check', accepted:'Accepted by email provider', failed:'Send attempt failed', blocked:'Email setup needed', needs_review:'Provider history needs manual review', cancelled:'Alert cancelled' };
export function DeliveryPanel({ id, alert, closed, onRefresh }: { id: string; alert: AlertDelivery | null; closed: boolean; onRefresh:()=>void }) {
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  async function retry() { setBusy(true);setError(''); try { await requestJson(`/api/admin/consultations/${id}/delivery`,{method:'POST'});onRefresh(); } catch(e) { setError(e instanceof Error?e.message:'Could not retry.'); } finally { setBusy(false); } }
  return <section className="mt-7 bg-paper-deep p-5 rounded-xl"><h2 className="font-heading text-xl mb-3">Operations email alert</h2>
    {alert ? <><p className="text-sm font-medium">{deliveryLabels[alert.state]}</p><p className="text-xs text-muted-foreground mt-2">{alert.attempts} send attempts · Updated {formatTime(alert.updated_at)}</p>{alert.last_error && <p className="text-sm mt-3">{alert.last_error}</p>}{alert.provider_id && <p className="text-xs mt-2 break-all">Provider reference: {alert.provider_id}</p>}
      {!closed && !['accepted','needs_review','cancelled'].includes(alert.state) && <Button variant="outline" className="mt-4" disabled={busy} onClick={retry}>{busy ? 'Checking…' : 'Retry operations alert'}</Button>}
    </> : <p className="text-sm">This earlier request has no tracked alert. Review it in this workspace; no retrospective email was sent.</p>}
    <p className="text-xs text-muted-foreground mt-3">An alert asks your operations team to review this request. It does not contact the parent. Provider acceptance does not confirm inbox delivery.</p>{error && <p role="alert" className="text-sm text-destructive mt-3">{error}</p>}
  </section>;
}
