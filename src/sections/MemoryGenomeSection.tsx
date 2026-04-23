import { useRef, useLayoutEffect } from 'react';
import { FileText, Brain, BarChart3, Dna } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const milestones = [
  { icon: FileText, title: 'First words logged', time: '2 days ago' },
  { icon: Brain, title: 'Emotion pattern recognized', time: '1 week ago' },
  { icon: BarChart3, title: 'Behavior trend detected', time: '2 weeks ago' },
  { icon: Dna, title: 'Genome updated', time: '1 month ago' },
];

export function MemoryGenomeSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headlineCardRef = useRef<HTMLDivElement>(null);
  const memoryCardRef = useRef<HTMLDivElement>(null);
  const emojiRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const headlineCard = headlineCardRef.current;
    const memoryCard = memoryCardRef.current;
    const emojis = emojiRefs.current.filter(Boolean);
    const milestoneItems = memoryCard?.querySelectorAll('.milestone-item');

    if (!section || !headlineCard || !memoryCard) return;

    const ctx = gsap.context(() => {
      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: '+=130%',
          pin: true,
          scrub: 0.6,
        },
      });

      // ENTRANCE (0-30%)
      scrollTl
        .fromTo(
          headlineCard,
          { x: '-55vw', opacity: 0 },
          { x: 0, opacity: 1, ease: 'power2.out' },
          0
        )
        .fromTo(
          memoryCard,
          { x: '55vw', opacity: 0 },
          { x: 0, opacity: 1, ease: 'power2.out' },
          0
        )
        .fromTo(
          emojis,
          { scale: 0.5, opacity: 0 },
          { scale: 1, opacity: 0.9, ease: 'back.out(1.7)' },
          0.1
        );

      // Milestone items stagger
      if (milestoneItems) {
        scrollTl.fromTo(
          milestoneItems,
          { y: '6vh', opacity: 0 },
          { y: 0, opacity: 1, stagger: 0.02, ease: 'power2.out' },
          0.05
        );
      }

      // EXIT (70-100%)
      scrollTl
        .fromTo(
          headlineCard,
          { x: 0, opacity: 1 },
          { x: '-18vw', opacity: 0.25, ease: 'power2.in' },
          0.7
        )
        .fromTo(
          memoryCard,
          { x: 0, opacity: 1 },
          { x: '18vw', opacity: 0.25, ease: 'power2.in' },
          0.7
        );

      if (milestoneItems) {
        scrollTl.fromTo(
          milestoneItems,
          { y: 0, opacity: 1 },
          { y: '8vh', opacity: 0.2, ease: 'power2.in' },
          0.72
        );
      }

      scrollTl.fromTo(
        emojis,
        { y: 0, opacity: 0.9 },
        { y: '18vh', opacity: 0, ease: 'power2.in' },
        0.75
      );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full h-screen overflow-hidden bg-canvas"
      style={{ zIndex: 100 }}
    >
      {/* Radial glow */}
      <div className="absolute inset-0 glow-radial" />

      {/* Headline Card (Left) */}
      <div
        ref={headlineCardRef}
        className="absolute left-[10vw] top-[24vh] w-[34vw] max-w-[480px] will-change-transform"
      >
        <div className="glass-card rounded-[2rem] p-8 md:p-10">
          <h2 className="font-heading font-bold text-section text-slate-850 mb-4">
            A living record of growth.
          </h2>
          <p className="text-base text-slate-550 leading-relaxed">
            Milestones, emotional patterns, and your child's “parenting genome”—a
            personalized model that improves every insight.
          </p>
        </div>
      </div>

      {/* Memory Card (Right) */}
      <div
        ref={memoryCardRef}
        className="absolute left-[52vw] top-[16vh] w-[38vw] max-w-[520px] h-[68vh] max-h-[560px] will-change-transform"
      >
        <div className="glass-card rounded-[2rem] p-6 md:p-8 h-full overflow-y-auto">
          {/* Genome Nodes SVG */}
          <div className="flex justify-center mb-6">
            <svg
              viewBox="0 0 140 100"
              className="w-36 h-24 animate-float"
            >
              {/* Nodes */}
              <circle cx="30" cy="30" r="8" fill="#3ECF8B" opacity="0.8" />
              <circle cx="70" cy="20" r="10" fill="#3ECF8B" opacity="0.9" />
              <circle cx="110" cy="35" r="7" fill="#3ECF8B" opacity="0.7" />
              <circle cx="50" cy="60" r="9" fill="#3ECF8B" opacity="0.85" />
              <circle cx="95" cy="70" r="8" fill="#3ECF8B" opacity="0.75" />
              <circle cx="70" cy="85" r="6" fill="#3ECF8B" opacity="0.6" />
              
              {/* Connections */}
              <line x1="30" y1="30" x2="70" y2="20" stroke="#3ECF8B" strokeWidth="1.5" opacity="0.4" />
              <line x1="70" y1="20" x2="110" y2="35" stroke="#3ECF8B" strokeWidth="1.5" opacity="0.4" />
              <line x1="30" y1="30" x2="50" y2="60" stroke="#3ECF8B" strokeWidth="1.5" opacity="0.4" />
              <line x1="70" y1="20" x2="50" y2="60" stroke="#3ECF8B" strokeWidth="1.5" opacity="0.4" />
              <line x1="70" y1="20" x2="95" y2="70" stroke="#3ECF8B" strokeWidth="1.5" opacity="0.4" />
              <line x1="110" y1="35" x2="95" y2="70" stroke="#3ECF8B" strokeWidth="1.5" opacity="0.4" />
              <line x1="50" y1="60" x2="70" y2="85" stroke="#3ECF8B" strokeWidth="1.5" opacity="0.4" />
              <line x1="95" y1="70" x2="70" y2="85" stroke="#3ECF8B" strokeWidth="1.5" opacity="0.4" />
              <line x1="50" y1="60" x2="95" y2="70" stroke="#3ECF8B" strokeWidth="1.5" opacity="0.4" />
            </svg>
          </div>

          <div className="space-y-3">
            {milestones.map((milestone, index) => {
              const Icon = milestone.icon;
              return (
                <div
                  key={index}
                  className="milestone-item flex items-center gap-4 p-3 rounded-xl bg-white/50"
                >
                  <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-850">
                      {milestone.title}
                    </p>
                  </div>
                  <span className="text-xs text-slate-550">{milestone.time}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Emoji Orbs */}
      <span
        ref={(el) => { emojiRefs.current[0] = el; }}
        className="absolute left-[7vw] top-[76vh] text-[26px] will-change-transform"
      >
        🧸
      </span>
      <span
        ref={(el) => { emojiRefs.current[1] = el; }}
        className="absolute right-[7vw] top-[78vh] text-[22px] will-change-transform"
      >
        🍼
      </span>
    </section>
  );
}
