import { useRef, useLayoutEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Brain, Lock, Baby } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const trustCards = [
  {
    icon: Brain,
    title: 'Backed by developmental psychology',
  },
  {
    icon: Lock,
    title: 'Private by design',
  },
  {
    icon: Baby,
    title: 'For pregnancy through age 18',
  },
];

export function CTASection() {
  const sectionRef = useRef<HTMLElement>(null);
  const ctaCardRef = useRef<HTMLDivElement>(null);
  const trustCardsRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const router = useRouter();

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const ctaCard = ctaCardRef.current;
    const trustCardsContainer = trustCardsRef.current;
    const trustCardItems = trustCardsContainer?.querySelectorAll('.trust-card');

    if (!section || !ctaCard || !trustCardsContainer) return;

    const ctx = gsap.context(() => {
      // Flowing section - animate on scroll
      gsap.fromTo(
        ctaCard,
        { y: '8vh', opacity: 0 },
        {
          y: 0,
          opacity: 1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 80%',
            end: 'top 35%',
            scrub: 0.5,
          },
        }
      );

      if (trustCardItems) {
        gsap.fromTo(
          trustCardItems,
          { y: '6vh', opacity: 0 },
          {
            y: 0,
            opacity: 1,
            stagger: 0.1,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: trustCardsContainer,
              start: 'top 85%',
              end: 'top 50%',
              scrub: 0.5,
            },
          }
        );
      }
    }, section);

    return () => ctx.revert();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
      setTimeout(() => router.push('/app'), 1000);
    } else {
      router.push('/app');
    }
  };

  return (
    <section
      ref={sectionRef}
      id="support"
      className="relative w-full min-h-screen overflow-hidden bg-canvas py-[10vh]"
      style={{ zIndex: 120 }}
    >
      {/* Radial glow */}
      <div className="absolute inset-0 glow-radial" />

      {/* CTA Card */}
      <div
        ref={ctaCardRef}
        className="w-[min(72vw,980px)] mx-auto mb-12 will-change-transform"
      >
        <div className="glass-card rounded-[2.5rem] p-10 md:p-16 text-center">
          <h2 className="font-heading font-bold text-section text-slate-850 mb-4">
            Start your journey today.
          </h2>
          <p className="text-base md:text-lg text-slate-550 leading-relaxed mb-8 max-w-lg mx-auto">
            Join parents using AI to build calmer, more connected families.
          </p>

          {!submitted ? (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto"
            >
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 px-5 rounded-full border-slate-200 bg-white/80 text-slate-850 placeholder:text-slate-400 focus:border-accent focus:ring-accent/20 w-full sm:w-auto sm:flex-1"
                required
              />
              <Button
                type="submit"
                className="h-12 px-8 bg-accent hover:bg-accent/90 text-white rounded-full text-sm font-medium transition-all hover:shadow-lg hover:shadow-accent/25 w-full sm:w-auto"
              >
                Get Early Access
              </Button>
            </form>
          ) : (
            <div className="flex items-center justify-center gap-2 text-accent">
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="font-medium">Thanks! We'll be in touch soon.</span>
            </div>
          )}
        </div>
      </div>

      {/* Trust Cards */}
      <div
        ref={trustCardsRef}
        className="w-[min(80vw,1100px)] mx-auto"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {trustCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <div
                key={index}
                className="trust-card glass-card rounded-[1.75rem] p-6 text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-6 h-6 text-accent" />
                </div>
                <p className="text-sm font-medium text-slate-850">{card.title}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-20 text-center">
        <p className="text-sm text-slate-550">
          © 2026 Budding.live. All rights reserved.
        </p>
      </footer>
    </section>
  );
}
