'use client';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { ORGANISATION_KINDS, ORGANISATION_STATUSES, formatSponsorCode, type OrganisationKind } from '@/lib/sponsor';
import { Heading, LoadState, formatTime, requestJson, useRemote } from './shared';

type Organisation = {
  id: string; name: string; kind: OrganisationKind; contact_name: string | null; contact_email: string | null;
  contract_signed_on: string | null; seats: number; starts_on: string; ends_on: string;
  status: (typeof ORGANISATION_STATUSES)[number]; notes: string | null; revision: number;
};
type Code = { code: string; max_redemptions: number; redeemed_count: number; expires_on: string | null; active: boolean; created_at: string };
type Figure = number | '<5';
type Report = {
  generated_at: string; minimum_families: number; families_joined: Figure; families_active_30_days: Figure;
  ask_turns_30_days: Figure; families_checked_in_30_days: Figure; handbook_cards_saved: Figure;
};
type Row = { organisation: Organisation; seats_used: number; codes: Code[]; report: Report };
type Draft = Omit<Organisation, 'id' | 'revision'>;

const REPORT_LINES: [keyof Report, string][] = [
  ['families_joined', 'Families who joined with a code'],
  ['families_active_30_days', 'Families who used Ask or the check-in in the last 30 days'],
  ['ask_turns_30_days', 'Ask turns in the last 30 days (safety-related turns are never counted)'],
  ['families_checked_in_30_days', 'Families who did the evening check-in in the last 30 days'],
  ['handbook_cards_saved', 'Handbook cards saved or tried'],
];
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const blank = (): Draft => ({ name: '', kind: 'school', contact_name: '', contact_email: '', contract_signed_on: null, seats: 50, starts_on: today(), ends_on: '', status: 'draft', notes: '' });
const field = 'mt-1 w-full rounded-lg border border-border bg-background px-3 py-2';
const dateLabel = (value: string) => new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));

/** Plain text the owner can paste into an email to the sponsor: aggregates only. */
export function reportText(row: Row) {
  const o = row.organisation, r = row.report;
  return [`Kahiye for ${o.name}: summary`, `Term: ${dateLabel(o.starts_on)} to ${dateLabel(o.ends_on)}. Places: ${o.seats}.`,
    ...REPORT_LINES.map(([key, label]) => `${label}: ${r[key]}`),
    `Prepared ${formatTime(r.generated_at)}. Figures based on fewer than ${r.minimum_families} families show as "<5". Kahiye never shares any family's details, questions or answers.`].join('\n');
}

