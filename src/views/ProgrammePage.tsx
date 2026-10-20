"use client";
import Link from "next/link";
import { filmEmbed } from "@/data/handbook-films";
import { useState } from "react";
import { useAppStore } from "@/stores/appStore";
import { PROGRAMMES_VERSION, RATING_LABELS, type Programme, type ProgrammeStep } from "@/data/programmes";
import {
  doneCount, findProgramme, isDone, lengthLabel, nextStep, programmeAgeLabel, programmesForChild,
  questionFor, ratingChange, stepWord, suitsProfile, type Enrolment,
} from "@/lib/programmes";
import { CareFrame, buttonClass } from "@/components/care/CareFrame";
import { useProgrammes } from "@/components/care/useProgrammes";
import { useTodayDate } from "@/components/care/useTodayDate";
import type { Child } from "@/types";

export function ProgrammePage() {
  const { children, selectedChildId, programmeId, setPage } = useAppStore();
  const child = children.find(c => c.id === selectedChildId);
  const programme = findProgramme(programmeId);
  if (!child) return <p className="p-8">Select a child to open a programme.</p>;
  if (!programme) return <CareFrame title="Guided programmes" intro="This programme is no longer available.">
    <button className="text-clay underline py-3" onClick={() => setPage("handbook")}>See the programmes in the Handbook</button>
  </CareFrame>;
  return <ProgrammeView key={`${child.id}-${programme.id}`} child={child} programme={programme} />;
}

