import { useRef, useLayoutEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const exercises = [
  { emoji: '🎯', title: 'Emotion naming game', duration: '5 min', progress: 75 },
  { emoji: '🌟', title: 'Gratitude ritual', duration: '3 min', progress: 60 },
  { emoji: '🌿', title: 'Calm-down countdown', duration: '5 min', progress: 40 },
  { emoji: '📖', title: 'Perspective-taking story', duration: '7 min', progress: 25 },
];

export function EQTrainingSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headlineCardRef = useRef<HTMLDivElement>(null);
  const trainingCardRef = useRef<HTMLDivElement>(null);
  const emojiRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const headlineCard = headlineCardRef.current;
    const trainingCard = trainingCardRef.current;
    const emojis = emojiRefs.current.filter(Boolean);
    const exerciseItems = trainingCard?.querySelectorAll('.exercise-item');

    if (!section || !headlineCard || !trainingCard) return;

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
          trainingCard,
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

      // Exercise items stagger
      if (exerciseItems) {
        scrollTl.fromTo(
          exerciseItems,
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
          trainingCard,
          { x: 0, opacity: 1 },
          { x: '18vw', opacity: 0.25, ease: 'power2.in' },
          0.7
        );

      if (exerciseItems) {
        scrollTl.fromTo(
          exerciseItems,
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
      style={{ zIndex: 40 }}
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
            Emotional intelligence training—for parents and kids.
          </h2>
          <p className="text-base text-slate-550 leading-relaxed">
            Practice empathy, self-awareness, and regulation with guided
            exercises.
          </p>
        </div>
      </div>

      {/* Training Card (Right) */}
      <div
        ref={trainingCardRef}
        className="absolute left-[52vw] top-[16vh] w-[38vw] max-w-[520px] h-[68vh] max-h-[560px] will-change-transform"
      >
        <div className="glass-card rounded-[2rem] p-6 md:p-8 h-full overflow-y-auto">
          <div className="space-y-4">
            {exercises.map((exercise, index) => (
              <div
                key={index}
                className="exercise-item p-4 rounded-2xl bg-white/50 hover:bg-white/80 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{exercise.emoji}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-850">
                      {exercise.title}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className="text-xs bg-accent/10 text-accent border-0"
                  >
                    {exercise.duration}
                  </Badge>
                </div>
                <Progress
                  value={exercise.progress}
                  className="h-1.5 bg-accent/20"
                />
              </div>
            ))}
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
