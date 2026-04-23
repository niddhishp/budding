import { useRef, useLayoutEffect, useState } from 'react';
import { ChevronRight, Baby, Flower2, TreePine, Mountain } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const stages = [
  {
    id: 'pregnancy',
    icon: Baby,
    title: 'Pregnancy',
    age: 'Pre-birth',
    color: 'bg-rose-100 text-rose-600',
    milestones: [
      'Week-by-week fetal development tracking',
      'Maternal emotional well-being support',
      'Bonding preparation exercises',
      'Parenting mindset development',
      'Birth planning guidance',
    ],
    focus: 'Preparation & Connection',
  },
  {
    id: 'infancy',
    icon: Baby,
    title: 'Infancy',
    age: '0–2 years',
    color: 'bg-blue-100 text-blue-600',
    milestones: [
      'Secure attachment building',
      'Sleep pattern development',
      'Emotional security foundations',
      'Language exposure & early communication',
      'Motor skill milestones',
    ],
    focus: 'Security & Attachment',
  },
  {
    id: 'early',
    icon: Flower2,
    title: 'Early Childhood',
    age: '3–6 years',
    color: 'bg-amber-100 text-amber-600',
    milestones: [
      'Emotional regulation skills',
      'Imaginative play & creativity',
      'Independence building',
      'Curiosity & exploration',
      'Social skill development',
    ],
    focus: 'Emotion & Imagination',
  },
  {
    id: 'middle',
    icon: TreePine,
    title: 'Middle Childhood',
    age: '7–12 years',
    color: 'bg-green-100 text-green-600',
    milestones: [
      'Learning habits & study skills',
      'Friendship & peer relationships',
      'Responsibility & chores',
      'Confidence & self-esteem',
      'Critical thinking development',
    ],
    focus: 'Learning & Friendship',
  },
  {
    id: 'teen',
    icon: Mountain,
    title: 'Teenage Years',
    age: '13–18 years',
    color: 'bg-purple-100 text-purple-600',
    milestones: [
      'Identity formation & self-discovery',
      'Emotional complexity navigation',
      'Independence & autonomy',
      'Future direction planning',
      'Healthy relationship skills',
    ],
    focus: 'Identity & Independence',
  },
];

export function MilestonesTimelineSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeStage, setActiveStage] = useState(0);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const content = contentRef.current;

    if (!section || !content) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        content,
        { y: '8vh', opacity: 0 },
        {
          y: 0,
          opacity: 1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 75%',
            end: 'top 40%',
            scrub: 0.5,
          },
        }
      );
    }, section);

    return () => ctx.revert();
  }, []);

  const activeStageData = stages[activeStage];
  const Icon = activeStageData.icon;

  return (
    <section
      ref={sectionRef}
      className="relative w-full min-h-screen overflow-hidden bg-canvas py-[10vh]"
      style={{ zIndex: 118 }}
    >
      {/* Radial glow */}
      <div className="absolute inset-0 glow-radial" />

      <div ref={contentRef} className="will-change-transform">
        {/* Header */}
        <div className="text-center mb-10 px-6">
          <span className="inline-block text-xs font-medium uppercase tracking-[0.14em] text-slate-550/75 mb-4">
            18-Year Journey
          </span>
          <h2 className="font-heading font-bold text-section text-slate-850 mb-4">
            Developmental Milestones
          </h2>
          <p className="text-base text-slate-550 max-w-lg mx-auto">
            From pregnancy through age 18—every stage matters. Budding.live grows 
            with your family, providing age-appropriate guidance at every step.
          </p>
        </div>

        {/* Timeline Container */}
        <div className="w-[min(90vw,1100px)] mx-auto">
          <div className="glass-card rounded-[2.5rem] p-6 md:p-10">
            {/* Timeline Navigation */}
            <div className="relative mb-8">
              {/* Progress Line */}
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-200 rounded-full -translate-y-1/2 hidden md:block" />
              <div
                className="absolute top-1/2 left-0 h-1 bg-accent rounded-full -translate-y-1/2 transition-all duration-500 hidden md:block"
                style={{ width: `${(activeStage / (stages.length - 1)) * 100}%` }}
              />

              {/* Stage Buttons */}
              <div className="flex flex-wrap md:flex-nowrap justify-between gap-2 md:gap-0">
                {stages.map((stage, index) => {
                  const StageIcon = stage.icon;
                  const isActive = index === activeStage;
                  const isPast = index < activeStage;

                  return (
                    <button
                      key={stage.id}
                      onClick={() => setActiveStage(index)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${
                        isActive
                          ? 'bg-white shadow-lg scale-105'
                          : 'hover:bg-white/50'
                      }`}
                    >
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                          isActive
                            ? 'bg-accent text-white'
                            : isPast
                            ? 'bg-accent/20 text-accent'
                            : 'bg-slate-200 text-slate-400'
                        }`}
                      >
                        <StageIcon className="w-5 h-5" />
                      </div>
                      <div className="text-center hidden md:block">
                        <p
                          className={`text-xs font-medium ${
                            isActive ? 'text-slate-850' : 'text-slate-550'
                          }`}
                        >
                          {stage.title}
                        </p>
                        <p className="text-[10px] text-slate-400">{stage.age}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stage Details */}
            <div className="grid md:grid-cols-[1fr,1.5fr] gap-6 md:gap-10">
              {/* Left: Stage Info */}
              <div className="p-6 rounded-2xl bg-white/60">
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${activeStageData.color} mb-4`}>
                  <Icon className="w-4 h-4" />
                  <span className="text-xs font-medium">{activeStageData.focus}</span>
                </div>

                <h3 className="font-heading font-bold text-2xl text-slate-850 mb-2">
                  {activeStageData.title}
                </h3>
                <p className="text-sm text-slate-550 mb-6">{activeStageData.age}</p>

                <div className="space-y-3">
                  <p className="text-xs font-medium text-slate-550 uppercase tracking-wide">
                    Key Focus Areas
                  </p>
                  {activeStageData.milestones.slice(0, 3).map((milestone, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-slate-700">{milestone}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: All Milestones */}
              <div className="p-6 rounded-2xl bg-white/40">
                <p className="text-xs font-medium text-slate-550 uppercase tracking-wide mb-4">
                  Complete Milestone Checklist
                </p>

                <div className="grid sm:grid-cols-2 gap-3">
                  {activeStageData.milestones.map((milestone, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/60 hover:bg-white/80 transition-colors"
                    >
                      <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-medium text-accent">
                          {index + 1}
                        </span>
                      </div>
                      <span className="text-sm text-slate-700">{milestone}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 rounded-xl bg-accent/10 border border-accent/20">
                  <p className="text-sm text-slate-700">
                    <span className="font-medium text-accent">Budding.live tip:</span>{' '}
                    Every child develops at their own pace. Our AI adapts to your child's 
                    unique timeline, providing personalized guidance based on their actual 
                    progress, not just their age.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
