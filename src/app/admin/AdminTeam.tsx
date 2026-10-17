'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ADMIN_ROLES, type AdminRole } from '@/lib/access-policy';

type Member = { user_id: string; email: string; role: AdminRole; active: boolean };
type AuditEvent = { id: string; actor_id: string | null; target_id: string | null; action: string; occurred_at: string; details: { role?: string; active?: boolean } };

export function AdminTeam() {
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AdminRole>('operations');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  async function load() {
    const [staff, audit] = await Promise.all([fetch('/api/admin/staff'), fetch('/api/admin/audit')]);
    if (!staff.ok || !audit.ok) throw new Error('Could not load team access. Your session may need verification again.');
    setMembers((await staff.json()).members); setEvents((await audit.json()).events);
  }
  useEffect(() => { load().catch(e => setMessage(e.message)).finally(() => setLoading(false)); }, []);

  async function save(targetEmail: string, targetRole: AdminRole, active: boolean) {
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/admin/staff', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, role: targetRole, active }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not update access.');
      await load(); setMessage('Team access updated.'); setEmail('');
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not update access.'); }
    finally { setBusy(false); }
  }

  return <div className="space-y-8">
    <section className="rounded-3xl bg-surface p-6 shadow-paper">
      <h2 className="font-heading text-2xl mb-3">Add or change team access</h2>
      <p className="text-sm text-slate-600 mb-5">Ask your teammate to sign in to Kahiye first. Use their verified email here. Adding access does not send an invitation.</p>
      <form className="grid sm:grid-cols-2 gap-4" onSubmit={e => { e.preventDefault(); void save(email,role,true); }}>
        <label>Email<input className="block w-full border rounded-xl p-3 mt-2" type="email" required maxLength={320} value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label>Role<select className="block w-full border rounded-xl p-3 mt-2" value={role} onChange={e => setRole(e.target.value as AdminRole)}>{ADMIN_ROLES.map(r => <option key={r} value={r}>{r.replace('_',' ')}</option>)}</select></label>
        <Button className="sm:col-span-2 justify-self-start" disabled={busy || loading} type="submit">{busy ? 'Saving…' : 'Save team access'}</Button>
      </form>
      <p className="mt-4 text-sm text-slate-500">Owners can manage access. Operations, therapist and content reviewer tools will become available in later phases.</p>
      <p aria-live="polite" className="mt-4 text-sm">{message}</p>
    </section>
    <section><h2 className="font-heading text-2xl mb-4">Team members</h2>
      {loading ? <p role="status">Loading team access…</p> : <ul className="divide-y divide-slate-200">{members.map(m => <li key={m.user_id} className="py-4 flex flex-wrap items-center justify-between gap-4">
        <div><p className="break-all font-medium">{m.email}</p><p className="text-sm text-slate-500">{m.role.replace('_',' ')} · {m.active ? 'Active' : 'Access paused'}</p></div>
        <div className="flex gap-3"><Button variant="outline" disabled={busy} onClick={() => { setEmail(m.email); setRole(m.role); }}>Edit role</Button><Button variant="outline" disabled={busy} onClick={() => save(m.email,m.role,!m.active)}>{m.active ? 'Pause access' : 'Restore access'}</Button></div>
      </li>)}</ul>}
      {!loading && members.length === 0 && <Button variant="outline" onClick={() => load().catch(e => setMessage(e.message))}>Retry loading</Button>}
    </section>
    <section><h2 className="font-heading text-2xl mb-4">Recent access changes</h2><ul className="space-y-3">{events.map(event => <li key={event.id} className="text-sm break-words"><time dateTime={event.occurred_at}>{new Date(event.occurred_at).toLocaleString()}</time> · {members.find(m => m.user_id === event.target_id)?.email ?? 'Former team member'} · {event.details.role?.replace('_',' ')} · {event.details.active ? 'Access enabled' : 'Access paused'} · by {members.find(m => m.user_id === event.actor_id)?.email ?? 'System or former owner'}</li>)}</ul></section>
  </div>;
}
