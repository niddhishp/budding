import { useRef, useLayoutEffect, type ReactNode } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface FeatureSectionProps {
  id?: string;
  headline: string;
  description: string;
  children: ReactNode;
  zIndex: number;
  background?: 'cloud' | 'mint';
  emojis?: { emoji: string; left: string; top: string }[];
}

export function FeatureSection({
  id,
  headline,
  description,
  children,
  zIndex,
  background = 'cloud',
  emojis = [],
}: FeatureSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const headlineCardRef = useRef<HTMLDivElement>(null);
  const contentCardRef = useRef<HTMLDivElement>(null);
  const emojiRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const headlineCard = headlineCardRef.current;
    const contentCard = contentCardRef.current;
    const emojiElements = emojiRefs.current.filter(Boolean);

    if (!section || !headlineCard || !contentCard) return;

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
          contentCard,
          { x: '55vw', opacity: 0, rotateZ: 1.5 },
          { x: 0, opacity: 1, rotateZ: 0, ease: 'power2.out' },
          0
        )
        .fromTo(
          emojiElements,
          { scale: 0.5, opacity: 0 },
          { scale: 1, opacity: 0.9, stagger: 0.03, ease: 'back.out(1.7)' },
          0.1
        );

      // Content items stagger entrance
      const contentItems = contentCard.querySelectorAll('.content-item');
      scrollTl.fromTo(
        contentItems,
        { y: '6vh', opacity: 0 },
        { y: 0, opacity: 1, stagger: 0.02, ease: 'power2.out' },
        0.05
      );

      // SETTLE (30-70%): Elements hold position (implicit)

      // EXIT (70-100%)
      scrollTl
        .fromTo(
          headlineCard,
          { x: 0, opacity: 1 },
          { x: '-18vw', opacity: 0.25, ease: 'power2.in' },
          0.7
        )
        .fromTo(
          contentCard,
          { x: 0, opacity: 1, rotateZ: 0 },
          { x: '18vw', opacity: 0.25, rotateZ: -1, ease: 'power2.in' },
          0.7
        )
        .fromTo(
          emojiElements,
          { y: 0, opacity: 0.9 },
          { y: '18vh', opacity: 0, ease: 'power2.in' },
          0.75
        )
        .fromTo(
          contentItems,
          { y: 0, opacity: 1 },
          { y: '8vh', opacity: 0.2, ease: 'power2.in' },
          0.72
        );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id={id}
      className={`relative w-full h-screen overflow-hidden ${
        background === 'cloud' ? 'bg-canvas' : 'bg-sage'
      }`}
      style={{ zIndex }}
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
            {headline}
          </h2>
          <p className="text-base text-slate-550 leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      {/* Content Card (Right) */}
      <div
        ref={contentCardRef}
        className="absolute left-[52vw] top-[16vh] w-[38vw] max-w-[520px] h-[68vh] max-h-[560px] will-change-transform"
      >
        <div className="glass-card rounded-[2rem] p-6 md:p-8 h-full overflow-y-auto">
          {children}
        </div>
      </div>

      {/* Emoji Orbs */}
      {emojis.map((emojiData, index) => (
        <span
          key={index}
          ref={(el) => { emojiRefs.current[index] = el; }}
          className="absolute text-[24px] will-change-transform"
          style={{ left: emojiData.left, top: emojiData.top }}
        >
          {emojiData.emoji}
        </span>
      ))}
    </section>
  );
}
