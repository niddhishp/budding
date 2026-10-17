import { useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Heart, Sparkles, ArrowRight, ArrowLeft, Shield, X, Loader2, Compass } from 'lucide-react';
import { computeAge } from '@/lib/age';
import type { Child, TemperamentProfile } from '@/types';

import {
  QUESTION_BANKS, OPTION_VALUES, FOCUS_AREAS, HOUSEHOLD_OPTIONS, HOME_LANGUAGES,
  intakeBandForAge, loadQuizResult, clearQuizResult, type Answers, type IntakeBand,
} from '@/lib/temperament';

const todayISO = () => new Date().toISOString().slice(0, 10);

const DUE_DATE_KEY = 'budding.dueDate';
function readSavedDueDate(): string | null {
  try {
    const v = localStorage.getItem(DUE_DATE_KEY);
    return v && v >= todayISO() ? v : null;
  } catch { return null; }
}

const STEPS = 4;

function bandFor(born: boolean, date: string): IntakeBand | null {
  if (!born || !date) return null;
  const age = computeAge(date, null);
  return intakeBandForAge(age.years, age.months);
}

/** Starting answers: the child's own (edit) or the public quiz's, but only if given for the same age band. */
function initialAnswers(editChild: Child | undefined): { band: IntakeBand | null; answers: Answers } {
  if (editChild) {
    return editChild.intakeBand
      ? { band: editChild.intakeBand as IntakeBand, answers: { ...editChild.temperament } }
      : { band: null, answers: {} };
  }
  const quiz = loadQuizResult();
  return quiz ? { band: quiz.band ?? 'toddler', answers: quiz.answers } : { band: null, answers: {} };
}

/**
 * Child intake, and retake when `editChild` is given. Age-banded: an 11-year-old is asked about
 * homework and friendships, not textures and new objects. Answers describe this season's patterns.
 */
