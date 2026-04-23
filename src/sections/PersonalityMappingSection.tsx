import { useRef, useLayoutEffect } from 'react';
import { Search, Target, Eye, Users } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const traits = [
  {
    icon: Search,
    title: 'Curiosity',
    description: 'Loves questions and exploration.',
    value: 85,
  },
  {
    icon: Target,
    title: 'Persistence',
    description: 'Sticks with challenges.',
    value: 72,
  },
  {
    icon: Eye,
    title: 'Sensitivity',
    description: 'Notices emotions and environment.',
    value: 68,
  },
  {
    icon: Users,
    title: 'Sociability',
    description: 'Recharges with people.',
    value: 78,
  },
];

export function PersonalityMappingSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headlineCardRef = useRef<HTMLDivElement>(null);
  const personalityCardRef = useRef<HTMLDivElement>(null);
  const emojiRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const headlineCard = headlineCardRef.current;
    const personalityCard = personalityCardRef.current;
    const emojis = emojiRefs.current.filter(Boolean);
    const traitItems = personalityCard?.querySelectorAll('.trait-item');

    if (!section || !headlineCard || !personalityCard) return;

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
          personalityCard,
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

      // Trait items stagger
      if (traitItems) {
        scrollTl.fromTo(
          traitItems,
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
          personalityCard,
          { x: 0, opacity: 1 },
          { x: '18vw', opacity: 0.25, ease: 'power2.in' },
          0.7
        );

      if (traitItems) {
        scrollTl.fromTo(
          traitItems,
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
      style={{ zIndex: 60 }}
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
            See your child's unique pattern.
          </h2>
          <p className="text-base text-slate-550 leading-relaxed">
            Map curiosity, persistence, sensitivity, and sociability—then get
            advice that fits.
          </p>
        </div>
      </div>

      {/* Personality Card (Right) */}
      <div
        ref={personalityCardRef}
        className="absolute left-[52vw] top-[16vh] w-[38vw] max-w-[520px] h-[68vh] max-h-[560px] will-change-transform"
      >
        <div className="glass-card rounded-[2rem] p-6 md:p-8 h-full overflow-y-auto">
          {/* Simple Radar SVG */}
          <div className="flex justify-center mb-6">
            <svg
              viewBox="0 0 120 120"
              className="w-28 h-28 animate-pulse-soft"
            >
              {/* Background pentagon */}
              <polygon
                points="60,10 110,45 95,105 25,105 10,45"
                fill="none"
                stroke="rgba(62, 207, 139, 0.2)"
                strokeWidth="1"
              />
              <polygon
                points="60,25 95,50 85,90 35,90 25,50"
                fill="none"
                stroke="rgba(62, 207, 139, 0.2)"
                strokeWidth="1"
              />
              <polygon
                points="60,40 80,55 75,80 45,80 40,55"
                fill="none"
                stroke="rgba(62, 207, 139, 0.2)"
                strokeWidth="1"
              />
              {/* Data polygon */}
              <polygon
                points="60,20 95,48 88,95 28,92 22,48"
                fill="rgba(62, 207, 139, 0.15)"
                stroke="#3ECF8B"
                strokeWidth="2"
              />
              {/* Dots */}
              <circle cx="60" cy="20" r="3" fill="#3ECF8B" />
              <circle cx="95" cy="48" r="3" fill="#3ECF8B" />
              <circle cx="88" cy="95" r="3" fill="#3ECF8B" />
              <circle cx="28" cy="92" r="3" fill="#3ECF8B" />
              <circle cx="22" cy="48" r="3" fill="#3ECF8B" />
            </svg>
          </div>

          <div className="space-y-3">
            {traits.map((trait, index) => {
              const Icon = trait.icon;
              return (
                <div
                  key={index}
                  className="trait-item flex items-center gap-3 p-3 rounded-xl bg-white/50"
                >
                  <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-slate-850">
                        {trait.title}
                      </p>
                      <span className="text-xs font-medium text-accent">
                        {trait.value}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-accent/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full transition-all duration-500"
                        style={{ width: `${trait.value}%` }}
                      />
                    </div>
                  </div>
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