const releaseDate = new Date(`${PROGRAMMES_VERSION}T12:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

function ProgrammeView({ child, programme }: { child: Child; programme: Programme }) {
  const { openAsk } = useAppStore();
  const today = useTodayDate(), plan = useProgrammes(child.id);
  const mine = (plan.enrolments ?? []).filter(e => e.programme_id === programme.id).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const active = mine.find(e => e.status === "active"), lastFinished = mine.find(e => e.status === "completed");
  const [justFinished, setJustFinished] = useState<Enrolment | null>(null);
  const fits = programmesForChild(child, today).current.some(p => p.id === programme.id);
  const word = stepWord(programme);

  return <CareFrame title={programme.title} intro={programme.summary}>
    <p className="text-sm text-clay -mt-4 mb-6">
      {lengthLabel(programme)} · {programmeAgeLabel(programme)} · {programme.included === "free" ? "Free during early access" : "Included with Plus"} · <span className="whitespace-nowrap">Clinical review pending</span>
    </p>
    {!suitsProfile(programme, child) ? <p className="mb-6 text-sm bg-paper-deep p-4 rounded-xl">This programme is written for parents of daughters. You can still read it.</p>
      : !fits && <p className="mb-6 text-sm bg-paper-deep p-4 rounded-xl">Written for children aged {programmeAgeLabel(programme)}, based on the birth date in {child.name}’s profile. You can read it now and start whenever it fits. Age is a starting point, not a deadline.</p>}
    {plan.error && <p role="alert" className="text-sm mb-6">{plan.error} <button className="underline" onClick={plan.reload}>Reload</button></p>}
    {justFinished?.final && <BeforeAfter enrolment={justFinished} programme={programme} name={child.name} onAsk={() => openAsk("guidance", `We have just finished "${programme.title}" with ${child.name}, and it still feels hard. Here is what is happening: `)} />}

    {active ? <Running key={active.id} programme={programme} enrolment={active} child={child} plan={plan} onFinished={setJustFinished} />
      : <>
        {!justFinished && lastFinished?.final && <BeforeAfter enrolment={lastFinished} programme={programme} name={child.name} earlier />}
        <Overview programme={programme} />
        {plan.enrolments === null ? <p role="status" className="text-sm py-6">Loading your progress…</p>
          : <StartFlow programme={programme} child={child} plan={plan} again={mine.length > 0} />}
      </>}

    {programme.seekHelp && <section className="my-8 border-l-4 border-turmeric pl-5">
      <h2 className="font-heading text-2xl">Talk to a doctor or professional if</h2>
      <p className="leading-7 mt-3">{programme.seekHelp}</p>
    </section>}
    <details className="border-t pt-5 text-sm">
      <summary className="cursor-pointer">Where this comes from · Clinical review pending</summary>
      <p className="mt-3 leading-6">An original Kahiye guided programme, informed by the linked guidance. The sources support the background principles; they have not validated these particular words or activities. Editorial version {releaseDate}. Clinical and safeguarding review pending. It is not an assessment, a diagnosis or therapy.</p>
      <ul className="mt-2">{programme.sources.map(s => <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer" className="inline-block underline text-clay py-2">{s.title} ↗</a></li>)}</ul>
      <p className="leading-6">If a difficulty persists, affects daily life or involves someone being hurt, get support from an appropriate professional. For immediate danger, use <Link className="underline text-clay" href="/help-now">Immediate support</Link>.</p>
    </details>
    <p className="text-xs text-slate-600 mt-6">{word === "Day" ? "One short step a day. Missing a day is fine; pick up where you left off." : "Spread the sessions over a few weeks, at a pace that suits you both."} Your ticks and ratings are private to you and do not become AI memory.</p>
  </CareFrame>;
}

function Overview({ programme }: { programme: Programme }) {
  return <>
    <section className="py-2">
      <h2 className="font-heading text-2xl">Why this matters</h2>
      <p className="leading-7 mt-3">{programme.why}</p>
    </section>
    <section className="my-6 bg-paper-deep rounded-2xl p-6">
      <p className="text-sm text-clay">Before you start</p>
      <p className="leading-7 mt-2">{programme.before}</p>
    </section>
    <section className="py-2">
      <h2 className="font-heading text-2xl">What you’ll do</h2>
      <ol className="mt-3 divide-y">{programme.steps.map((s, i) => <li key={s.title} className="py-3"><span className="text-sm text-clay">{stepWord(programme)} {i + 1}</span><span className="block">{s.title}</span></li>)}</ol>
    </section>
  </>;
}

type Plan = ReturnType<typeof useProgrammes>;

function RatingQuestion({ question, value, onChange }: { question: string; value: number | null; onChange: (n: number) => void }) {
  return <fieldset className="mt-4">
    <legend className="text-slate-700">{question}</legend>
    <div className="flex flex-wrap gap-2 mt-3">{RATING_LABELS.map((label, i) => <button key={label} type="button" aria-pressed={value === i + 1} onClick={() => onChange(i + 1)}
      className={`rounded-full border px-4 py-3 text-sm ${value === i + 1 ? "border-clay bg-clay/10" : "border-slate-300"}`}>{i + 1} · {label}</button>)}</div>
  </fieldset>;
}

function StartFlow({ programme, child, plan, again }: { programme: Programme; child: Child; plan: Plan; again: boolean }) {
  const [asking, setAsking] = useState(false), [rating, setRating] = useState<number | null>(null);
  if (!asking) return <div className="py-6"><button className={buttonClass} onClick={() => setAsking(true)}>{again ? "Start again" : `Start with ${child.name}`}</button></div>;
  return <section className="my-6 rounded-2xl border border-slate-200 p-6" aria-labelledby="baseline-title">
    <p className="text-sm text-clay">One question before you start</p>
    <h2 id="baseline-title" className="font-heading text-2xl mt-2">Where are you starting from?</h2>
    <RatingQuestion question={questionFor(programme, child.name)} value={rating} onChange={setRating} />
    <p className="text-xs text-slate-600 mt-3">1 is easy, 5 is very hard. We’ll ask again at the end, so you can see what changed. It is about how things feel for you, never a score for {child.name}.</p>
    <div className="flex flex-wrap items-center gap-4 mt-5">
      <button disabled={!rating || plan.busy} className={`${buttonClass} disabled:opacity-50`} onClick={() => rating && plan.start(programme.id, rating)}>{plan.busy ? "Starting…" : `Start ${stepWord(programme).toLowerCase()} 1`}</button>
      <button className="underline text-sm text-slate-600 py-3" onClick={() => setAsking(false)}>Not now</button>
    </div>
  </section>;
}

function Running({ programme, enrolment, child, plan, onFinished }: { programme: Programme; enrolment: Enrolment; child: Child; plan: Plan; onFinished: (e: Enrolment) => void }) {
  const next = nextStep(enrolment, programme), word = stepWord(programme);
  const [open, setOpen] = useState<number | null>(next ?? null);
  const [finishing, setFinishing] = useState(false), [rating, setRating] = useState<number | null>(null), [stopping, setStopping] = useState(false);
  const done = doneCount(enrolment, programme), total = programme.steps.length;
  async function toggle(day: number) {
    const saved = await plan.mark(enrolment, day, !isDone(enrolment, day));
    if (saved && isDone(saved, day)) setOpen(nextStep(saved, programme));
  }
  return <>
    <section className="mb-6" aria-live="polite">
      <h2 className="font-heading text-3xl">{next ? `${word} ${next} of ${total}` : `All ${total} ${word.toLowerCase()}s done`}</h2>
      <p className="text-slate-600 mt-2">{done} of {total} ticked. Started {new Date(`${enrolment.started_on}T12:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "long", timeZone: "UTC" })}.</p>
      <div className="mt-3 h-2 rounded-full bg-paper-deep overflow-hidden" aria-hidden="true"><div className="h-full bg-leaf" style={{ width: `${(done / total) * 100}%` }} /></div>
    </section>
    <ol className="divide-y border-y">{programme.steps.map((s, i) => {
      const day = i + 1, ticked = isDone(enrolment, day), expanded = open === day;
      return <li key={s.title} className="py-2">
        <button className="w-full text-left py-3 grid grid-cols-[auto_1fr_auto] gap-3 items-center" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : day)}>
          <span aria-hidden="true" className={`w-7 h-7 rounded-full border grid place-items-center text-sm ${ticked ? "bg-leaf text-white border-leaf" : "border-slate-300"}`}>{ticked ? "✓" : day}</span>
          <span><span className="block text-xs text-clay">{word} {day}{ticked ? " · done" : day === next ? " · up next" : ""}</span><span className="block font-heading text-xl">{s.title}</span></span>
          <span aria-hidden="true">{expanded ? "−" : "+"}</span>
        </button>
        {expanded && <StepBody step={s} day={day} word={word} ticked={ticked} busy={plan.busy} onToggle={() => toggle(day)} />}
      </li>;
    })}</ol>

    <section className="my-8 rounded-2xl border border-slate-200 p-6" aria-labelledby="finish-title">
      <h2 id="finish-title" className="font-heading text-2xl">{next ? "Finish when it feels right" : "Look back together"}</h2>
      <p className="text-slate-600 mt-2">{next ? `You can finish before every ${word.toLowerCase()} is ticked.` : `You’ve done every ${word.toLowerCase()}. One question, then you can see what changed.`}</p>
      {finishing ? <>
        <RatingQuestion question={questionFor(programme, child.name)} value={rating} onChange={setRating} />
        <div className="flex flex-wrap items-center gap-4 mt-5">
          <button disabled={!rating || plan.busy} className={`${buttonClass} disabled:opacity-50`} onClick={async () => { if (!rating) return; const saved = await plan.finish(enrolment, rating); if (saved) onFinished(saved); }}>{plan.busy ? "Saving…" : "Save and finish"}</button>
          <button className="underline text-sm text-slate-600 py-3" onClick={() => setFinishing(false)}>Not yet</button>
        </div>
      </> : <button className={`${next ? "border rounded-full px-5 py-3" : buttonClass} mt-4`} onClick={() => setFinishing(true)}>Finish and look back</button>}
      <div className="mt-6 text-sm">
        {stopping ? <p>Stop this programme? Your ticks stay in your records. <button disabled={plan.busy} className="underline text-clay py-2 ml-1" onClick={() => plan.stop(enrolment)}>Yes, stop it</button> <button className="underline py-2 ml-3" onClick={() => setStopping(false)}>Keep going</button></p>
          : <button className="underline text-slate-600 py-2" onClick={() => setStopping(true)}>Stop this programme</button>}
      </div>
    </section>
    <details className="mb-6"><summary className="cursor-pointer font-heading text-xl py-2">Why this matters</summary><p className="leading-7 mt-3">{programme.why}</p><p className="leading-7 mt-3 text-slate-600">{programme.before}</p></details>
  </>;
}

