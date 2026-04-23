import { useRef, useLayoutEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const habits = [
  { emoji: '🌅', title: 'Morning gratitude', frequency: 'Daily', completed: true },
  { emoji: '📚', title: 'Reading time', frequency: 'Daily', completed: true },
  { emoji: '💬', title: 'Emotion check-in', frequency: 'Weekly', completed: false },
  { emoji: '🌿', title: 'Family walk', frequency: 'Weekly', completed: false },
];

export function HabitBuilderSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headlineCardRef = useRef<HTMLDivElement>(null);
  const habitsCardRef = useRef<HTMLDivElement>(null);
  const emojiRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const headlineCard = headlineCardRef.current;
    const habitsCard = habitsCardRef.current;
    const emojis = emojiRefs.current.filter(Boolean);
    const habitItems = habitsCard?.querySelectorAll('.habit-item');

    if (!section || !headlineCard || !habitsCard) return;

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
          habitsCard,
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

      // Habit items stagger
      if (habitItems) {
        scrollTl.fromTo(
          habitItems,
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
          habitsCard,
          { x: 0, opacity: 1 },
          { x: '18vw', opacity: 0.25, ease: 'power2.in' },
          0.7
        );

      if (habitItems) {
        scrollTl.fromTo(
          habitItems,
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
      style={{ zIndex: 70 }}
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
            Build routines that stick.
          </h2>
          <p className="text-base text-slate-550 leading-relaxed">
            Choose habits that strengthen connection, then track them with gentle
            reminders.
          </p>
        </div>
      </div>

      {/* Habits Card (Right) */}
      <div
        ref={habitsCardRef}
        className="absolute left-[52vw] top-[16vh] w-[38vw] max-w-[520px] h-[68vh] max-h-[560px] will-change-transform"
      >
        <div className="glass-card rounded-[2rem] p-6 md:p-8 h-full overflow-y-auto">
          <div className="space-y-3">
            {habits.map((habit, index) => (
              <div
                key={index}
                className={`habit-item flex items-center gap-4 p-4 rounded-2xl transition-colors cursor-pointer ${
                  habit.completed
                    ? 'bg-accent/10'
                    : 'bg-white/50 hover:bg-white/80'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    habit.completed
                      ? 'bg-accent'
                      : 'border-2 border-slate-300'
                  }`}
                >
                  {habit.completed && <Check className="w-3.5 h-3.5 text-white" />}
                </div>
                <span className="text-2xl">{habit.emoji}</span>
                <div className="flex-1">
                  <p
                    className={`text-sm font-medium ${
                      habit.completed
                        ? 'text-slate-550 line-through'
                        : 'text-slate-850'
                    }`}
                  >
                    {habit.title}
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className={`text-xs border-0 ${
                    habit.completed
                      ? 'bg-accent/20 text-accent'
                      : 'bg-slate-100 text-slate-550'
                  }`}
                >
                  {habit.frequency}
                </Badge>
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
