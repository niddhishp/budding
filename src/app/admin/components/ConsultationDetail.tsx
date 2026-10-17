'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { TRANSITIONS, STATUS_LABELS, localDateTime, type Consultation, type ConsultationStatus, type Expert } from '@/lib/admin-operations';
import { Heading, LoadState, Status, formatTime, requestJson, useRemote } from './shared';

export function ConsultationDetail({ id, manager }: { id: string; manager: boolean }) {
  const remote = useRemote<{ request: Consultation }>(`/api/admin/consultations/${id}`);
  const experts = useRemote<{ experts: Expert[] }>(manager ? '/api/admin/experts' : null);
  const [message, setMessage] = useState('');
  return <><Link href="/admin/consultations" className="inline-block text-sm text-clay underline mb-6">← All consultations</Link><LoadState {...remote} />{remote.data && <>
    <Heading eyebrow="One family, one next step" title="Consultation request" /><p role="status" className="text-sm text-leaf mb-4">{message}</p>
    <div className="flex flex-wrap justify-between gap-3 border-y py-4 mb-8"><Status value={remote.data.request.status} /><span className="text-sm text-muted-foreground">Received {formatTime(remote.data.request.created_at)}</span></div>
    <div className="grid xl:grid-cols-[1fr_1fr] gap-10"><section><h2 className="font-heading text-2xl mb-5">What the parent shared</h2><p className="whitespace-pre-wrap break-words leading-relaxed mb-6">{remote.data.request.concern}</p>
      <dl className="space-y-4 text-sm"><div><dt className="text-muted-foreground">Contact</dt><dd className="break-all mt-1">{remote.data.request.parent_email}<br />{remote.data.request.phone}</dd></div><div><dt className="text-muted-foreground">Child</dt><dd className="mt-1">{remote.data.request.child_name || 'No child profile linked'}{remote.data.request.child_dob ? ` · Born ${remote.data.request.child_dob}` : ''}</dd></div><div><dt className="text-muted-foreground">Preferences</dt><dd className="mt-1">{remote.data.request.preferred_language} · {remote.data.request.preferred_time || 'No preferred call time'}</dd></div><div><dt className="text-muted-foreground">Assigned expert</dt><dd className="mt-1">{remote.data.request.expert_name || 'Not assigned'}</dd></div><div><dt className="text-muted-foreground">Session</dt><dd className="mt-1">{formatTime(remote.data.request.scheduled_at)}{remote.data.request.scheduled_at ? ` · ${remote.data.request.duration_minutes} minutes` : ''}</dd></div></dl>
      {remote.data.request.source === 'safety' && <p className="mt-6 text-sm bg-paper-deep rounded-xl p-4">This request came through a safety prompt. Review promptly and follow your team’s escalation procedure. The request itself is not a diagnosis.</p>}
      <p className="text-xs text-muted-foreground mt-6 break-all">Reference: {id}</p>
    </section><section><h2 className="font-heading text-2xl mb-5">Arrange the next step</h2><LoadState {...experts} />
      {(!manager || experts.data) && <UpdateForm key={remote.data.request.version} request={remote.data.request} experts={experts.data?.experts || []} manager={manager} onSaved={() => { setMessage('Request updated. Contact the parent separately if arrangements changed.'); remote.reload(); }} onReload={remote.reload} />}
    </section></div>
    <section className="border-t mt-10 pt-8"><h2 className="font-heading text-2xl mb-5">Coordination history</h2>{remote.data.request.events.length === 0 ? <p className="text-sm text-muted-foreground">Updates and coordination notes will appear here.</p> : <ol className="divide-y">{remote.data.request.events.map(event => <li key={event.id} className="py-4"><p className="text-xs text-muted-foreground mb-2">{formatTime(event.occurred_at)} · {STATUS_LABELS[event.details.from]} → {STATUS_LABELS[event.details.to]}</p>{event.details.scheduled_at && <p className="text-sm mb-2">Session: {formatTime(event.details.scheduled_at)}</p>}{event.note && <p className="text-sm whitespace-pre-wrap break-words">{event.note}</p>}</li>)}</ol>}</section>
  </>}</>;
}

function UpdateForm({ request, experts, manager, onSaved, onReload }: { request: Consultation; experts: Expert[]; manager: boolean; onSaved: () => void; onReload: () => void }) {
  const [status, setStatus] = useState(request.status); const [expertId, setExpertId] = useState(request.expert_id || '');
  const [time, setTime] = useState(localDateTime(request.scheduled_at)); const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const closed = request.status === 'completed' || request.status === 'cancelled';
  const options = manager ? TRANSITIONS[request.status] : request.status === 'scheduled' ? ['scheduled', 'completed'] as const : [request.status];
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      // Preserve the exact server timestamp when unchanged, including seconds.
      const scheduledAt = time === localDateTime(request.scheduled_at) ? request.scheduled_at : time ? new Date(time).toISOString() : null;
      await requestJson(`/api/admin/consultations/${request.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: request.id, version: request.version, status, expert_id: expertId || null, scheduled_at: scheduledAt, note }) });
      onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save.'); } finally { setBusy(false); }
  }
  return <form onSubmit={save} className="space-y-5">
    {!request.consent_current && <p role="alert" className="text-sm bg-paper-deep p-4 rounded-xl">The parent has withdrawn consent. Stop further coordination; operations can cancel this request.</p>}
    <fieldset disabled={busy} className="space-y-5"><label>Status<select value={status} onChange={e => setStatus(e.target.value as ConsultationStatus)}>{options.map(s => <option value={s} key={s}>{STATUS_LABELS[s]}</option>)}</select></label>
    {manager && <label>Expert<select value={expertId} disabled={closed} onChange={e => setExpertId(e.target.value)}><option value="">Not assigned</option>{experts.filter(e => (e.active && e.verified_at) || e.id === request.expert_id).map(e => <option key={e.id} value={e.id}>{e.name}{!e.active ? ' (paused)' : !e.verified_at ? ' (review needed)' : ''}</option>)}</select></label>}
    {manager && status === 'scheduled' && <label>Session time · {Intl.DateTimeFormat().resolvedOptions().timeZone}<input type="datetime-local" required value={time} onChange={e => setTime(e.target.value)} /><span className="block text-xs text-muted-foreground mt-2">Times in the queue are shown in India Standard Time. Confirm this time with both people before saving.</span></label>}
    <label>{status !== request.status && ['completed', 'cancelled'].includes(status) ? 'Completion / cancellation note *' : 'Coordination note'}<textarea maxLength={2000} minLength={status !== request.status && ['completed', 'cancelled'].includes(status) ? 5 : undefined} required={status !== request.status && ['completed', 'cancelled'].includes(status)} value={note} onChange={e => setNote(e.target.value)} placeholder="For example: Parent confirmed the time by phone." /></label><p className="text-xs text-muted-foreground">Team-only coordination notes. Keep diagnosis, session transcripts and clinical records out of this field. Saving does not send a message or take payment.</p></fieldset>
    {error && <div role="alert" className="text-sm"><p className="text-destructive mb-2">{error}</p><button type="button" onClick={onReload} className="underline">Reload latest request (discards this draft)</button></div>}
    <Button type="submit" disabled={busy || (!request.consent_current && (!manager || status !== 'cancelled'))}>{busy ? 'Saving…' : 'Save update'}</Button>
  </form>;
}