function StepBody({ step, day, word, ticked, busy, onToggle }: { step: ProgrammeStep; day: number; word: string; ticked: boolean; busy: boolean; onToggle: () => void }) {
  const { openAsk } = useAppStore();
  return <div className="pb-6 pl-10">
    {step.film && filmEmbed(step.film) && <div className="relative mb-5 aspect-video overflow-hidden rounded-xl bg-slate-900"><iframe src={filmEmbed(step.film)!} title={step.title} loading="lazy" className="absolute inset-0 h-full w-full" allow="fullscreen; picture-in-picture" allowFullScreen /></div>}
    <section className="bg-paper-deep rounded-2xl p-6">
      <p className="text-sm text-clay mb-3">Words to say</p>
      <p className="font-heading text-2xl leading-relaxed">“{step.words}”</p>
      <p className="text-sm text-slate-600 mt-3">Say it your way, in your home language.</p>
    </section>
    <h3 className="font-heading text-xl mt-6">One thing to do together</h3>
    <p className="leading-7 mt-2">{step.activity}</p>
    <p className="text-sm mt-4 text-slate-600">Leave out: {step.avoid}</p>
    <div className="flex flex-wrap items-center gap-4 mt-5">
      <button disabled={busy} aria-pressed={ticked} className={ticked ? "rounded-full border border-leaf bg-leaf/10 px-5 py-3 disabled:opacity-50" : `${buttonClass} disabled:opacity-50`} onClick={onToggle}>
        {ticked ? `${word} ${day} done · undo` : `Mark ${word.toLowerCase()} ${day} done`}
      </button>
      {step.practice && <button className="text-clay underline py-3" onClick={() => openAsk("rehearse", step.practice)}>Practise this first</button>}
    </div>
  </div>;
}

