import { ParentGuideLinks } from "@/components/care/ParentGuideLinks";
import { GrowthSnapshot } from "@/components/care/GrowthSnapshot";
import { observedPatterns } from "@/lib/moments";
import { useAppStore, type Page } from "@/stores/appStore";
import { milestones as allMilestones, stageInfo } from "@/data/developmentalData";
import { RefreshCw } from "lucide-react";
import { WeeklyReportCard } from "@/components/WeeklyReportCard";
import { MemoryPanel } from "@/components/MemoryPanel";
import { intakeBandForAge } from "@/lib/temperament";
import { HoroscopeCard } from "@/components/care/HoroscopeCard";
import { MemoryStrip } from "@/components/child/MemoryStrip";
import { WhatWorks } from "@/components/child/WhatWorks";
import { useFamilyPlan } from "@/components/care/useFamilyPlan";
import { useTodayDate } from "@/components/care/useTodayDate";
import { familyNavigation } from "@/lib/family-navigation";
import type { Child } from "@/types";

export function ChildProfilePage() {
  const { selectedChildId, children } = useAppStore();
  const child = children.find((c) => c.id === selectedChildId);
  if (!child) return <div className="p-8 text-center text-slate-500">Select a child</div>;
  return <ChildProfile key={child.id} child={child} />;
}

const LINKS: { page: Page; title: string; line: string; born?: boolean }[] = [
  { page: "handbook", title: "Their handbook", line: "Conversations for this age, and your follow-ups." },
  { page: "health", title: "Health diary", line: "Vaccinations, medicines and check-ups.", born: true },
  { page: "interests", title: "Interests", line: "Notice what they love. Make room to explore.", born: true },
  { page: "stories", title: "Story library", line: "Bedtime stories made for them.", born: true },
  { page: "family-plan", title: "Family plan & savings", line: "Dates to remember, goals to save towards." },
  { page: "milestones", title: "Developmental observations", line: "What you notice, in your own words.", born: true },
];

