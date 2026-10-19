import { ParentGuideLinks } from "@/components/care/ParentGuideLinks";
import { GrowthSnapshot } from "@/components/care/GrowthSnapshot";
import { observedPatterns } from "@/lib/moments";
import { useAppStore } from "@/stores/appStore";
import {
  milestones as allMilestones,
  stageInfo,
} from "@/data/developmentalData";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Star, Circle, Target, RefreshCw } from "lucide-react";
import { WeeklyReportCard } from "@/components/WeeklyReportCard";
import { MemoryPanel } from "@/components/MemoryPanel";
import { intakeBandForAge } from "@/lib/temperament";
import { HoroscopeCard } from "@/components/care/HoroscopeCard";

const SPRING_TRANSITION = {
  type: "spring",
  stiffness: 100,
  damping: 20,
} as const;

export function ChildProfilePage() {
  const { selectedChildId, children, setEditingChild, setPage } = useAppStore();
  const child = children.find((c) => c.id === selectedChildId);

  if (!child)
    return <div className="p-8 text-center text-slate-500">Select a child</div>;

  const stage = stageInfo[child.age.stage];
  const childMilestones = allMilestones.filter(
    (m) => m.stage === child.age.stage,
  );

  const patterns = observedPatterns(child);
  // Legacy (toddler-only) intake, or answers given for an earlier age band.
  const outdated =
    child.age.stage !== "pregnancy" &&
    child.intakeBand !== intakeBandForAge(child.age.years, child.age.months);

  return (
    <div className="max-w-4xl mx-auto pt-12 pb-24 px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING_TRANSITION}
        className="mb-16 text-center"
      >
        <div className="w-24 h-24 mx-auto rounded-full bg-clay/10 flex items-center justify-center mb-6">
          <span className="font-heading text-4xl text-clay">
            {child.name.charAt(0)}
          </span>
        </div>
        <h1 className="font-heading text-4xl md:text-5xl text-slate-850 leading-tight mb-3">
          {child.name}'s Journey
        </h1>
        <p className="text-slate-500 uppercase tracking-widest text-sm font-medium">
          {child.gender && <>{child.gender === 'girl' ? 'Girl' : 'Boy'} &middot; </>}
          {child.age.label} &middot; {stage?.title}
        </p>
      </motion.div>

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <button
          onClick={() => setPage("photo-timeline")}
          className="text-left border-y py-6 px-3"
        >
          <span className="block font-heading text-2xl">Photo timeline →</span>
          <span className="text-sm text-slate-600">
            Keep their milestones and your favourite moments.
          </span>
        </button>
        <button
          onClick={() => setPage("family-plan")}
          className="text-left border-y py-6 px-3"
        >
          <span className="block font-heading text-2xl">Family plan →</span>
          <span className="text-sm text-slate-600">
            Dates to remember and goals to save towards.
          </span>
        </button>
      </div>
      {child.age.stage !== "pregnancy" && (
        <section className="mb-12">
          <ParentGuideLinks key={`guides-${child.id}`} child={child} />
          <button className="text-clay underline mb-6" onClick={() => setPage("stories")}>Open {child.name}’s story library →</button>
          <GrowthSnapshot key={child.id} child={child} />
          <div className="grid sm:grid-cols-2 gap-4">
            <button
              className="text-left border-y py-6 px-3"
              onClick={() => setPage("health")}
            >
              <span className="block font-heading text-2xl">
                Health diary →
              </span>
              <span className="text-sm text-slate-600">
                Vaccinations, medication & check-ups
              </span>
            </button>
            <button
              className="text-left border-y py-6 px-3"
              onClick={() => setPage("interests")}
            >
              <span className="block font-heading text-2xl">
                Interests & talents →
              </span>
              <span className="text-sm text-slate-600">
                Notice what they love. Make room to explore.
              </span>
            </button>
          </div>
        </section>
      )}

      {child.age.stage !== "pregnancy" && (
        <WeeklyReportCard key={child.id} child={child} />
      )}
      {child.age.stage !== "pregnancy" && (
        <HoroscopeCard key={`sign-${child.id}`} child={child} profile />
      )}

      <div className="grid md:grid-cols-12 gap-12">
        {/* Left Column - The Memory Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING_TRANSITION, delay: 0.1 }}
          className="md:col-span-8"
        >
          <div className="relative border-l border-slate-200/60 ml-4 md:ml-6 space-y-12 pb-12">
            <div className="relative pl-8 md:pl-12">
              <div className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-canvas border-2 border-clay flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-clay" />
              </div>
              <p className="text-sm text-clay font-medium tracking-widest uppercase mb-2">
                Current Phase
              </p>
              <h2 className="text-2xl font-heading text-slate-850 mb-4">
                {stage?.title}
              </h2>
              <p className="text-slate-600 leading-relaxed mb-6">
                {stage?.description}
              </p>
              <div className="flex flex-wrap gap-2">
                {stage?.keyThemes.map((theme, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="bg-clay/10 text-clay border-0 font-medium px-3 py-1"
                  >
                    {theme}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="relative pl-8 md:pl-12">
              <div className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-canvas border border-slate-300 flex items-center justify-center">
                <Star className="w-3 h-3 text-slate-400" />
              </div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-heading text-slate-850">
                  Things you may notice
                </h3>
              </div>

              <p className="text-sm text-slate-500 mb-4">
                General stage examples, not a record of your child’s progress.
              </p>
              <div className="space-y-4">
                {childMilestones.map((milestone) => (
                  <div
                    key={milestone.id}
                    className="flex gap-4 p-5 rounded-[2rem] border bg-white/50 border-slate-200/60"
                  >
                    <Circle className="w-5 h-5 text-slate-300 shrink-0 mt-1" />
                    <div>
                      <p className="text-base mb-1 text-slate-700">
                        {milestone.title}
                      </p>
                      <p className="text-xs text-slate-500 uppercase tracking-wider">
                        {milestone.ageRange}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Sidebar - Parent observations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING_TRANSITION, delay: 0.2 }}
          className="md:col-span-4 space-y-6"
        >
          <div className="p-8 rounded-[2rem] border border-slate-200/60 bg-white/50 backdrop-blur-md shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-leaf/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-leaf" />
              </div>
              <h3 className="font-semibold text-slate-850 text-lg">
                This season's patterns
              </h3>
            </div>

            <div className="space-y-5">
              {patterns.length ? (
                patterns.map((p) => (
                  <div key={p.key}>
                    <p className="text-sm font-medium text-slate-800">
                      {p.situation}
                    </p>
                    <p className="text-sm text-slate-600 mt-1">{p.answer}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-600">
                  {child.age.stage === "pregnancy"
                    ? "There will be time to notice their little patterns after they arrive."
                    : "No current moments added. You can get help without answering any questions."}
                </p>
              )}
              <p className="text-xs text-slate-500">
                Your observations can change with the day. They are not a score
                or a fixed type.
              </p>
            </div>

            {outdated && (
              <p className="mt-6 text-sm text-clay leading-relaxed">
                Any earlier answers are kept. Add current moments whenever you
                are ready.
              </p>
            )}
            <button
              onClick={() => setEditingChild(child.id)}
              className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:border-slate-300"
            >
              <RefreshCw className="w-4 h-4" /> Update profile
            </button>
          </div>

          {(child.focusAreas.length > 0 ||
            child.household.length > 0 ||
            child.homeLanguages.length > 0 ||
            child.profileNotes) && (
            <div className="p-8 rounded-[2rem] border border-slate-200/60 bg-white/50 shadow-sm space-y-5">
              <ProfileList label="Wants help with" items={child.focusAreas} />
              <ProfileList label="At home" items={child.household} />
              <ProfileList label="Languages" items={child.homeLanguages} />
              {child.profileNotes && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
                    Notes
                  </p>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {child.profileNotes}
                  </p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>

      <div className="mt-12">
        <MemoryPanel key={child.id} child={child} />
      </div>
    </div>
  );
}

function ProfileList({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-sm"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