export function GenomeOnboarding({ editChild }: { editChild?: Child }) {
  const { addChild, updateChild, setAddingChild, setEditingChild, children } = useAppStore();
  const editing = !!editChild;
  const canClose = editing || children.length > 0;
  const close = () => (editing ? setEditingChild(null) : setAddingChild(false));

  const [step, setStep] = useState(1);
  const [name, setName] = useState(() => editChild?.name ?? loadQuizResult()?.name ?? '');
  // A due date carried over from the public due date calculator starts an "Expecting" profile.
  const [savedDue] = useState(() => (editChild ? null : readSavedDueDate()));
  const [born, setBorn] = useState(() => (editChild ? !!editChild.dateOfBirth : !savedDue));
  const [date, setDate] = useState(() => editChild?.dateOfBirth ?? editChild?.dueDate ?? savedDue ?? '');
  const [answerState, setAnswerState] = useState(() => initialAnswers(editChild));
  const [focusAreas, setFocusAreas] = useState<string[]>(editChild?.focusAreas ?? []);
  const [household, setHousehold] = useState<string[]>(editChild?.household ?? []);
  const [languages, setLanguages] = useState<string[]>(editChild?.homeLanguages ?? []);
  const [notes, setNotes] = useState(editChild?.profileNotes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dateValid = !!date && (born ? date <= todayISO() : date >= todayISO());
  const band = dateValid ? bandFor(born, date) : null;
  const questions = band ? QUESTION_BANKS[band] : [];
  // Answers given for a different age band are not carried over.
  const answers = answerState.band === band ? answerState.answers : {};
  const allAnswered = questions.every((q) => answers[q.key] !== undefined);
  const focusOptions = FOCUS_AREAS[band ?? 'pregnancy'];
  const displayName = name.trim() || 'your child';

  const canContinue = step === 1 ? !!name.trim() && dateValid : step === 2 ? allAnswered : true;

  const handleComplete = async () => {
    setSaving(true);
    setError(null);
    const temperament = Object.fromEntries(
      QUESTION_BANKS.toddler.map((q) => [q.key, answers[q.key] ?? 50]),
    ) as unknown as TemperamentProfile;
    const input = {
      name,
      dateOfBirth: born ? date : null,
      dueDate: born ? null : date,
      temperament,
      // Chips from another stage (e.g. after a date correction) are dropped.
      focusAreas: focusAreas.filter((f) => focusOptions.includes(f)),
      household,
      homeLanguages: languages,
      profileNotes: notes,
      intakeBand: band,
    };
    try {
      if (editChild) {
        await updateChild(editChild.id, input);
      } else {
        await addChild(input);
        clearQuizResult();
        try { localStorage.removeItem(DUE_DATE_KEY); } catch { /* storage unavailable */ }
      }
    } catch (err) {
      console.error(err);
      setError('We could not save this profile. Check your connection and try again.');
      setSaving(false);
    }
  };

  // Expecting parents skip the temperament step; there is nothing to observe yet.
  const handleNext = () => {
    if (step === 1 && !born) setStep(3);
    else if (step < STEPS) setStep(step + 1);
    else handleComplete();
  };
  const handleBack = () => setStep(step === 3 && !born ? 1 : step - 1);

  const toggle = (list: string[], set: (v: string[]) => void, value: string) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  return (
    <div className="fixed inset-0 z-50 bg-canvas/80 backdrop-blur-md flex items-end sm:items-center justify-center sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white w-full max-w-2xl max-h-[100dvh] overflow-y-auto rounded-t-[2rem] sm:rounded-[3rem] shadow-2xl border border-slate-200/50"
      >
        <div className="p-6 sm:p-12">
          <div className="flex justify-between items-center mb-8 sm:mb-12">
            <div className="flex gap-2">
              {Array.from({ length: STEPS }, (_, i) => i + 1).map((i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-all duration-500 ${step >= i ? 'w-10 bg-clay' : 'w-4 bg-slate-200'}`}
                />
              ))}
            </div>
            {canClose ? (
              <button
                onClick={close}
                className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <div className="font-heading font-bold text-xl text-slate-850">kahiye</div>
            )}
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="mb-6 inline-flex items-center justify-center w-14 h-14 rounded-full bg-clay/10 text-clay">
                  <Heart className="w-7 h-7" />
                </div>
                <h2 className="font-heading text-3xl sm:text-4xl text-slate-850 mb-3">
                  {editing ? `Update ${editChild.name}'s profile.` : "Let's meet your child."}
                </h2>
                <p className="text-base sm:text-lg text-slate-500 mb-8 leading-relaxed">
                  {editing
                    ? 'Children change. A fresh look every few months keeps the guidance accurate.'
                    : 'Guidance changes with age, so we start with the basics.'}
                </p>
                <div className="space-y-6">
                  <div>
                    <label htmlFor="child-name" className="block text-sm font-medium text-slate-700 mb-2">
                      {born ? 'First name' : 'Name or nickname'}
                    </label>
                    <input
                      id="child-name"
                      type="text"
                      value={name}
                      maxLength={60}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-clay/50"
                      placeholder={born ? 'e.g., Ira' : 'e.g., Little One'}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-100">
                    {[true, false].map((value) => (
                      <button
                        key={String(value)}
                        type="button"
                        onClick={() => { setBorn(value); setDate(''); }}
                        className={`py-3 rounded-xl text-sm font-medium transition-all ${born === value ? 'bg-white shadow-sm text-slate-850' : 'text-slate-500'}`}
                      >
                        {value ? 'Already born' : 'Expecting'}
                      </button>
                    ))}
                  </div>
                  <div>
                    <label htmlFor="child-date" className="block text-sm font-medium text-slate-700 mb-2">
                      {born ? 'Date of birth' : 'Due date'}
                    </label>
                    <input
                      id="child-date"
                      type="date"
                      value={date}
                      min={born ? undefined : todayISO()}
                      max={born ? todayISO() : undefined}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-clay/50"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="mb-6 inline-flex items-center justify-center w-14 h-14 rounded-full bg-leaf/10 text-leaf">
                  <Brain className="w-7 h-7" />
                </div>
                <h2 className="font-heading text-3xl sm:text-4xl text-slate-850 mb-3">How is {displayName} these days?</h2>
                <p className="text-base sm:text-lg text-slate-500 mb-8 leading-relaxed">
                  Six quick taps about the last few weeks. Patterns change with age and season; this is a snapshot, not a label.
                </p>
                <div className="space-y-6">
                  {questions.map((q) => (
                    <fieldset key={q.key}>
                      <legend className="font-medium text-slate-850 mb-3">{q.question}</legend>
                      <div className="grid grid-cols-3 gap-2">
                        {q.options.map((label, i) => {
                          const selected = answers[q.key] === OPTION_VALUES[i];
                          return (
                            <button
                              key={label}
                              type="button"
                              aria-pressed={selected}
                              onClick={() => setAnswerState({ band, answers: { ...answers, [q.key]: OPTION_VALUES[i] } })}
                              className={`min-h-12 px-2 py-2.5 rounded-xl border text-sm leading-tight transition-all ${
                                selected ? 'border-clay bg-clay/10 text-slate-850 font-medium' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="mb-6 inline-flex items-center justify-center w-14 h-14 rounded-full bg-clay/10 text-clay">
                  <Compass className="w-7 h-7" />
                </div>
                <h2 className="font-heading text-3xl sm:text-4xl text-slate-850 mb-3">
                  {born ? `What would help most with ${displayName}?` : 'What is on your mind?'}
                </h2>
                <p className="text-base sm:text-lg text-slate-500 mb-8 leading-relaxed">
                  All optional. Each answer makes the advice fit your home, not a textbook one.
                </p>
                <div className="space-y-7">
                  <ChipGroup label="Right now I want help with" options={focusOptions} value={focusAreas} onToggle={(v) => toggle(focusAreas, setFocusAreas, v)} />
                  <ChipGroup label="At home" options={HOUSEHOLD_OPTIONS} value={household} onToggle={(v) => toggle(household, setHousehold, v)} />
                  <ChipGroup label="Languages spoken at home" options={HOME_LANGUAGES} value={languages} onToggle={(v) => toggle(languages, setLanguages, v)} />
                  <div>
                    <label htmlFor="child-notes" className="block text-sm font-medium text-slate-700 mb-2">
                      Anything else we should know?
                    </label>
                    <textarea
                      id="child-notes"
                      value={notes}
                      maxLength={500}
                      rows={3}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={born ? 'e.g., Loves cricket. New school this year. Gets anxious before tests.' : 'e.g., First baby. My mother-in-law will help after birth.'}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-base focus:outline-none focus:ring-2 focus:ring-clay/50"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="text-center py-6">
                <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-full bg-clay/10 text-clay">
                  <Sparkles className="w-10 h-10" />
                </div>
                <h2 className="font-heading text-3xl sm:text-4xl text-slate-850 mb-3">
                  {editing ? 'Ready to save.' : born ? `${name.trim()}'s profile is ready.` : 'Welcome to Kahiye.'}
                </h2>
                <p className="text-base sm:text-lg text-slate-500 mb-8 leading-relaxed max-w-md mx-auto">
                  {born
                    ? 'Each time you log a moment or tell us whether a script worked, the guidance gets more specific to them.'
                    : 'We will guide you week by week, and the profile grows with your child after birth.'}
                </p>
                <div className="inline-flex items-center gap-3 px-5 py-3 rounded-full bg-slate-50 border border-slate-100 text-slate-600 text-sm font-medium">
                  <Shield className="w-4 h-4 text-clay" />
                  Private to your account. Never sold or shared.
                </div>
                {error && <p className="mt-6 text-sm text-red-600">{error}</p>}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-10 flex items-center justify-between gap-4">
            {step > 1 ? (
              <button onClick={handleBack} disabled={saving} className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            ) : <span />}
            <Button
              onClick={handleNext}
              disabled={!canContinue || saving}
              className="h-14 px-8 bg-slate-850 hover:bg-slate-800 text-white rounded-full text-lg shadow-lg"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>{step === STEPS ? (editing ? 'Save' : 'Start') : 'Continue'} <ArrowRight className="w-5 h-5 ml-2" /></>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ChipGroup({ label, options, value, onToggle }: {
  label: string; options: string[]; value: string[]; onToggle: (v: string) => void;
}) {
  return (
    <fieldset>
      <legend className="font-medium text-slate-850 mb-3">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = value.includes(option);
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              onClick={() => onToggle(option)}
              className={`px-4 py-2 rounded-full border text-sm transition-all ${
                selected ? 'border-clay bg-clay/10 text-slate-850 font-medium' : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
