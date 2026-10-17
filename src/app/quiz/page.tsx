'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SproutMark } from '@/components/illustrations';
import {
  INTAKE_BANDS, OPTION_VALUES, QUESTION_BANKS, encodeAnswers, saveQuizResult, type Answers, type IntakeBand,
} from '@/lib/temperament';

// Public, no sign-up: age band + six taps → a shareable "this season" pattern. The top of the funnel.
// Questions are asked in situations that fit the child's age (a teen is not asked about textures).
export default function QuizPage() {
  const router = useRouter();
  const [step, setStep] = useState(0); // 0 = name, 1..6 = questions
  const [name, setName] = useState('');
  const [band, setBand] = useState<IntakeBand | null>(null);
  const [answers, setAnswers] = useState<Answers>({});

  const questions = QUESTION_BANKS[band ?? 'toddler'];
  const total = questions.length;
  const question = questions[step - 1];
  const start = () => band && setStep(1);
  const childName = name.trim() || 'your child';

  const answer = (value: number) => {
    const next = { ...answers, [question.key]: value };
    setAnswers(next);
    if (step < total) {
      setStep(step + 1);
      return;
    }
    saveQuizResult(name.trim(), next, band ?? 'toddler');
    const params = new URLSearchParams({ t: encodeAnswers(next) });
    if (name.trim()) params.set('n', name.trim());
    router.push(`/quiz/result?${params}`);
  };

  return (
    <main className="min-h-[100dvh] bg-canvas flex flex-col">
      <header className="flex items-center justify-between px-5 py-5 max-w-2xl w-full mx-auto">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Kahiye home">
          <SproutMark className="w-8 h-8" />
          <span className="font-heading text-2xl text-slate-900">kahiye</span>
        </Link>
        {step > 0 && <span className="text-sm text-slate-400">{step} / {total}</span>}
      </header>

      <div className="h-1 bg-slate-100 max-w-2xl w-full mx-auto rounded-full overflow-hidden">
        <div className="h-full bg-clay transition-all duration-500" style={{ width: `${(step / total) * 100}%` }} />
      </div>

      <div className="flex-1 flex items-center px-5 py-10">
        <div className="max-w-xl w-full mx-auto">
          <AnimatePresence mode="wait">
            {step === 0 ? (
              <motion.div key="intro" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                <p className="text-sm font-semibold text-clay tracking-wide mb-4">Free · 60 seconds</p>
                <h1 className="font-heading text-4xl sm:text-5xl text-slate-900 leading-tight mb-4">
                  What's your child's pattern right now?
                </h1>
                <p className="text-lg text-slate-500 mb-10 leading-relaxed">
                  Six quick questions, matched to their age. Find out why they react the way they do this season, and what works with them now.
                </p>
                <label htmlFor="quiz-name" className="block text-sm font-medium text-slate-700 mb-2">Child's first name (optional)</label>
                <input
                  id="quiz-name"
                  value={name}
                  maxLength={40}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && start()}
                  placeholder="e.g., Ira"
                  className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-clay/50 mb-6"
                />
                <fieldset className="mb-8">
                  <legend className="block text-sm font-medium text-slate-700 mb-2">How old are they?</legend>
                  <div className="flex flex-wrap gap-2">
                    {INTAKE_BANDS.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        aria-pressed={band === b.id}
                        onClick={() => { setBand(b.id); setAnswers({}); }}
                        className={`px-4 py-2.5 rounded-full border-2 text-base transition-all ${
                          band === b.id ? 'border-clay bg-clay/10 text-slate-900' : 'border-slate-200 bg-surface text-slate-600 hover:border-clay/50'
                        }`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <Button onClick={start} disabled={!band} className="h-14 px-8 rounded-full bg-clay hover:bg-clay-deep text-white text-lg">
                  Start <ArrowRight className="w-5 h-5 ml-1" />
                </Button>
              </motion.div>
            ) : (
              <motion.div key={question.key} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
                <p className="text-sm text-slate-400 mb-3">About {childName}</p>
                <h2 className="font-heading text-3xl sm:text-4xl text-slate-900 leading-tight mb-8">{question.question}</h2>
                <div className="space-y-3">
                  {question.options.map((label, i) => {
                    const selected = answers[question.key] === OPTION_VALUES[i];
                    return (
                      <button
                        key={label}
                        onClick={() => answer(OPTION_VALUES[i])}
                        className={`w-full text-left px-6 py-5 rounded-2xl border-2 text-lg transition-all ${
                          selected ? 'border-clay bg-clay/10' : 'border-slate-200 bg-surface hover:border-clay/50'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => setStep(step - 1)} className="mt-8 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
