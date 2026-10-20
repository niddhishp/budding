'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MomentQuiz, MomentReflection } from '@/components/MomentQuiz';
import { SproutMark } from '@/components/illustrations';
import { INTAKE_BANDS, saveQuizResult, type Answers, type IntakeBand } from '@/lib/temperament';
import { MomentResultActions } from './result/MomentResult';

export default function QuizPage() {
  const [step, setStep] = useState<'intro' | 'moments' | 'reflection'>('intro');
  const [name, setName] = useState('');
  const [band, setBand] = useState<IntakeBand | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const finish = (choices: Answers) => { if (band) { setAnswers(choices); saveQuizResult(name.trim(), choices, band); setStep('reflection'); } };
  return <main className="min-h-[100dvh] bg-canvas text-slate-900">
    <header className="max-w-2xl mx-auto px-5 py-6 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2 font-heading text-2xl" aria-label="Kahiye home"><SproutMark className="w-8 h-8" />kahiye</Link>
      <Link href="/app" className="text-sm underline underline-offset-4 py-3">Go straight to help</Link>
    </header>
    <div className="max-w-xl mx-auto px-5 pt-6 pb-16">
      {step === 'intro' && <>
        <p className="text-clay font-medium mb-4">Four little moments · all optional</p>
        <h1 className="font-heading text-4xl sm:text-5xl leading-tight mb-5">A little window into their day.</h1>
        <p className="text-lg text-slate-600 leading-relaxed mb-8">A change of plan. Someone new. One more try. Pick what feels familiar, and take away a small idea for your next moment together.</p>
        <label htmlFor="quiz-name" className="block mb-2">Nickname (optional)</label>
        <input id="quiz-name" maxLength={40} value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Ira" className="w-full border border-slate-200 rounded-2xl bg-white px-4 py-3 mb-6" />
        <fieldset className="mb-7"><legend className="mb-3">How old are they?</legend><div className="flex flex-wrap gap-2">
          {INTAKE_BANDS.map(b => <button key={b.id} type="button" aria-pressed={band === b.id} onClick={() => { if (band !== b.id) setAnswers({}); setBand(b.id); }} className={`rounded-full px-4 py-3 border-2 ${band === b.id ? 'border-clay bg-clay/10' : 'border-slate-200 bg-white'}`}>{b.label}</button>)}
        </div></fieldset>
        <button onClick={() => setStep('moments')} disabled={!band} className="bg-clay text-white rounded-full px-7 py-4 disabled:opacity-40">Let’s take a look</button>
        <p className="mt-5 text-sm text-slate-600">No right answers. No score. Skip anything.</p>
        <Link href="/app" className="inline-block mt-6 text-sm text-leaf underline underline-offset-4">Expecting? Start with your due date instead.</Link>
      </>}
      {step === 'moments' && band && <><h1 className="sr-only">Four everyday moments</h1><MomentQuiz band={band} answers={answers} onChange={setAnswers} onBack={() => setStep('intro')} onFinish={finish} /></>}
      {step === 'reflection' && band && <>
        <h1 tabIndex={-1} ref={el => { el?.focus(); }} className="font-heading text-4xl mb-4 outline-none">A few things to try.</h1>
        <p className="text-lg text-slate-600 mb-8">{name.trim() ? `A little space to notice ${name.trim()}, just as they are today.` : 'A little space to notice your child, just as they are today.'}</p>
        <MomentReflection band={band} answers={answers} />
        <button onClick={() => setStep('moments')} className="mt-6 py-3 underline underline-offset-4 text-slate-600">Revisit my choices</button>
        <MomentResultActions band={band} answers={answers} />
      </>}
    </div>
  </main>;
}
