import { useRef, useLayoutEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, CheckCircle2 } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const discussions = [
  {
    title: 'How do I handle bedtime resistance without power struggles?',
    replies: 12,
    verified: true,
  },
  {
    title: "What's the best way to teach a child to name emotions?",
    replies: 8,
    verified: true,
  },
];

export function CommunitySection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headlineCardRef = useRef<HTMLDivElement>(null);
  const communityCardRef = useRef<HTMLDivElement>(null);
  const photoStripRef = useRef<HTMLDivElement>(null);
  const emojiRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const headlineCard = headlineCardRef.current;
    const communityCard = communityCardRef.current;
    const photoStrip = photoStripRef.current;
    const emojis = emojiRefs.current.filter(Boolean);
    const discussionItems = communityCard?.querySelectorAll('.discussion-item');

    if (!section || !headlineCard || !communityCard || !photoStrip) return;

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
          communityCard,
          { x: '55vw', opacity: 0 },
          { x: 0, opacity: 1, ease: 'power2.out' },
          0
        )
        .fromTo(
          photoStrip,
          { y: '40vh', opacity: 0 },
          { y: 0, opacity: 1, ease: 'power2.out' },
          0.1
        )
        .fromTo(
          emojis,
          { scale: 0.5, opacity: 0 },
          { scale: 1, opacity: 0.9, ease: 'back.out(1.7)' },
          0.15
        );

      // Discussion items stagger
      if (discussionItems) {
        scrollTl.fromTo(
          discussionItems,
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
          communityCard,
          { x: 0, opacity: 1 },
          { x: '18vw', opacity: 0.25, ease: 'power2.in' },
          0.7
        )
        .fromTo(
          photoStrip,
          { y: 0, opacity: 1 },
          { y: '18vh', opacity: 0.25, ease: 'power2.in' },
          0.72
        );

      if (discussionItems) {
        scrollTl.fromTo(
          discussionItems,
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
      id="community"
      className="relative w-full h-screen overflow-hidden bg-sage"
      style={{ zIndex: 90 }}
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
            You're not alone.
          </h2>
          <p className="text-base text-slate-550 leading-relaxed">
            Ask questions, share experiences, and get AI-summarized guidance—filtered
            for accuracy.
          </p>
        </div>
      </div>

      {/* Community Card (Right) */}
      <div
        ref={communityCardRef}
        className="absolute left-[52vw] top-[16vh] w-[38vw] max-w-[520px] h-[44vh] max-h-[360px] will-change-transform"
      >
        <div className="glass-card rounded-[2rem] p-6 md:p-8 h-full overflow-y-auto">
          <div className="space-y-4">
            {discussions.map((discussion, index) => (
              <div
                key={index}
                className="discussion-item p-4 rounded-2xl bg-white/50 hover:bg-white/80 transition-colors cursor-pointer"
              >
                <p className="text-sm font-medium text-slate-850 mb-2 leading-snug">
                  {discussion.title}
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-xs text-slate-550">
                    <MessageCircle className="w-3.5 h-3.5" />
                    {discussion.replies} replies
                  </div>
                  {discussion.verified && (
                    <Badge
                      variant="secondary"
                      className="text-xs bg-accent/10 text-accent border-0 flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      Verified
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Photo Strip (Bottom) */}
      <div
        ref={photoStripRef}
        className="absolute left-[10vw] top-[64vh] w-[80vw] h-[22vh] max-h-[200px] will-change-transform"
      >
        <div className="glass-card rounded-[2rem] overflow-hidden h-full">
          <img
            src="/family_photo_strip.jpg"
            alt="Family reading together"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Emoji Orbs */}
      <span
        ref={(el) => { emojiRefs.current[0] = el; }}
        className="absolute left-[6vw] top-[56vh] text-[24px] will-change-transform"
      >
        🧩
      </span>
      <span
        ref={(el) => { emojiRefs.current[1] = el; }}
        className="absolute right-[8vw] top-[60vh] text-[22px] will-change-transform"
      >
        🌱
      </span>
    </section>
  );
}
