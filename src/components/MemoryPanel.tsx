import { useCallback, useEffect, useRef, useState } from 'react';
import { BookHeart, Loader2 } from 'lucide-react';
import { useRequestScope } from '@/hooks/useRequestScope';
import { memoryStatus } from '@/lib/memory-controls';
import type { Child, Memory, MemorySource } from '@/types';

const SOURCE: Record<MemorySource, string> = { parent_said: 'You shared this', decode_outcome: 'From guidance you rated', log: 'From a saved moment', ai_inferred: 'AI suggestion' };
const STATUS = { active: 'Available for guidance', suggested: 'Waiting for your review', expired: 'Review due · not used', private: 'Private · not used', stopped: 'Stopped · not used' };
const control = 'min-h-11 rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-clay disabled:opacity-50';
type Retention = '30' | '90' | '365' | 'forever';
const date = (value: string) => new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

function ReviewPeriod({ value, onChange, id }: { value: Retention; onChange: (v: Retention) => void; id: string }) {
  return <label htmlFor={id} className="grid gap-1 text-sm text-slate-600">Review again
    <select id={id} className={control} value={value} onChange={e => onChange(e.target.value as Retention)}>
      <option value="30">In 30 days</option><option value="90">In 3 months</option><option value="365">In a year</option><option value="forever">When I choose</option>
    </select>
  </label>;
}

