'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OPTION_VALUES, TRAIT_QUESTIONS, encodeAnswers, saveQuizResult, type Answers } from '@/lib/temperament';

// Public, no sign-up: six taps → a shareable temperament type. The top of the funnel.
export default function QuizPage() {
  const router = useRouter();
  const [step, setStep] = useState(0); // 0 = name, 1..6 = questions
  const [name, setName] = useState('');
  const [answers, setAnswers] = useState<Answers>({});

  const total = TRAIT_QUESTIONS.length;
  const question = TRAIT_QUESTIONS[step - 1];
  const childName = name.trim() || 'your child';

  const answer = (value: number) => {
    const next = { ...answers, [question.key]: value };
    setAnswers(next);
    if (step < total) {
      setStep(step + 1);
      return;
    }
    saveQuizResult(name.trim(), next);
    const params = new URLSearchParams({ t: encodeAnswers(next) });
    if (name.trim()) params.set('n', name.trim());
    router.push(`/quiz/result?${params}`);
  };

  return (
    <main className="min-h-[100dvh] bg-canvas flex flex-col">
      <header className="flex items-center justify-between px-5 py-5 max-w-2xl w-full mx-auto">
        <Link href="/" className="font-heading font-bold text-xl text-slate-900">Budding.</Link>
        {step > 0 && <span className="text-sm text-slate-400">{step} / {total}</span>}
      </header>

      <div className="h-1 bg-slate-100 max-w-2xl w-full mx-auto rounded-full overflow-hidden">
        <div className="h-full bg-sage transition-all duration-500" style={{ width: `${(step / total) * 100}%` }} />
      </div>

      <div className="flex-1 flex items-center px-5 py-10">
        <div className="max-w-xl w-full mx-auto">
          <AnimatePresence mode="wait">
            {step === 0 ? (
              <motion.div key="intro" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                <p className="text-sm font-semibold text-sage uppercase tracking-widest mb-4">Free · 60 seconds</p>
                <h1 className="font-heading text-4xl sm:text-5xl text-slate-900 leading-tight mb-4">
                  What's your child's temperament type?
                </h1>
                <p className="text-lg text-slate-500 mb-10 leading-relaxed">
                  Six quick questions. Find out why they react the way they do, and what actually works with them.
                </p>
                <label htmlFor="quiz-name" className="block text-sm font-medium text-slate-700 mb-2">Child's first name (optional)</label>
                <input
                  id="quiz-name"
                  value={name}
                  maxLength={40}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && setStep(1)}
                  placeholder="e.g., Advika"
                  className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-sage/50 mb-6"
                />
                <Button onClick={() => setStep(1)} className="h-14 px-8 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-lg">
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
                          selected ? 'border-sage bg-sage/10' : 'border-slate-200 bg-white hover:border-slate-300'
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
