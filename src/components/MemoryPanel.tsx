import { useEffect, useState } from 'react';
import { BookHeart, Loader2, Plus, Trash2 } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import { MEMORY_COLUMNS, memoryFromRow, type MemoryRow } from '@/lib/mappers';
import type { Child, Memory, MemoryKind, MemorySource } from '@/types';

const KIND_LABEL: Record<MemoryKind, string> = {
  what_worked: 'What has worked',
  what_didnt: "What hasn't worked",
  pattern: 'Patterns',
  preference: 'Likes and preferences',
  fact: 'About them',
  observation: 'Observations',
  milestone: 'Milestones',
  joy: 'Moments of joy',
};
const KIND_ORDER = Object.keys(KIND_LABEL) as MemoryKind[];

const SOURCE_LABEL: Record<MemorySource, string> = {
  parent_said: 'You said',
  decode_outcome: 'From a script you rated',
  log: 'From a log',
  ai_inferred: 'Kahiye noticed',
};

/**
 * "What Kahiye remembers": every memory the guidance draws on, attributed and deletable.
 * The parent stays in control of what is kept; sensitive items are never fed back automatically.
 */
export function MemoryPanel({ child }: { child: Child }) {
  const [memories, setMemories] = useState<Memory[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSupabase()
      .from('memories')
      .select(MEMORY_COLUMNS)
      .eq('child_id', child.id)
      .eq('archived', false)
      .order('created_at', { ascending: false })
      .limit(100)
      .returns<MemoryRow[]>()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setFailed(true);
        setMemories(error ? [] : (data ?? []).map(memoryFromRow));
      });
    return () => { cancelled = true; };
  }, [child.id]);

  const forget = async (id: string) => {
    const previous = memories;
    setMemories((m) => m?.filter((x) => x.id !== id) ?? null);
    const { error } = await getSupabase().from('memories').delete().eq('id', id);
    if (error) setMemories(previous);
  };

  const add = async () => {
    const content = draft.trim();
    if (!content) return;
    setAdding(true);
    const { data, error } = await getSupabase()
      .from('memories')
      .insert({ child_id: child.id, kind: 'fact', content, source: 'parent_said', confidence: 1 })
      .select(MEMORY_COLUMNS)
      .single<MemoryRow>();
    setAdding(false);
    if (error) { setFailed(true); return; }
    setMemories((m) => [memoryFromRow(data), ...(m ?? [])]);
    setDraft('');
  };

  const groups = KIND_ORDER
    .map((kind) => ({ kind, items: (memories ?? []).filter((m) => m.kind === kind) }))
    .filter((g) => g.items.length);

  return (
    <section className="p-6 sm:p-8 rounded-[2rem] border border-slate-200/60 bg-white/50 shadow-sm">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-clay/10 flex items-center justify-center">
          <BookHeart className="w-5 h-5 text-clay" />
        </div>
        <h3 className="font-semibold text-slate-850 text-lg">What Kahiye remembers</h3>
      </div>
      <p className="text-sm text-slate-500 leading-relaxed mb-6">
        The guidance for {child.name} draws on these. Remove anything that is wrong or you would rather we forgot.
      </p>

      <form onSubmit={(e) => { e.preventDefault(); add(); }} className="flex gap-2 mb-6">
        <label htmlFor="memory-add" className="sr-only">Tell Kahiye something about {child.name}</label>
        <input
          id="memory-add"
          value={draft}
          maxLength={500}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`e.g., ${child.name} calms down faster with a hug than with words`}
          className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay/50"
        />
        <button
          type="submit"
          disabled={!draft.trim() || adding}
          aria-label="Add"
          className="w-10 h-10 shrink-0 rounded-full bg-slate-850 text-white flex items-center justify-center disabled:opacity-40"
        >
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        </button>
      </form>

      {memories === null ? (
        <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
      ) : failed && !memories.length ? (
        <p className="text-sm text-slate-500">Memory is not available yet. Your guidance still works without it.</p>
      ) : !groups.length ? (
        <p className="text-sm text-slate-500">Nothing yet. As you ask questions and rate scripts, what works for {child.name} collects here.</p>
      ) : (
        <div className="space-y-6">
          {groups.map(({ kind, items }) => (
            <div key={kind}>
              <p className="text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">{KIND_LABEL[kind]}</p>
              <ul className="space-y-2">
                {items.map((m) => (
                  <li key={m.id} className="group flex items-start gap-3 rounded-2xl bg-white border border-slate-100 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800 leading-relaxed">{m.content}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {SOURCE_LABEL[m.source]}
                        {m.source === 'ai_inferred' && m.confidence < 0.8 ? ' · a guess, not a fact' : ''}
                        {m.sensitive ? ' · private, not used automatically' : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => forget(m.id)}
                      aria-label="Forget this"
                      title="Forget this"
                      className="p-1.5 rounded-full text-slate-300 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
