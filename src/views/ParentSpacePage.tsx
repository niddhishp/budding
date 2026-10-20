"use client";
import { useState } from 'react';
import { CareFrame, buttonClass, fieldClass } from '@/components/care/CareFrame';
import { useAppStore } from '@/stores/appStore';

const resets = [
  ['pause', 'A quiet minute', 'If your child is safely supervised, sit or stand somewhere comfortable. Notice your feet and a few things around you. Breathe at your usual pace. You don’t have to fix the whole day right now.'],
  ['rest', 'A little rest', 'Choose one non-urgent thing that can wait. Ask for a short protected break if support is available. Rest does not need to be earned by finishing everything.'],
  ['company', 'Someone to talk to', 'Think of one person you can be honest with. A simple “Today feels heavy. Could you listen for a few minutes?” is enough to begin.'],
] as const;
export function ParentSpacePage() {
  const { children, selectChild, setPage, setAddingChild, openAsk } = useAppStore();
  const expecting = children.filter(c => c.age.stage === 'pregnancy');
  const [reset, setReset] = useState<(typeof resets)[number][0]>('pause');
  const [task, setTask] = useState('the evening meal');
  const [solo, setSolo] = useState(false);
  return <CareFrame title="Room for you, too" intro="You are part of this family’s wellbeing. A little breathing room, a lighter load and support that fits your real day.">
    <section className="mb-8 border-y py-6"><h2 className="font-heading text-2xl">No need to have it all figured out</h2><p className="mt-3 text-slate-600">Talk through a worry with Kahiye’s AI, or request a real conversation with a professional.</p><div className="flex flex-wrap gap-5"><button className="text-clay underline py-3" onClick={() => openAsk('talk')}>Just chat →</button><button className="text-clay underline py-3" onClick={() => useAppStore.getState().openExpert('menu')}>Talk to a professional →</button></div></section>
    <section className="bg-paper-deep rounded-[1.75rem] p-6 sm:p-8">
      <h2 className="font-heading text-2xl mb-4">What would help right now?</h2>
      <div className="flex flex-wrap gap-3">{resets.map(([id, title]) => <button key={id} aria-pressed={reset === id} className={`border rounded-full px-4 py-3 ${reset === id ? 'border-clay bg-clay/10' : 'border-slate-300'}`} onClick={() => setReset(id)}>{title}</button>)}</div>
      <p className="mt-6 leading-relaxed text-slate-700" aria-live="polite">{resets.find(r => r[0] === reset)?.[2]}</p>
    </section>
    <section className="py-8 border-b">
      <h2 className="font-heading text-3xl">Share the load, including the planning</h2>
      <p className="text-slate-600 mt-3">Choose one responsibility. Agree who will notice it, plan it and follow it through, so asking for help does not leave you managing every step.</p>
      <label className="block mt-5">One thing to make easier<select className={fieldClass} value={task} onChange={e => setTask(e.target.value)}>{['the evening meal', 'school preparation', 'laundry', 'the bedtime routine', 'appointment planning'].map(t => <option key={t}>{t}</option>)}</select></label>
      <label className="flex gap-3 mt-5"><input type="checkbox" checked={solo} onChange={e => setSolo(e.target.checked)} />I’m managing this without another adult at home</label>
      <div className="mt-5 border-l-2 border-clay pl-5" aria-live="polite"><p className="text-sm text-clay mb-2">A way to start</p><p className="leading-relaxed">{solo ? `What can I simplify about ${task} today? Is there a trusted person or community service I can ask for one specific, realistic piece of help?` : `“Could you take responsibility for ${task}, including the planning? Let’s agree what needs doing and when, then check in about how it went.”`}</p></div>
      <p className="text-sm text-slate-500 mt-4">These choices are just for this visit. No message is sent and no task is assigned to anyone.</p>
      <button className="text-clay underline py-3 mt-2" onClick={() => openAsk('talk', `Help me draft a simple family agreement about ${task}. ${solo ? 'I am managing without another adult at home, so keep it realistic.' : 'Ask who is available, then help us agree an owner, a backup and a check-in day.'}`)}>Help me put an agreement into words →</button>
    </section>
    <section className="py-8 border-b"><h2 className="font-heading text-2xl">If you need more than a small reset</h2><p className="mt-3 text-slate-600">If things keep feeling difficult, you can ask for a conversation with a qualified professional. You do not need to wait until everything feels unmanageable.</p><button className="text-clay underline py-3" onClick={() => useAppStore.getState().openExpert('menu')}>Request a conversation →</button><p><a className="text-clay underline text-sm" href="https://www.unicef.org/parenting/mental-health/parent-self-care-tips" target="_blank" rel="noreferrer">More ideas for parent self-care from UNICEF ↗</a></p></section>
    <section className="pt-8"><h2 className="font-heading text-2xl">A new chapter for your family?</h2>
      {expecting.length ? <><p className="text-slate-600 mt-3">Your expecting profiles have their own pregnancy preparations and notes.</p>{expecting.map(c => <button key={c.id} className="block text-clay underline py-3" onClick={() => { selectChild(c.id); setPage('pregnancy'); }}>Open {c.name}’s pregnancy space →</button>)}</> : <p className="text-slate-600 mt-3">Pregnancy guidance appears when you add an expecting profile. Your existing children’s profiles stay as they are.</p>}
      <button className={`${buttonClass} mt-4`} onClick={() => setAddingChild(true, true)}>We’re expecting {children.length ? 'another child' : 'a child'}</button>
    </section>
  </CareFrame>;
}
