"use client";
import type { Child } from '@/types';
import { growingBand, observationKey } from '@/data/growing-changes';
import { useCare } from './useCare';
import { CareFrame, CareError, fieldClass } from './CareFrame';
import { useState, type ReactNode } from 'react';

export function GrowingChanges({ child, historyView }: { child: Child; historyView: ReactNode }) {
  const care = useCare(child.id);
  const [history, setHistory] = useState(false);
  const band = growingBand(child.dateOfBirth);
  const settings = care.data?.settings;
  if (!band) return null;
  if (history) return <><div className="max-w-4xl mx-auto px-5 pt-6"><button className="text-clay underline" onClick={() => setHistory(false)}>← Back to conversation prompts</button></div>{historyView}</>;
  return <CareFrame title="Notice the little changes" intro={`Growing up with ${child.name}: a few invitations to listen, notice and connect. These are conversation starters, not skills they must achieve by a deadline.`}>
    <p className="text-clay mb-6">{band.label}</p>
    <CareError error={care.error} reload={care.reload} />
    {!settings && !care.error && <p role="status">Loading your observations…</p>}
    {settings && <>
      <label className="flex gap-3 bg-paper-deep rounded-xl p-5"><input type="checkbox" checked={settings.reminders} disabled={care.busy} onChange={e => void care.save({ ...settings, reminders: e.target.checked }).catch(() => {})} /><span>Show a gentle noticing prompt in Today<span className="block text-sm text-slate-500 mt-1">Optional, matched to their current age. No scores or catch-up list.</span></span></label>
      <div className="divide-y mt-4">{band.prompts.map(([id, title, prompt, idea]) => {
        const key = observationKey(band.id, id);
        return <section key={key} className="py-7"><h2 className="font-heading text-2xl">{title}</h2><p className="mt-3 text-lg">{prompt}</p><p className="mt-3 text-slate-600">{idea}</p>
          <label className="block mt-4 text-sm">Your observation
            <select className={fieldClass} disabled={care.busy} value={settings.observations[key] ?? ''} onChange={e => {
              const observations = { ...settings.observations };
              if (e.target.value) observations[key] = e.target.value as 'noticed' | 'not_yet' | 'discuss';
              else delete observations[key];
              void care.save({ ...settings, observations }).catch(() => {});
            }}><option value="">Leave open</option><option value="noticed">We have talked about this</option><option value="not_yet">An invitation for another day</option><option value="discuss">I would like support with this</option></select>
          </label>
        </section>;
      })}</div>
      <p className="text-xs text-slate-500 mt-4">Your choices save privately to this child. They are not a developmental assessment or automatically reviewed by a clinician. Bring concerns about changes in wellbeing or daily functioning to a qualified professional.</p>
      <details className="mt-8 border-t pt-5"><summary className="cursor-pointer text-sm">{band.id === '3-5' ? 'Milestone checklists and sources' : 'Earlier years and sources'}</summary><p className="mt-3 text-sm">{band.id === '3-5' ? 'The CDC checklists for ages 3, 4 and 5 are still here, with your earlier observations.' : 'Earlier observations are preserved. Open the birth-to-five checklists only when you want to revisit that period.'}</p><button className="text-clay underline py-3" onClick={() => setHistory(true)}>{band.id === '3-5' ? 'Open the milestone checklists' : 'Revisit early-years observations'}</button><p><a className="text-clay underline text-sm" href="https://www.cdc.gov/child-development/positive-parenting-tips/index.html" target="_blank" rel="noreferrer">Parenting resources by age ↗</a></p><p className="text-xs mt-3">The prompts here are Kahiye conversation ideas, not an extension of the CDC milestone checklist.</p></details>
    </>}
  </CareFrame>;
}