export function SponsorsAdmin() {
  const remote = useRemote<{ organisations: Row[] }>('/api/admin/sponsors');
  const [editing, setEditing] = useState<{ id: string; revision: number; draft: Draft } | null>(null);
  const [message, setMessage] = useState('');
  const save = async (body: unknown, done: string) => {
    setMessage('');
    try {
      await requestJson('/api/admin/sponsors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      setMessage(done); remote.reload(); return true;
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not save.'); return false; }
  };
  return <>
    <Heading eyebrow="Kahiye for schools, employers and clinics" title="Sponsored access" description="An organisation pays for Kahiye Plus for its families, without checkout. Create the organisation, set it active, issue codes and share them. The organisation sees only the aggregate summary below, where any figure from fewer than five families shows as <5. Never send it anything about a family." />
    <div className="flex flex-wrap gap-3 items-center mb-8">
      <Button onClick={() => setEditing({ id: crypto.randomUUID(), revision: 0, draft: blank() })}>New organisation</Button>
      <p role="status" className="text-sm">{message}</p>
    </div>
    {editing && <OrganisationForm key={editing.id} initial={editing.draft} onCancel={() => setEditing(null)}
      onSave={async draft => { if (await save({ action: 'organisation', id: editing.id, revision: editing.revision, value: draft }, `Saved ${draft.name}.`)) setEditing(null); }} />}
    <LoadState {...remote} />
    {remote.data && (remote.data.organisations.length === 0
      ? <p className="text-muted-foreground">No organisations yet.</p>
      : remote.data.organisations.map(row => <OrganisationCard key={row.organisation.id} row={row} save={save}
        edit={() => { const { id, revision, ...draft } = row.organisation; setEditing({ id, revision, draft }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />))}
    <p className="text-sm text-muted-foreground border-t pt-5 mt-6">Runbook, pricing guidance and the agreement checklist: docs/SPONSORED-ACCESS.md. <button className="underline ml-2" onClick={remote.reload}>Refresh</button></p>
  </>;
}

function OrganisationForm({ initial, onSave, onCancel }: { initial: Draft; onSave: (d: Draft) => Promise<void>; onCancel: () => void }) {
  const [d, setD] = useState(initial);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setD(v => ({ ...v, [key]: value }));
  const submit = async (e: FormEvent) => { e.preventDefault(); setBusy(true); await onSave(d); setBusy(false); };
  return <form onSubmit={submit} className="border border-border rounded-2xl p-5 mb-10 grid gap-4 sm:grid-cols-2" aria-label="Organisation">
    <label className="text-sm sm:col-span-2">Name<input required minLength={2} maxLength={120} className={field} value={d.name} onChange={e => set('name', e.target.value)} /></label>
    <label className="text-sm">Kind<select className={field} value={d.kind} onChange={e => set('kind', e.target.value as OrganisationKind)}>{Object.entries(ORGANISATION_KINDS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}</select></label>
    <label className="text-sm">Status<select className={field} value={d.status} onChange={e => set('status', e.target.value as Draft['status'])}>{ORGANISATION_STATUSES.map(s => <option key={s}>{s}</option>)}</select></label>
    <label className="text-sm">Contact name<input maxLength={120} className={field} value={d.contact_name ?? ''} onChange={e => set('contact_name', e.target.value)} /></label>
    <label className="text-sm">Contact email<input type="email" maxLength={254} className={field} value={d.contact_email ?? ''} onChange={e => set('contact_email', e.target.value)} /></label>
    <label className="text-sm">Places (seats)<input type="number" required min={1} max={100000} className={field} value={d.seats} onChange={e => set('seats', Number(e.target.value))} /></label>
    <label className="text-sm">Agreement signed on<input type="date" className={field} value={d.contract_signed_on ?? ''} onChange={e => set('contract_signed_on', e.target.value || null)} /></label>
    <label className="text-sm">Starts on<input type="date" required className={field} value={d.starts_on} onChange={e => set('starts_on', e.target.value)} /></label>
    <label className="text-sm">Ends on (access runs to the end of this day, India time)<input type="date" required className={field} value={d.ends_on} onChange={e => set('ends_on', e.target.value)} /></label>
    <label className="text-sm sm:col-span-2">Notes (team only; never family details)<textarea maxLength={2000} rows={3} className={field} value={d.notes ?? ''} onChange={e => set('notes', e.target.value)} /></label>
    <p className="text-xs text-muted-foreground sm:col-span-2">Setting “ended” stops every family’s sponsored access now. Moving the end date changes every family’s access to match, so a renewal needs no new codes.</p>
    <div className="flex gap-3 sm:col-span-2"><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save organisation'}</Button><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button></div>
  </form>;
}

function OrganisationCard({ row, save, edit }: { row: Row; save: (body: unknown, done: string) => Promise<boolean>; edit: () => void }) {
  const o = row.organisation;
  const [count, setCount] = useState(1), [max, setMax] = useState(Math.max(1, o.seats)), [expires, setExpires] = useState('');
  const [copied, setCopied] = useState('');
  const copy = async (text: string, what: string) => { try { await navigator.clipboard.writeText(text); setCopied(what); } catch { setCopied('Copy failed; select the text instead.'); } };
  const link = (code: string) => `${window.location.origin}/app?sponsor=${code}`;
  return <section className="border-t border-border py-8" aria-labelledby={`org-${o.id}`}>
    <div className="flex flex-wrap justify-between gap-3 items-start">
      <div>
        <h2 id={`org-${o.id}`} className="font-heading text-2xl">{o.name}</h2>
        <p className="text-sm text-muted-foreground mt-1">{ORGANISATION_KINDS[o.kind]} · <strong className="font-semibold">{o.status}</strong> · {dateLabel(o.starts_on)} to {dateLabel(o.ends_on)}{o.contact_name || o.contact_email ? ` · ${[o.contact_name, o.contact_email].filter(Boolean).join(', ')}` : ''}</p>
      </div>
      <Button variant="outline" onClick={edit}>Edit</Button>
    </div>
    <p className="mt-4"><span className="font-heading text-3xl tabular-nums">{row.seats_used}</span> <span className="text-muted-foreground">of {o.seats} places used</span></p>
    <h3 className="font-semibold mt-6 mb-2">Codes</h3>
    {row.codes.length === 0 ? <p className="text-sm text-muted-foreground">No codes yet.</p> :
      <div className="overflow-x-auto"><table className="w-full text-sm border-t border-border min-w-[560px]">
        <thead><tr className="text-left text-muted-foreground"><th scope="col" className="py-2 pr-3 font-normal">Code</th><th scope="col" className="py-2 px-3 font-normal text-right">Used</th><th scope="col" className="py-2 px-3 font-normal">Expires</th><th scope="col" className="py-2 pl-3 font-normal">Share</th></tr></thead>
        <tbody>{row.codes.map(c => <tr key={c.code} className="border-t border-border">
          <th scope="row" className={`py-2 pr-3 text-left font-mono font-normal ${c.active ? '' : 'line-through text-muted-foreground'}`}>{formatSponsorCode(c.code)}</th>
          <td className="py-2 px-3 text-right tabular-nums">{c.redeemed_count} / {c.max_redemptions}</td>
          <td className="py-2 px-3">{c.expires_on ? dateLabel(c.expires_on) : 'With the term'}</td>
          <td className="py-2 pl-3 whitespace-nowrap"><button className="underline mr-3" onClick={() => copy(link(c.code), `Link for ${formatSponsorCode(c.code)} copied.`)}>Copy link</button>
            <button className="underline" onClick={() => save({ action: 'code', code: c.code, active: !c.active }, `${formatSponsorCode(c.code)} ${c.active ? 'switched off' : 'switched on'}.`)}>{c.active ? 'Switch off' : 'Switch on'}</button></td>
        </tr>)}</tbody>
      </table></div>}
    {o.status !== 'ended' && <form className="flex flex-wrap gap-3 items-end mt-4" onSubmit={e => { e.preventDefault(); void save({ action: 'codes', organisationId: o.id, count, maxRedemptions: max, expiresOn: expires || null }, `Created ${count} code${count === 1 ? '' : 's'} for ${o.name}.`); }}>
      <label className="text-sm">New codes<input type="number" min={1} max={50} className={`${field} w-24`} value={count} onChange={e => setCount(Number(e.target.value))} /></label>
      <label className="text-sm">Families per code<input type="number" min={1} max={100000} className={`${field} w-32`} value={max} onChange={e => setMax(Number(e.target.value))} /></label>
      <label className="text-sm">Code expires (optional)<input type="date" className={`${field} w-44`} value={expires} onChange={e => setExpires(e.target.value)} /></label>
      <Button type="submit" variant="outline">Create codes</Button>
    </form>}
    <h3 className="font-semibold mt-8 mb-2">What {o.name} sees</h3>
    <table className="w-full text-sm border-t border-border"><tbody>{REPORT_LINES.map(([key, label]) => <tr key={key} className="border-t border-border">
      <th scope="row" className="py-2 pr-4 text-left font-normal">{label}</th><td className="py-2 pl-3 text-right tabular-nums">{row.report[key]}</td>
    </tr>)}</tbody></table>
    <div className="flex flex-wrap gap-4 items-center mt-3 text-sm"><button className="underline" onClick={() => copy(reportText(row), 'Summary copied.')}>Copy summary for {o.name}</button><span role="status" className="text-muted-foreground">{copied}</span></div>
  </section>;
}
