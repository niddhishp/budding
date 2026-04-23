import { useRef, useLayoutEffect } from 'react';
import { Brain, MessageCircle, TrendingUp } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const features = [
  {
    icon: Brain,
    title: 'Behavior Interpreter',
    description: 'Turn tantrums into understanding with stage-aware insights.',
  },
  {
    icon: MessageCircle,
    title: 'Communication Coach',
    description: 'Reframe your words to build trust and calm big emotions.',
  },
  {
    icon: TrendingUp,
    title: 'Development Forecast',
    description: "See what's coming next and how to support it.",
  },
];

export function PlatformOverviewSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headlineCardRef = useRef<HTMLDivElement>(null);
  const cardsContainerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const emojiRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const headlineCard = headlineCardRef.current;
    const cardsContainer = cardsContainerRef.current;
    const cards = cardRefs.current.filter(Boolean);
    const emojis = emojiRefs.current.filter(Boolean);

    if (!section || !headlineCard || !cardsContainer) return;

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
          { x: '-50vw', rotateZ: -2, opacity: 0 },
          { x: 0, rotateZ: 0, opacity: 1, ease: 'power2.out' },
          0
        )
        .fromTo(
          cardsContainer,
          { x: '50vw', opacity: 0 },
          { x: 0, opacity: 1, ease: 'power2.out' },
          0
        );

      // Cards stagger entrance
      cards.forEach((card, i) => {
        scrollTl.fromTo(
          card,
          { y: '12vh', scale: 0.96, opacity: 0 },
          { y: 0, scale: 1, opacity: 1, ease: 'power2.out' },
          0.06 * i
        );
      });

      // Emojis
      scrollTl.fromTo(
        emojis,
        { scale: 0.6, opacity: 0 },
        { scale: 1, opacity: 0.9, ease: 'back.out(1.7)' },
        0.1
      );

      // EXIT (70-100%)
      scrollTl
        .fromTo(
          headlineCard,
          { x: 0, y: 0, opacity: 1 },
          { x: '-18vw', y: '-8vh', opacity: 0.25, ease: 'power2.in' },
          0.7
        )
        .fromTo(
          cardsContainer,
          { x: 0, y: 0, opacity: 1 },
          { x: '18vw', y: '10vh', opacity: 0.25, ease: 'power2.in' },
          0.7
        );

      cards.forEach((card) => {
        scrollTl.fromTo(
          card,
          { y: 0, opacity: 1 },
          { y: '10vh', opacity: 0.2, ease: 'power2.in' },
          0.72
        );
      });

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
      id="features"
      className="relative w-full h-screen overflow-hidden bg-canvas"
      style={{ zIndex: 20 }}
    >
      {/* Radial glow */}
      <div className="absolute inset-0 glow-radial" />

      {/* Headline Card (Left) */}
      <div
        ref={headlineCardRef}
        className="absolute left-[10vw] top-[22vh] w-[34vw] max-w-[480px] will-change-transform"
      >
        <div className="glass-card rounded-[2rem] p-8 md:p-10">
          <h2 className="font-heading font-bold text-section text-slate-850 mb-4">
            Everything you need to raise emotionally healthy kids.
          </h2>
          <p className="text-base text-slate-550 leading-relaxed">
            Behavior interpretation, communication coaching, and developmental
            forecasting—backed by psychology, delivered by AI.
          </p>
        </div>
      </div>

      {/* Cards Stack (Right) */}
      <div
        ref={cardsContainerRef}
        className="absolute left-[52vw] top-[18vh] w-[38vw] max-w-[520px] will-change-transform"
      >
        <div className="relative">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                ref={(el) => { cardRefs.current[index] = el; }}
                className="glass-card rounded-[1.75rem] p-6 mb-4 will-change-transform"
                style={{
                  transform: `translateY(${index * 8}px)`,
                  zIndex: features.length - index,
                }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-lg text-slate-850 mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-slate-550 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
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
