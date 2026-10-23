"use client";
import { useAppStore } from "@/stores/appStore";
import { lengthLabel, nextStep, programmeAgeLabel, programmesForChild, stepWord, todayProgramme } from "@/lib/programmes";
import { useProgrammes } from "@/components/care/useProgrammes";
import type { Programme } from "@/data/programmes";
import type { Child } from "@/types";

/** Handbook: guided programmes for the child's age now, and those coming up within a year. */
export function ProgrammeShelf({ child, today }: { child: Child; today: string }) {
  const { openProgramme } = useAppStore();
  const plan = useProgrammes(child.id);
  const { current, comingUp, inPreview } = programmesForChild(child, today);
  if (!current.length && !comingUp.length && !inPreview.length) return null;
  const active = (p: Programme) => plan.enrolments?.find(e => e.programme_id === p.id && e.status === "active");
  const status = (p: Programme) => {
    const e = active(p);
    if (!e) return "";
    const step = nextStep(e, p);
    return step ? ` · ${stepWord(p)} ${step} of ${p.steps.length}` : " · ready to finish";
  };
  return <section aria-labelledby="programmes-title" className="mb-10">
    <h2 id="programmes-title" className="font-heading text-3xl">Guided programmes</h2>
    <p className="text-slate-600 mt-2">A short plan for a bigger stage: words to say, one small thing to do together, and a tick when it’s done. Free during early access.</p>
    {!!current.length && <div className="divide-y border-b mt-2">{current.map(p => <button key={p.id} className="w-full text-left py-5 grid grid-cols-[1fr_auto] gap-3 group" onClick={() => openProgramme(p.id)}>
      <span>
        <span className="text-xs text-clay">{lengthLabel(p)} · {programmeAgeLabel(p)}{status(p)}</span>
        <span className="block font-heading text-2xl mt-1 group-hover:text-clay">{p.title}</span>
        <span className="block text-slate-600 mt-1">{p.summary}</span>
      </span><span aria-hidden="true">→</span>
    </button>)}</div>}
    {!!comingUp.length && <div className="mt-4">
      <p className="text-sm text-slate-600">Coming up in the next year. A preview, not a timetable.</p>
      <ul>{comingUp.map(p => <li key={p.id}><button className="text-clay underline py-2 text-left" onClick={() => openProgramme(p.id)}>{p.title} <span className="text-slate-600 no-underline">· {programmeAgeLabel(p)}</span></button></li>)}</ul>
    </div>}
    {!!inPreview.length && <div className="mt-4">
      <p className="text-sm text-slate-600">In preview. Sensitive topics waiting for clinical and safeguarding review. You can read and use them now.</p>
      <ul>{inPreview.map(p => <li key={p.id}><button className="text-clay underline py-2 text-left" onClick={() => openProgramme(p.id)}>{p.title}<span className="text-slate-600 no-underline">{status(p)}</span></button></li>)}</ul>
    </div>}
  </section>;
}

/** Today: at most one card, for the active programme touched most recently. */
export function ProgrammeToday({ child }: { child: Child }) {
  const { openProgramme } = useAppStore();
  const plan = useProgrammes(child.id);
  const pick = todayProgramme(plan.enrolments ?? []);
  if (!pick) return null;
  const { programme, step } = pick, word = stepWord(programme), current = step ? programme.steps[step - 1] : null;
  return <section className="mb-8 rounded-2xl bg-paper-deep p-6">
    <p className="text-sm text-clay">{current ? `${word} ${step} of ${programme.steps.length}` : `All ${lengthLabel(programme)} done`} · {programme.title}</p>
    <h2 className="font-heading text-2xl mt-2">{current ? current.title : "Ready to look back?"}</h2>
    {current && <p className="text-slate-700 leading-7 mt-3">“{current.words}”</p>}
    <button className="text-clay underline py-3 mt-1" onClick={() => openProgramme(programme.id)}>{current ? `Open ${word.toLowerCase()} ${step} →` : "Finish and see what changed →"}</button>
  </section>;
}
