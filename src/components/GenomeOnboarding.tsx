import { useRef, useState } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/stores/appStore';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { MomentQuiz, MomentReflection } from '@/components/MomentQuiz';
import { computeAge } from '@/lib/age';
import { mergeIntake } from '@/lib/moments';
import { FOCUS_AREAS, HOUSEHOLD_OPTIONS, HOME_LANGUAGES, intakeBandForAge, loadQuizResult, clearQuizResult, type Answers, type IntakeBand } from '@/lib/temperament';
import type { Child } from '@/types';

const todayISO = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};
const DUE_DATE_KEY = 'budding.dueDate';
function savedDueDate() {
  try { const date = localStorage.getItem(DUE_DATE_KEY); return date && /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= todayISO() ? date : null; } catch { return null; }
}

export function GenomeOnboarding({ editChild }: { editChild?: Child }) {
  const { addChild, updateChild, setAddingChild, setEditingChild, setPage, children } = useAppStore();
  const canClose = !!editChild || children.length > 0;
  const close = () => editChild ? setEditingChild(null) : setAddingChild(false);
  const [step, setStep] = useState<'basics' | 'moments' | 'review'>('basics');
  const [quiz] = useState(() => editChild ? null : loadQuizResult());
  const [due] = useState(() => editChild ? null : savedDueDate());
  const [name, setName] = useState(editChild?.name ?? '');
  const [born, setBorn] = useState(editChild ? !!editChild.dateOfBirth : !due);
  const [date, setDate] = useState(editChild?.dateOfBirth ?? editChild?.dueDate ?? due ?? '');
  // Only new explicit choices enter this draft. Skipping an edit cannot erase old answers.
  const [draft, setDraft] = useState<{ band: IntakeBand | null; answers: Answers }>({ band: null, answers: {} });
  const [focus, setFocus] = useState(editChild?.focusAreas ?? []);
  const [household, setHousehold] = useState(editChild?.household ?? []);
  const [languages, setLanguages] = useState(editChild?.homeLanguages ?? []);
  const [notes, setNotes] = useState(editChild?.profileNotes ?? '');
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const [error, setError] = useState('');
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(new Date(date).getTime()) && (born ? date <= todayISO() : date >= todayISO());
  const age = validDate && born ? computeAge(date, null) : null;
  const band = age ? intakeBandForAge(age.years, age.months) : null;
  const answers = draft.band === band ? draft.answers : {};
  const valid = !!name.trim() && validDate;
  const setAnswers = (answers: Answers) => setDraft({ band, answers });

  const save = async () => {
    if (!valid || saveLock.current) return;
    saveLock.current = true; setSaving(true); setError('');
    try {
      const input = { name, dateOfBirth: born ? date : null, dueDate: born ? null : date,
        ...mergeIntake(editChild, answers, band), focusAreas: focus, household, homeLanguages: languages, profileNotes: notes };
      if (editChild) await updateChild(editChild.id, input);
      else {
        await addChild(input);
        clearQuizResult();
        try { localStorage.removeItem(DUE_DATE_KEY); } catch { /* storage may be disabled */ }
        setPage(born ? 'ask-ai' : 'dashboard');
      }
    } catch {
      setError('Your profile was not confirmed saved. Your choices are still here. Check your connection and try again.');
    } finally { saveLock.current = false; setSaving(false); }
  };
  const title = step === 'moments' ? 'A few everyday moments' : step === 'review' ? 'Room to notice, room to grow.' : editChild ? `A little update for ${editChild.name}.` : 'Start with the basics.';
  return <Dialog open onOpenChange={open => { if (!open && canClose && !saving) close(); }}>
    <DialogContent showCloseButton={canClose && !saving} className="w-[calc(100%-1rem)] max-w-xl sm:max-w-xl max-h-[95dvh] overflow-y-auto rounded-3xl bg-canvas p-5 sm:p-8 block motion-reduce:animate-none" onEscapeKeyDown={e => { if (!canClose || saving) e.preventDefault(); }} onInteractOutside={e => e.preventDefault()}>
      <DialogTitle className={step === 'moments' ? 'sr-only' : 'font-heading text-3xl leading-tight pr-6 mb-3'}>{title}</DialogTitle>
      <DialogDescription className={step === 'moments' ? 'sr-only' : 'text-slate-600 mb-6'}>A few details help us meet your family where you are. The everyday moments are always optional.</DialogDescription>
      {step === 'basics' && <div className="space-y-5">
        <div><label htmlFor="child-name" className="block mb-2">Name or nickname</label><input id="child-name" autoComplete="off" maxLength={60} value={name} disabled={saving} onChange={e => setName(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3" placeholder="e.g., Ira or Little One" /></div>
        <div className="flex gap-2">{[true, false].map(value => <button key={String(value)} disabled={saving} type="button" aria-pressed={born === value} onClick={() => { if (born !== value) { setBorn(value); setDate(''); } }} className={`flex-1 rounded-xl border px-3 py-3 ${born === value ? 'border-clay bg-clay/10' : 'border-slate-200 bg-white'}`}>{value ? 'Already born' : 'Expecting'}</button>)}</div>
        <div><label htmlFor="child-date" className="block mb-2">{born ? 'Date of birth' : 'Due date'}</label><input id="child-date" type="date" min={born ? undefined : todayISO()} max={born ? todayISO() : undefined} value={date} disabled={saving} onChange={e => setDate(e.target.value)} className="w-full min-w-0 bg-white border border-slate-200 rounded-xl px-4 py-3" /></div>
        <button disabled={!valid || saving} onClick={save} className="w-full rounded-full bg-clay text-white py-4 px-5 disabled:opacity-40">{saving ? 'Saving…' : editChild ? 'Save changes' : born ? 'Get help now' : 'Start my pregnancy journey'}</button>
        {born && <button disabled={!valid || saving} onClick={() => setStep('moments')} className="w-full border border-clay/40 rounded-full px-4 py-3 text-clay disabled:opacity-40">{editChild ? 'Update everyday moments' : 'Add four little moments'}</button>}
        <p className="text-sm text-slate-600">{editChild ? 'Any moments you skip keep their previous answers.' : 'You can add moments later. No quiz needed to begin.'}</p>
        {quiz && band === quiz.band && <button disabled={saving || !valid} onClick={() => { setAnswers(quiz.answers); setStep('review'); }} className="text-sm underline underline-offset-4 py-3 text-leaf">Use my recent quiz choices{quiz.name ? ` for ${quiz.name}` : ''}</button>}
      </div>}
      {step === 'moments' && band && <MomentQuiz band={band} answers={answers} onChange={setAnswers} onBack={() => setStep('basics')} onFinish={next => { setAnswers(next); setStep('review'); }} />}
      {step === 'review' && <>
        {band && <MomentReflection band={band} answers={answers} />}
        <div className="flex flex-wrap gap-3 mt-6"><button disabled={saving} onClick={() => setStep('moments')} className="py-3 underline underline-offset-4 text-slate-600">Revisit my choices</button><button disabled={saving} onClick={() => setStep('basics')} className="py-3 underline underline-offset-4 text-slate-600">Edit basics</button></div>
      </>}
      {step !== 'moments' && <details className="mt-6 border-t border-slate-200 pt-4">
        <summary className="cursor-pointer py-2 text-leaf">A little about home (optional)</summary>
        <fieldset disabled={saving} className="mt-4 space-y-6">
          <ChipGroup label="What would help right now?" options={[...new Set([...FOCUS_AREAS[band ?? 'pregnancy'], ...focus])]} value={focus} setValue={setFocus} />
          <ChipGroup label="At home" options={HOUSEHOLD_OPTIONS} value={household} setValue={setHousehold} />
          <ChipGroup label="Home languages" options={HOME_LANGUAGES} value={languages} setValue={setLanguages} />
          <div><label htmlFor="child-notes" className="block mb-2">Anything else you would like us to know?</label><textarea id="child-notes" maxLength={500} rows={3} value={notes} onChange={e => setNotes(e.target.value)} className="w-full border border-slate-200 bg-white rounded-xl px-4 py-3" /></div>
        </fieldset>
      </details>}
      {step === 'review' && <button disabled={saving} onClick={save} className="mt-6 w-full bg-clay rounded-full text-white px-5 py-4 disabled:opacity-40">{saving ? 'Saving…' : editChild ? 'Save changes' : 'Save and get help'}</button>}
      {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
      <p className="text-xs text-slate-500 mt-6">Saved to your family account. <Link href="/privacy" className="underline">Privacy</Link> · <Link href="/help-now" className="underline">Need urgent support?</Link></p>
    </DialogContent>
  </Dialog>;
}

function ChipGroup({ label, options, value, setValue }: { label: string; options: string[]; value: string[]; setValue: (v: string[]) => void }) {
  return <fieldset><legend className="mb-3 text-sm font-medium">{label}</legend><div className="flex flex-wrap gap-2">{options.map(option => <button key={option} type="button" aria-pressed={value.includes(option)} onClick={() => setValue(value.includes(option) ? value.filter(v => v !== option) : [...value, option])} className={`min-h-11 rounded-full px-3 py-2 border text-sm ${value.includes(option) ? 'border-clay bg-clay/10' : 'border-slate-200 bg-white'}`}>{option}</button>)}</div></fieldset>;
}
