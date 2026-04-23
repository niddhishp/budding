import { useRef, useLayoutEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const moments = [
  {
    emoji: '🧸',
    title: 'Why repetition builds confidence (and how to support it)',
    age: 'Age 2–3',
  },
  {
    emoji: '🌱',
    title: 'A calm-down script for after-school meltdowns',
    age: 'Age 5–7',
  },
  {
    emoji: '🧩',
    title: 'How to talk about online safety without fear',
    age: 'Age 10–12',
  },
  {
    emoji: '💬',
    title: 'Supporting independence without losing connection',
    age: 'Age 13–15',
  },
];

export function DailyMomentsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headlineCardRef = useRef<HTMLDivElement>(null);
  const feedCardRef = useRef<HTMLDivElement>(null);
  const emojiRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const headlineCard = headlineCardRef.current;
    const feedCard = feedCardRef.current;
    const emojis = emojiRefs.current.filter(Boolean);
    const feedItems = feedCard?.querySelectorAll('.feed-item');

    if (!section || !headlineCard || !feedCard) return;

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
          feedCard,
          { x: '55vw', rotateZ: 1.5, opacity: 0 },
          { x: 0, rotateZ: 0, opacity: 1, ease: 'power2.out' },
          0
        )
        .fromTo(
          emojis,
          { scale: 0.5, opacity: 0 },
          { scale: 1, opacity: 0.9, ease: 'back.out(1.7)' },
          0.1
        );

      // Feed items stagger
      if (feedItems) {
        scrollTl.fromTo(
          feedItems,
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
          feedCard,
          { x: 0, rotateZ: 0, opacity: 1 },
          { x: '18vw', rotateZ: -1, opacity: 0.25, ease: 'power2.in' },
          0.7
        );

      if (feedItems) {
        scrollTl.fromTo(
          feedItems,
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
      style={{ zIndex: 30 }}
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
            Daily parenting moments, personalized.
          </h2>
          <p className="text-base text-slate-550 leading-relaxed">
            Age-adaptive insights, activity ideas, and conversation prompts—every
            day.
          </p>
        </div>
      </div>

      {/* Feed Card (Right) */}
      <div
        ref={feedCardRef}
        className="absolute left-[52vw] top-[16vh] w-[38vw] max-w-[520px] h-[68vh] max-h-[560px] will-change-transform"
      >
        <div className="glass-card rounded-[2rem] p-6 md:p-8 h-full overflow-y-auto">
          <div className="space-y-4">
            {moments.map((moment, index) => (
              <div
                key={index}
                className="feed-item flex items-start gap-4 p-4 rounded-2xl bg-white/50 hover:bg-white/80 transition-colors cursor-pointer"
              >
                <span className="text-2xl">{moment.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-850 mb-1 leading-snug">
                    {moment.title}
                  </p>
                  <Badge
                    variant="secondary"
                    className="text-xs bg-accent/10 text-accent border-0"
                  >
                    {moment.age}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Emoji Orbs */}
      <span
        ref={(el) => { emojiRefs.current[0] = el; }}
        className="absolute left-[6vw] top-[74vh] text-[24px] will-change-transform"
      >
        🧩
      </span>
      <span
        ref={(el) => { emojiRefs.current[1] = el; }}
        className="absolute right-[8vw] top-[78vh] text-[22px] will-change-transform"
      >
        🌱
      </span>
    </section>
  );
}