export function MemoryPanel({ child }: { child: Child }) {
  const scope = useRequestScope();
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [memories, setMemories] = useState<Memory[] | null>(null);
  const [enabled, setEnabled] = useState(child.memoryEnabled !== false);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const working = useRef(false);
  const loadVersion = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [showStopped, setShowStopped] = useState(false);
  const [draft, setDraft] = useState('');
  const [privateDraft, setPrivateDraft] = useState(false);
  const [retention, setRetention] = useState<Retention>('90');
  const receipt = useRef<{ key: string; id: string } | null>(null);
  const [editing, setEditing] = useState<Memory | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editPrivate, setEditPrivate] = useState(false);
  const [editRetention, setEditRetention] = useState<Retention>('90');
  const [undo, setUndo] = useState<Memory | null>(null);

  const load = useCallback(async (offset = 0) => {
    const version = ++loadVersion.current;
    working.current = true; setBusy('load'); setError(null);
    const task = scope.start(15_000);
    try {
      const res = await fetch(`/api/memories?childId=${child.id}&offset=${offset}`, { signal: task.signal });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Memories could not be loaded.');
      if (!task.active() || version !== loadVersion.current) return;
      setMemories(old => offset ? [...(old ?? []), ...body.memories.filter((m: Memory) => !old?.some(x => x.id === m.id))] : body.memories);
      setEnabled(body.enabled); setNextOffset(body.nextOffset);
    } catch (e) { if (mounted.current && version === loadVersion.current) setError(task.signal.aborted ? 'Loading took too long. Try again.' : e instanceof Error ? e.message : 'Could not load memories. Try again.'); }
    finally { task.finish(); if (version === loadVersion.current) { working.current = false; setBusy(null); } }
  }, [child.id, scope]);
  useEffect(() => { void load(); }, [load]);

  const write = async (url: string, method: string, payload: object, onSaved: (body: { memory: Memory; enabled: boolean }) => void) => {
    if (working.current) return;
    working.current = true; setBusy(url); setError(null); setNotice('');
    const task = scope.start(15_000);
    try {
      const res = await fetch(url, { method, signal: task.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Could not save. Your changes are still here.');
      if (task.active()) onSaved(body);
    } catch (e) { if (mounted.current) setError(task.signal.aborted ? 'Saving took too long. Your changes are still here; retry to check the save.' : e instanceof Error ? e.message : 'Could not save. Your changes are still here.'); }
    finally { task.finish(); working.current = false; setBusy(null); }
  };
  const update = (m: Memory, action: 'edit' | 'archive' | 'restore', extra: object = {}) => write(`/api/memories/${m.id}`, 'PATCH', { childId: child.id, revision: m.revision, action, ...extra }, ({ memory }) => {
    setMemories(old => old?.map(item => item.id === memory.id ? memory : item) ?? [memory]);
    if (action === 'archive') { setUndo(memory); setNotice('Stopped. This memory will no longer be used.'); }
    else { setUndo(null); setNotice(action === 'edit' ? 'Memory saved.' : 'Restored. Its privacy and review date still apply.'); }
    setEditing(null);
  });
  const beginEdit = (m: Memory) => { setEditing(m); setEditContent(m.content); setEditPrivate(m.sensitive); setEditRetention(m.expiresAt ? '90' : 'forever'); setError(null); };
  const add = () => {
    const payload = { childId: child.id, content: draft.trim(), sensitive: privateDraft, retention };
    const key = JSON.stringify(payload);
    if (receipt.current?.key !== key) receipt.current = { key, id: crypto.randomUUID() };
    void write('/api/memories', 'POST', { ...payload, id: receipt.current.id }, ({ memory }) => {
      setMemories(old => [memory, ...(old ?? []).filter(m => m.id !== memory.id)]); setDraft(''); receipt.current = null; setNotice('Memory saved.');
    });
  };

  return <section className="p-6 sm:p-8 rounded-[2rem] border border-slate-200/60 bg-white/60 shadow-sm" aria-label="Memory controls">
    <div className="flex items-center gap-3 mb-3"><BookHeart className="w-6 h-6 text-clay" /><h3 className="font-semibold text-slate-850 text-lg">What Kahiye remembers</h3></div>
    <p className="text-sm text-slate-600 leading-relaxed">Keep what helps {child.name}. Correct what has changed. AI suggestions wait for your review before they shape guidance.</p>
    <div className="my-6 rounded-2xl bg-paper-deep p-4">
      <label className="flex items-center justify-between gap-4 font-medium text-slate-800">Use saved memories
        <input type="checkbox" role="switch" checked={enabled} disabled={!!busy || memories === null} className="h-6 w-6 accent-leaf" onChange={e => { const value = e.target.checked; void write('/api/memories', 'PATCH', { childId: child.id, enabled: value }, body => { setEnabled(body.enabled); setNotice(body.enabled ? 'Saved memories are on.' : 'Saved memories are paused.'); }); }} />
      </label>
      <p className="text-sm text-slate-600 mt-2">{enabled ? 'Only memories you have reviewed and kept current are used.' : 'Paused for this child. Existing memories stay here; new AI suggestions and feedback memories are paused too.'} Profile details and any earlier situation you choose to continue still provide context.</p>
    </div>
    <form onSubmit={e => { e.preventDefault(); add(); }} className="space-y-3 mb-6">
      <label htmlFor="memory-add" className="block text-sm font-medium text-slate-800">Something worth remembering</label>
      <textarea id="memory-add" value={draft} maxLength={500} required onChange={e => setDraft(e.target.value)} placeholder={`For example, ${child.name} prefers a little quiet before talking.`} className={`${control} w-full min-h-24`} />
      <div className="flex flex-wrap items-end gap-4"><ReviewPeriod id="memory-retention" value={retention} onChange={setRetention} /><label className="flex items-center gap-2 text-sm py-3"><input type="checkbox" checked={privateDraft} onChange={e => setPrivateDraft(e.target.checked)} className="h-5 w-5 accent-leaf" />Keep private · do not use in guidance</label></div>
      <button disabled={!!busy || !draft.trim() || memories === null} className={`${control} bg-slate-850 text-white`}>Add memory</button>
      <p className="text-xs text-slate-500">When a review is due, this memory stops being used until you review it again.</p>
    </form>
    {error && <div role="alert" className="my-4 rounded-xl bg-red-50 p-4 text-sm text-red-800"><p>{error}</p><button disabled={!!busy} onClick={() => { setEditing(null); void load(); }} className="underline py-2">Reload saved memories</button></div>}
    {notice && <p role="status" className="my-4 text-sm text-leaf">{notice} {undo && <button disabled={!!busy} className="underline font-semibold py-2" onClick={() => update(undo, 'restore')}>Undo</button>}</p>}
    {busy && <p role="status" className="flex items-center gap-2 text-sm text-slate-500 mb-3"><Loader2 className="w-4 h-4 animate-spin" />{busy === 'load' ? 'Loading memories…' : 'Saving…'}</p>}
    <label className="flex items-center gap-2 text-sm text-slate-600 mb-4"><input type="checkbox" checked={showStopped} onChange={e => setShowStopped(e.target.checked)} className="h-5 w-5 accent-leaf" />Show stopped memories</label>
    {memories?.length === 0 && <p className="text-sm text-slate-500">Nothing saved yet. Add something useful above, or review suggestions here after asking for guidance.</p>}
    <ul className="space-y-3">
      {(memories ?? []).filter(m => showStopped || !m.archived).map(m => <li key={m.id} className="rounded-2xl border border-slate-200 bg-white p-4">
        {editing?.id === m.id ? <form className="space-y-3" onSubmit={e => { e.preventDefault(); void update(editing, 'edit', { content: editContent.trim(), sensitive: editPrivate, retention: editRetention }); }}>
          <label htmlFor={`edit-${m.id}`} className="block text-sm font-medium">Make this memory yours</label>
          <textarea id={`edit-${m.id}`} autoFocus value={editContent} onChange={e => setEditContent(e.target.value)} required maxLength={500} className={`${control} w-full min-h-28`} />
          <ReviewPeriod id={`review-${m.id}`} value={editRetention} onChange={setEditRetention} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editPrivate} onChange={e => setEditPrivate(e.target.checked)} className="h-5 w-5 accent-leaf" />Keep private · do not use in guidance</label>
          <div className="flex flex-wrap gap-2"><button disabled={!!busy || !editContent.trim()} className={`${control} bg-slate-850 text-white`}>Save reviewed memory</button><button type="button" disabled={!!busy} className={control} onClick={() => setEditing(null)}>Cancel</button></div>
        </form> : <>
          <p className="text-xs font-medium text-leaf mb-2">{!enabled && memoryStatus(m) === 'active' ? 'Paused · not used' : STATUS[memoryStatus(m)]}</p>
          <p className="text-sm text-slate-800 leading-relaxed break-words whitespace-pre-wrap">{m.content}</p>
          <p className="text-xs text-slate-500 mt-2">{SOURCE[m.source]}{m.confirmedAt ? ` · reviewed ${date(m.confirmedAt)}` : ` · saved ${date(m.createdAt)}`}{m.expiresAt ? ` · review due ${date(m.expiresAt)}` : ' · no scheduled review'}</p>
          <div className="flex flex-wrap gap-2 mt-3"><button disabled={!!busy} className={control} onClick={() => beginEdit(m)}>{m.confirmedAt ? 'Edit or review' : 'Review suggestion'}</button><button disabled={!!busy} className={control} onClick={() => update(m, m.archived ? 'restore' : 'archive')}>{m.archived ? 'Restore memory' : 'Stop using'}</button></div>
        </>}
      </li>)}
    </ul>
    {nextOffset !== null && <button className={`${control} mt-4`} disabled={!!busy} onClick={() => load(nextOffset)}>Load more memories</button>}
    <p className="text-xs text-slate-500 mt-5 leading-relaxed">Guidance can draw on up to 25 of your most recently reviewed memories. Stop using is reversible. It keeps the entry here and does not erase the original saved situation. A request already in progress may still use its earlier context.</p>
  </section>;
}
