import { useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Heart, Sparkles, ArrowRight, ArrowLeft, Shield, X, Loader2 } from 'lucide-react';
import type { TemperamentProfile } from '@/types';

import {
  TRAIT_QUESTIONS, OPTION_VALUES, loadQuizResult, clearQuizResult, type Answers,
} from '@/lib/temperament';

const todayISO = () => new Date().toISOString().slice(0, 10);

const DUE_DATE_KEY = 'budding.dueDate';
function readSavedDueDate(): string | null {
  try {
    const v = localStorage.getItem(DUE_DATE_KEY);
    return v && v >= todayISO() ? v : null;
  } catch { return null; }
}

export function GenomeOnboarding() {
  const { addChild, setAddingChild, children } = useAppStore();
  const canClose = children.length > 0;

  const [step, setStep] = useState(1);
  const [name, setName] = useState(() => loadQuizResult()?.name ?? '');
  // A due date carried over from the public due date calculator starts an "Expecting" profile.
  const [savedDue] = useState(readSavedDueDate);
  const [born, setBorn] = useState(!savedDue);
  const [date, setDate] = useState(savedDue ?? '');
  // Answers carried over from the public quiz, if the parent took it before signing up.
  const [answers, setAnswers] = useState<Answers>(() => loadQuizResult()?.answers ?? {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dateValid = !!date && (born ? date <= todayISO() : date >= todayISO());
  const allAnswered = TRAIT_QUESTIONS.every((q) => answers[q.key] !== undefined);
  const canContinue = step === 1 ? !!name.trim() && dateValid : step === 2 ? (allAnswered || !born) : true;

  const handleComplete = async () => {
    setSaving(true);
    setError(null);
    const temperament = Object.fromEntries(
      TRAIT_QUESTIONS.map((q) => [q.key, answers[q.key] ?? 50]),
    ) as unknown as TemperamentProfile;
    try {
      await addChild({
        name,
        dateOfBirth: born ? date : null,
        dueDate: born ? null : date,
        temperament,
      });
      clearQuizResult();
      try { localStorage.removeItem(DUE_DATE_KEY); } catch { /* storage unavailable */ }
    } catch (err) {
      console.error(err);
      setError('We could not save this profile. Check your connection and try again.');
      setSaving(false);
    }
  };

  const handleNext = () => {
    // Expecting parents skip the temperament step; there is nothing to observe yet.
    if (step === 1 && !born) setStep(3);
    else if (step < 3) setStep(step + 1);
    else handleComplete();
  };
  const handleBack = () => setStep(step === 3 && !born ? 1 : step - 1);

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
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-all duration-500 ${step >= i ? 'w-12 bg-clay' : 'w-4 bg-slate-200'}`}
                />
              ))}
            </div>
            {canClose ? (
              <button
                onClick={() => setAddingChild(false)}
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
                <h2 className="font-heading text-3xl sm:text-4xl text-slate-850 mb-3">Let's meet your child.</h2>
                <p className="text-base sm:text-lg text-slate-500 mb-8 leading-relaxed">
                  Guidance changes with age, so we start with the basics.
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
                <h2 className="font-heading text-3xl sm:text-4xl text-slate-850 mb-3">How is {name.trim() || 'your child'} wired?</h2>
                <p className="text-base sm:text-lg text-slate-500 mb-8 leading-relaxed">
                  Six quick taps. No wrong answers — this tunes every script to their temperament.
                </p>
                <div className="space-y-6">
                  {TRAIT_QUESTIONS.map((q) => (
                    <fieldset key={q.key}>
                      <legend className="font-medium text-slate-850 mb-3">{q.question}</legend>
                      <div className="grid grid-cols-3 gap-2">
                        {q.options.map((label, i) => {
                          const selected = answers[q.key] === OPTION_VALUES[i];
                          return (
                            <button
                              key={label}
                              type="button"
                              onClick={() => setAnswers({ ...answers, [q.key]: OPTION_VALUES[i] })}
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
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="text-center py-6">
                <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-full bg-clay/10 text-clay">
                  <Sparkles className="w-10 h-10" />
                </div>
                <h2 className="font-heading text-3xl sm:text-4xl text-slate-850 mb-3">
                  {born ? `${name.trim()}'s profile is ready.` : 'Welcome to Kahiye.'}
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
                <>{step === 3 ? 'Start' : 'Continue'} <ArrowRight className="w-5 h-5 ml-2" /></>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