function BeforeAfter({ enrolment, programme, name, earlier, onAsk }: { enrolment: Enrolment; programme: Programme; name: string; earlier?: boolean; onAsk?: () => void }) {
  const final = enrolment.final!, change = ratingChange(enrolment.baseline, final);
  const label = (n: number) => `${n} · ${RATING_LABELS[n - 1]}`;
  return <section className="mb-8 rounded-2xl bg-paper-deep p-6" aria-live="polite">
    <p className="text-sm text-clay">{earlier ? "Last time you ran this" : "You finished"} · {programme.title}</p>
    <h2 className="font-heading text-2xl mt-2">{change === "easier" ? "Easier than when you started." : change === "harder" ? "Harder than when you started." : "About the same as when you started."}</h2>
    <dl className="grid grid-cols-2 gap-4 mt-4 max-w-sm">
      <div><dt className="text-sm text-slate-600">At the start</dt><dd className="font-heading text-xl">{label(enrolment.baseline)}</dd></div>
      <div><dt className="text-sm text-slate-600">At the end</dt><dd className="font-heading text-xl">{label(final)}</dd></div>
    </dl>
    <p className="text-slate-700 mt-4">{change === "easier" ? "That’s worth noticing, and worth telling the other adults who help." : change === "harder" ? "That happens, especially while something new is being learned. It is not a verdict on you or on " + name + "." : "Small steps still count. You can run it again whenever it fits."}</p>
    {change === "harder" && onAsk && <button className="text-clay underline py-3" onClick={onAsk}>Talk one of these moments through in Ask →</button>}
    <p className="text-xs text-slate-600 mt-3">Only you see these ratings. Kahiye looks at them only as totals across five or more families.</p>
  </section>;
}