function ChildProfile({ child }: { child: Child }) {
  const { setEditingChild, setPage } = useAppStore();
  const today = useTodayDate();
  const born = familyNavigation(child, today).born;
  const family = useFamilyPlan();
  const stage = stageInfo[child.age.stage];
  const childMilestones = allMilestones.filter((m) => m.stage === child.age.stage);
  const patterns = observedPatterns(child);
  // Legacy (toddler-only) intake, or answers given for an earlier age band.
  const outdated = born && child.intakeBand !== intakeBandForAge(child.age.years, child.age.months);

  return (
    <div className="max-w-6xl mx-auto pt-8 md:pt-12 pb-24 px-4 sm:px-6">
      <header className="flex flex-wrap items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-full bg-clay/10 flex items-center justify-center shrink-0" aria-hidden>
          <span className="font-heading text-2xl text-clay">{child.name.charAt(0)}</span>
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-4xl text-slate-850 leading-tight">{child.name}</h1>
          <p className="text-slate-600 mt-1">
            {child.gender && <>{child.gender === "girl" ? "Girl" : "Boy"} · </>}{child.age.label} · {stage?.title}
          </p>
        </div>
        <button onClick={() => setEditingChild(child.id)} className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2.5 text-sm text-slate-700 hover:border-clay">
          <RefreshCw className="w-4 h-4" aria-hidden /> Update profile
        </button>
      </header>

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-12">
        <div className="min-w-0">
          {born && <MemoryStrip child={child} entries={family.data?.entries} loading={!family.data && !family.error} />}
          {family.error && born && <p className="text-sm mb-6">Photo memories could not be loaded. <button className="underline" onClick={family.reload}>Try again</button></p>}

          {born && <WhatWorks child={child} />}

          {born && <GrowthSnapshot child={child} />}

          {stage && <section className="border-y py-7 my-8" aria-labelledby="stage-title">
            <p className="text-sm text-clay">This stage</p>
            <h2 id="stage-title" className="font-heading text-2xl text-slate-850 mt-2">{stage.title}</h2>
            <p className="text-slate-600 leading-7 mt-3">{stage.description}</p>
            <div className="flex flex-wrap gap-2 mt-4">
              {stage.keyThemes.map((theme) => <span key={theme} className="rounded-full bg-clay/10 text-clay px-3 py-1 text-sm">{theme}</span>)}
            </div>
            {!!childMilestones.length && <details className="mt-5">
              <summary className="cursor-pointer py-2 text-slate-800">Things you may notice at this stage</summary>
              <p className="text-sm text-slate-500 mt-2">General examples, not a record of your child’s progress.</p>
              <ul className="mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-2">
                {childMilestones.map((m) => <li key={m.id} className="text-slate-700">{m.title} <span className="text-sm text-slate-500">· {m.ageRange}</span></li>)}
              </ul>
            </details>}
          </section>}

          {born && <WeeklyReportCard child={child} />}

          <nav aria-label={`More for ${child.name}`} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 my-8">
            {LINKS.filter((l) => born || !l.born).map((l) => <button key={l.page} onClick={() => setPage(l.page)} className="text-left rounded-2xl border border-slate-200 bg-surface p-5 hover:border-clay transition-colors">
              <span className="block font-heading text-xl text-slate-850">{l.title}</span>
              <span className="block text-sm text-slate-600 mt-1">{l.line}</span>
            </button>)}
          </nav>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start" aria-label={`Alongside ${child.name}`}>
          {born && <ParentGuideLinks child={child} />}
          {born && <HoroscopeCard child={child} profile />}
          <section className="rounded-2xl border border-slate-200 bg-surface p-6" aria-labelledby="patterns-title">
            <h2 id="patterns-title" className="font-heading text-xl text-slate-850">This season’s patterns</h2>
            <div className="space-y-4 mt-4">
              {patterns.length ? patterns.map((p) => <div key={p.key}>
                <p className="text-sm font-medium text-slate-800">{p.situation}</p>
                <p className="text-sm text-slate-600 mt-1">{p.answer}</p>
              </div>) : <p className="text-sm text-slate-600">
                {born ? "No current moments added. You can get help without answering any questions." : "There will be time to notice their little patterns after they arrive."}
              </p>}
              <p className="text-xs text-slate-500">Observations change with the day. They are not a score or a fixed type.</p>
              {outdated && <p className="text-sm text-clay">Earlier answers are kept. Add current moments whenever you are ready.</p>}
            </div>
            <ProfileList label="Wants help with" items={child.focusAreas} />
            <ProfileList label="At home" items={child.household} />
            <ProfileList label="Languages" items={child.homeLanguages} />
            {child.profileNotes && <div className="mt-4"><p className="text-xs font-medium text-slate-500 mb-1">Notes</p><p className="text-sm text-slate-700 leading-relaxed">{child.profileNotes}</p></div>}
          </section>
          {born && <section className="rounded-2xl bg-paper-deep p-6" aria-labelledby="gifts-title">
            <h2 id="gifts-title" className="font-heading text-xl text-slate-850">Gifts & finds</h2>
            <p className="text-sm text-slate-600 mt-2">Ideas for birthdays and rewards, chosen for their age and what you prefer.</p>
            <div className="flex flex-wrap gap-x-5 mt-3">
              <button className="text-clay underline py-2" onClick={() => setPage("gifts")}>Gifts & rewards</button>
              <button className="text-clay underline py-2" onClick={() => setPage("shop")}>Useful finds</button>
            </div>
            <p className="text-xs text-slate-600 mt-2">Some retailer links earn Kahiye a small fee. It never changes what we suggest.</p>
          </section>}
        </aside>
      </div>

      <details className="mt-10 border-t pt-6">
        <summary className="cursor-pointer font-heading text-xl text-slate-850 py-2">What Kahiye remembers about {child.name}</summary>
        <div className="mt-4"><MemoryPanel child={child} /></div>
      </details>
    </div>
  );
}

function ProfileList({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return <div className="mt-4">
    <p className="text-xs font-medium text-slate-500 mb-2">{label}</p>
    <div className="flex flex-wrap gap-2">{items.map((item) => <span key={item} className="px-3 py-1 rounded-full bg-paper-deep text-slate-700 text-sm">{item}</span>)}</div>
  </div>;
}
