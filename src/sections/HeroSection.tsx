import { useRef, useLayoutEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const heroCardRef = useRef<HTMLDivElement>(null);
  const portraitCardRef = useRef<HTMLDivElement>(null);
  const emojiRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const heroCard = heroCardRef.current;
    const portraitCard = portraitCardRef.current;
    const emojis = emojiRefs.current.filter(Boolean);

    if (!section || !heroCard || !portraitCard) return;

    const ctx = gsap.context(() => {
      // Load animation (auto-play on mount)
      const loadTl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      loadTl
        .fromTo(
          heroCard,
          { opacity: 0, x: '-10vw', y: '6vh', rotateZ: -1 },
          { opacity: 1, x: 0, y: 0, rotateZ: 0, duration: 1 }
        )
        .fromTo(
          portraitCard,
          { opacity: 0, x: '10vw', scale: 0.96 },
          { opacity: 1, x: 0, scale: 1, duration: 1 },
          '-=0.8'
        )
        .fromTo(
          emojis,
          { opacity: 0, y: '18vh', scale: 0.85 },
          { opacity: 0.9, y: 0, scale: 1, duration: 0.8, stagger: 0.08 },
          '-=0.6'
        );

      // Scroll-driven exit animation
      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: '+=130%',
          pin: true,
          scrub: 0.6,
          onLeaveBack: () => {
            // Reset all elements when scrolling back to top
            gsap.set(heroCard, { opacity: 1, x: 0, y: 0, rotateZ: 0 });
            gsap.set(portraitCard, { opacity: 1, x: 0, y: 0, scale: 1 });
            gsap.set(emojis, { opacity: 0.9, y: 0 });
          },
        },
      });

      // ENTRANCE (0-30%): Hold at visible state (already animated on load)
      // SETTLE (30-70%): Static
      // EXIT (70-100%): Elements exit
      scrollTl
        .fromTo(
          heroCard,
          { opacity: 1, x: 0, y: 0, rotateZ: 0 },
          { opacity: 0.25, x: '-18vw', y: '-10vh', rotateZ: -2, ease: 'power2.in' },
          0.7
        )
        .fromTo(
          portraitCard,
          { opacity: 1, x: 0, y: 0, scale: 1 },
          { opacity: 0.25, x: '18vw', y: '10vh', scale: 0.94, ease: 'power2.in' },
          0.7
        )
        .fromTo(
          emojis,
          { opacity: 0.9, y: 0 },
          { opacity: 0, y: '22vh', ease: 'power2.in' },
          0.75
        );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full h-screen overflow-hidden bg-canvas z-10"
    >
      {/* Radial glow background */}
      <div className="absolute inset-0 glow-radial" />

      {/* Hero Card */}
      <div
        ref={heroCardRef}
        className="absolute left-[10vw] top-[18vh] w-[44vw] max-w-[600px] will-change-transform"
      >
        <div className="glass-card rounded-[2rem] p-8 md:p-10">
          {/* Eyebrow */}
          <span className="inline-block text-xs font-medium uppercase tracking-[0.14em] text-slate-550/75 mb-4">
            Budding.live
          </span>

          {/* Headline */}
          <h1 className="font-heading font-bold text-hero text-slate-850 mb-5">
            AI guidance that grows with your family.
          </h1>

          {/* Subheadline */}
          <p className="text-base md:text-lg text-slate-550 leading-relaxed mb-8">
            From pregnancy to age 18—behavior insights, emotional coaching, and
            daily support rooted in developmental psychology.
          </p>

          {/* CTAs */}
          <div className="flex items-center gap-4 flex-wrap">
            <Button className="bg-accent hover:bg-accent/90 text-white rounded-full px-6 py-3 text-sm font-medium transition-all hover:shadow-lg hover:shadow-accent/25">
              Get Early Access
            </Button>
            <a
              href="#features"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-550 hover:text-slate-850 transition-colors group"
            >
              See how it works
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </a>
          </div>
        </div>
      </div>

      {/* AI Portrait Card */}
      <div
        ref={portraitCardRef}
        className="absolute right-[10vw] top-[22vh] w-[30vw] h-[56vh] max-w-[400px] max-h-[500px] will-change-transform hidden lg:block"
      >
        <div className="glass-card rounded-[2rem] overflow-hidden h-full">
          <img
            src="/hero_ai_portrait.jpg"
            alt="AI Parenting Companion"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Floating Emoji Orbs */}
      <span
        ref={(el) => { emojiRefs.current[0] = el; }}
        className="absolute left-[6vw] top-[74vh] text-[22px] opacity-90 will-change-transform"
      >
        🌱
      </span>
      <span
        ref={(el) => { emojiRefs.current[1] = el; }}
        className="absolute left-[18vw] top-[82vh] text-[26px] opacity-85 will-change-transform"
      >
        🧸
      </span>
      <span
        ref={(el) => { emojiRefs.current[2] = el; }}
        className="absolute right-[18vw] top-[80vh] text-[22px] opacity-85 will-change-transform"
      >
        🍼
      </span>
      <span
        ref={(el) => { emojiRefs.current[3] = el; }}
        className="absolute right-[6vw] top-[70vh] text-[24px] opacity-90 will-change-transform"
      >
        🧩
      </span>
    </section>
  );
}
