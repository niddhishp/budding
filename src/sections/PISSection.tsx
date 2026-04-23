import { useRef, useLayoutEffect } from 'react';
import { Heart, MessageSquare, Calendar } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const metrics = [
  { icon: Heart, title: 'Emotional responsiveness', score: 88 },
  { icon: MessageSquare, title: 'Communication quality', score: 82 },
  { icon: Calendar, title: 'Consistency', score: 79 },
];

export function PISSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headlineCardRef = useRef<HTMLDivElement>(null);
  const scoreCardRef = useRef<HTMLDivElement>(null);
  const emojiRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const headlineCard = headlineCardRef.current;
    const scoreCard = scoreCardRef.current;
    const emojis = emojiRefs.current.filter(Boolean);
    const metricItems = scoreCard?.querySelectorAll('.metric-item');
    const scoreDisplay = scoreCard?.querySelector('.score-display');

    if (!section || !headlineCard || !scoreCard) return;

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
          scoreCard,
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

      // Score display
      if (scoreDisplay) {
        scrollTl.fromTo(
          scoreDisplay,
          { scale: 0.8, opacity: 0 },
          { scale: 1, opacity: 1, ease: 'back.out(1.7)' },
          0.1
        );
      }

      // Metric items stagger
      if (metricItems) {
        scrollTl.fromTo(
          metricItems,
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
          scoreCard,
          { x: 0, opacity: 1 },
          { x: '18vw', opacity: 0.25, ease: 'power2.in' },
          0.7
        );

      if (scoreDisplay) {
        scrollTl.fromTo(
          scoreDisplay,
          { scale: 1, opacity: 1 },
          { scale: 0.9, opacity: 0.2, ease: 'power2.in' },
          0.72
        );
      }

      if (metricItems) {
        scrollTl.fromTo(
          metricItems,
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
      style={{ zIndex: 110 }}
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
            Grow your Parenting Intelligence Score.
          </h2>
          <p className="text-base text-slate-550 leading-relaxed">
            A friendly metric for emotional responsiveness, communication quality,
            and consistency—designed to celebrate progress, not perfection.
          </p>
        </div>
      </div>

      {/* Score Card (Right) */}
      <div
        ref={scoreCardRef}
        className="absolute left-[52vw] top-[16vh] w-[38vw] max-w-[520px] h-[68vh] max-h-[560px] will-change-transform"
      >
        <div className="glass-card rounded-[2rem] p-6 md:p-8 h-full overflow-y-auto">
          {/* Large Score Display */}
          <div className="score-display flex flex-col items-center mb-8">
            <div className="relative w-28 h-28 mb-3">
              {/* Circular progress background */}
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="rgba(62, 207, 139, 0.2)"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="#3ECF8B"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray="264"
                  strokeDashoffset="58"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-heading font-bold text-3xl text-slate-850">
                  83
                </span>
              </div>
            </div>
            <p className="text-sm text-slate-550">Your PIS</p>
          </div>

          <div className="space-y-4">
            {metrics.map((metric, index) => {
              const Icon = metric.icon;
              return (
                <div
                  key={index}
                  className="metric-item flex items-center gap-4 p-4 rounded-2xl bg-white/50"
                >
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-850 mb-1">
                      {metric.title}
                    </p>
                    <div className="h-2 bg-accent/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full transition-all duration-500"
                        style={{ width: `${metric.score}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-accent">
                    {metric.score}
                  </span>
                </div>
              );
            })}
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
