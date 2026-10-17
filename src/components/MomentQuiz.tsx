'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { momentsFor } from '@/lib/moments';
import { OPTION_VALUES, type Answers, type IntakeBand } from '@/lib/temperament';

/** A small paper mobile: four pieces, each finding its place as we move through the scenes. */
function MomentMobile({ index }: { index: number }) {
  return <svg viewBox="0 0 180 74" className="w-40 h-16" aria-hidden="true">
    <path d="M18 9 Q90 35 163 9" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-300" />
    {[34, 72, 110, 148].map((x, i) => <g key={x} opacity={i === index ? 1 : 0.35}>
      <path d={`M${x} ${i === 0 || i === 3 ? 15 : 22}v15`} stroke="currentColor" className="text-slate-400" />
      {i % 2 ? <path d={`M${x} 34q-24 14 0 33q24-19 0-33`} className={i === 1 ? 'fill-leaf' : 'fill-clay'} /> : <circle cx={x} cy="49" r="15" className={i === 0 ? 'fill-turmeric' : 'fill-clay'} />}
    </g>)}
  </svg>;
}

export function MomentQuiz({ band, answers, onChange, onBack, onFinish }: {
  band: IntakeBand; answers: Answers; onChange: (answers: Answers) => void; onBack: () => void; onFinish: (answers: Answers) => void;
}) {
  const [index, setIndex] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const moments = momentsFor(band);
  const moment = moments[index];
  const value = answers[moment.key];
  const selected = OPTION_VALUES.indexOf(value as 20 | 50 | 80);
  useEffect(() => { heading.current?.focus(); }, [index]);
  const next = (choices: Answers = answers) => index === moments.length - 1 ? onFinish(choices) : setIndex(index + 1);
  const skip = () => { const copy = { ...answers }; delete copy[moment.key]; onChange(copy); next(copy); };
  return <section>
    <div className="flex items-center justify-between gap-3 mb-5">
      <p className="text-sm text-slate-600">Moment {index + 1} of {moments.length}</p>
      <MomentMobile index={index} />
    </div>
    <h2 ref={heading} tabIndex={-1} className="font-heading text-3xl sm:text-4xl text-slate-900 outline-none mb-3">{moment.title}</h2>
    <p className="text-lg text-slate-700 leading-relaxed mb-5">{moment.scene}</p>
    <fieldset>
      <legend className="text-sm text-slate-600 mb-3">What feels familiar lately? There is no right answer.</legend>
      <div className="space-y-3">
        {moment.options.map((label, i) => <label key={label} className={`relative flex items-center gap-3 cursor-pointer rounded-2xl border-2 p-4 min-h-16 motion-safe:transition-colors focus-within:ring-2 focus-within:ring-clay focus-within:ring-offset-2 ${selected === i ? 'border-clay bg-clay/10 text-slate-900' : 'border-slate-200 bg-surface text-slate-700 hover:border-clay/50'}`}>
          <input type="radio" name={`moment-${moment.key}`} value={OPTION_VALUES[i]} checked={selected === i} onChange={() => onChange({ ...answers, [moment.key]: OPTION_VALUES[i] })} className="sr-only" />
          <span className={`flex-shrink-0 w-6 h-6 border rounded-full flex items-center justify-center ${selected === i ? 'bg-clay border-clay text-white' : 'border-slate-300'}`} aria-hidden="true">{selected === i && <Check className="w-4 h-4" />}</span>
          <span>{label}</span>
        </label>)}
      </div>
    </fieldset>
    <div aria-live="polite" className="mt-4 text-sm text-slate-600 min-h-12 leading-relaxed">{selected >= 0 ? <>A little idea: {moment.ideas[selected]}</> : 'Some days look different. You can skip this one.'}</div>
    <div className="mt-4 flex flex-wrap gap-3 justify-between items-center">
      <button type="button" onClick={() => index ? setIndex(index - 1) : onBack()} className="min-h-11 inline-flex gap-1 items-center text-slate-700"><ArrowLeft className="w-4 h-4" /> Back</button>
      <button type="button" onClick={() => next()} disabled={selected < 0} className="rounded-full bg-clay text-white px-6 py-3 disabled:opacity-40 inline-flex gap-2 items-center">{index === 3 ? 'See my moments' : 'Next moment'}<ArrowRight className="w-4 h-4" /></button>
    </div>
    <div className="flex flex-wrap justify-between gap-2 mt-3 border-t border-slate-200 pt-2 text-sm text-slate-600">
      <button type="button" onClick={skip} className="min-h-11 underline underline-offset-4">It depends / skip this one</button>
      <button type="button" onClick={() => onFinish(answers)} className="min-h-11 underline underline-offset-4">Finish for now</button>
    </div>
  </section>;
}

export function MomentReflection({ band, answers }: { band: IntakeBand; answers: Answers }) {
  const answered = momentsFor(band).filter(m => answers[m.key] !== undefined);
  return <div className="space-y-6">
    {!answered.length && <p className="text-lg text-slate-700 leading-relaxed">No choices needed. Start with one moment from your day, and we can take it from there.</p>}
    {answered.map(m => {
      const index = OPTION_VALUES.indexOf(answers[m.key] as 20 | 50 | 80);
      if (index < 0) return null;
      return <div key={m.key} className="border-l-2 border-clay/40 pl-5">
        <h3 className="font-heading text-xl text-slate-900 mb-1">{m.title}</h3>
        <p className="text-sm text-slate-600 mb-2">You chose: {m.options[index]}</p>
        <p className="text-slate-800 leading-relaxed">{m.ideas[index]}</p>
      </div>;
    })}
    <p className="text-sm text-slate-600 leading-relaxed">Small ideas to try, not a diagnosis or a personality type. Children and situations change; you can update your choices whenever you like.</p>
  </div>;
}
