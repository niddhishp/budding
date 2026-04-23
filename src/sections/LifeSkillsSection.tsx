import { useRef, useLayoutEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, DollarSign, Shield, Compass } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const skills = [
  {
    icon: MessageSquare,
    title: 'Communication',
    ageRange: 'Ages 3–6',
    color: 'bg-blue-100 text-blue-600',
  },
  {
    icon: DollarSign,
    title: 'Financial literacy',
    ageRange: 'Ages 7–12',
    color: 'bg-green-100 text-green-600',
  },
  {
    icon: Shield,
    title: 'Resilience',
    ageRange: 'Ages 10–14',
    color: 'bg-amber-100 text-amber-600',
  },
  {
    icon: Compass,
    title: 'Decision-making',
    ageRange: 'Ages 13–18',
    color: 'bg-purple-100 text-purple-600',
  },
];

export function LifeSkillsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headlineCardRef = useRef<HTMLDivElement>(null);
  const skillsCardRef = useRef<HTMLDivElement>(null);
  const emojiRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const headlineCard = headlineCardRef.current;
    const skillsCard = skillsCardRef.current;
    const emojis = emojiRefs.current.filter(Boolean);
    const skillItems = skillsCard?.querySelectorAll('.skill-item');

    if (!section || !headlineCard || !skillsCard) return;

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
          skillsCard,
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

      // Skill items stagger
      if (skillItems) {
        scrollTl.fromTo(
          skillItems,
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
          skillsCard,
          { x: 0, opacity: 1 },
          { x: '18vw', opacity: 0.25, ease: 'power2.in' },
          0.7
        );

      if (skillItems) {
        scrollTl.fromTo(
          skillItems,
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
      style={{ zIndex: 80 }}
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
            Teach skills for life.
          </h2>
          <p className="text-base text-slate-550 leading-relaxed">
            A curriculum that grows from 3 to 18—communication, responsibility,
            resilience, and more.
          </p>
        </div>
      </div>

      {/* Skills Card (Right) */}
      <div
        ref={skillsCardRef}
        className="absolute left-[52vw] top-[16vh] w-[38vw] max-w-[520px] h-[68vh] max-h-[560px] will-change-transform"
      >
        <div className="glass-card rounded-[2rem] p-6 md:p-8 h-full overflow-y-auto">
          <div className="space-y-3">
            {skills.map((skill, index) => {
              const Icon = skill.icon;
              return (
                <div
                  key={index}
                  className="skill-item flex items-center gap-4 p-4 rounded-2xl bg-white/50 hover:bg-white/80 transition-colors cursor-pointer"
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${skill.color}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-850 mb-0.5">
                      {skill.title}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className="text-xs bg-slate-100 text-slate-550 border-0"
                  >
                    {skill.ageRange}
                  </Badge>
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
