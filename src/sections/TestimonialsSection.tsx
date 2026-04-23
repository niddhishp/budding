import { useRef, useLayoutEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const testimonials = [
  {
    image: '/testimonial_1.jpg',
    name: 'Sarah Mitchell',
    role: 'Mom of two, ages 3 & 6',
    quote: "Budding.live completely changed how I approach my children's emotional moments. Instead of feeling overwhelmed by tantrums, I now understand what my 3-year-old is actually trying to communicate. The daily insights feel like having a child psychologist in my pocket.",
    highlight: 'PIS improved from 62 to 89 in 3 months',
  },
  {
    image: '/testimonial_2.jpg',
    name: 'David Chen',
    role: 'Dad of a 9-year-old',
    quote: "As a working father, I often felt disconnected from my daughter's daily experiences. The communication coach helped me learn to ask better questions and really listen. Our relationship has grown so much stronger.",
    highlight: 'Communication quality score: 94/100',
  },
  {
    image: '/testimonial_3.jpg',
    name: 'Patricia Williams',
    role: 'Grandmother & caregiver',
    quote: "Raising children today is different from when I was a young mother. Budding.live bridges that gap with research-backed guidance that respects both traditional wisdom and modern psychology. It's been invaluable for my grandson.",
    highlight: 'Tracking 18 months of developmental milestones',
  },
];

export function TestimonialsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const content = contentRef.current;

    if (!section || !content) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        content,
        { y: '8vh', opacity: 0 },
        {
          y: 0,
          opacity: 1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 75%',
            end: 'top 40%',
            scrub: 0.5,
          },
        }
      );
    }, section);

    return () => ctx.revert();
  }, []);

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const current = testimonials[currentIndex];

  return (
    <section
      ref={sectionRef}
      className="relative w-full min-h-screen overflow-hidden bg-canvas py-[10vh]"
      style={{ zIndex: 125 }}
    >
      {/* Radial glow */}
      <div className="absolute inset-0 glow-radial" />

      <div ref={contentRef} className="will-change-transform">
        {/* Header */}
        <div className="text-center mb-12 px-6">
          <span className="inline-block text-xs font-medium uppercase tracking-[0.14em] text-slate-550/75 mb-4">
            Parent Stories
          </span>
          <h2 className="font-heading font-bold text-section text-slate-850 mb-4">
            Families are growing together.
          </h2>
          <p className="text-base text-slate-550 max-w-lg mx-auto">
            Real stories from parents using AI to build stronger, more connected families.
          </p>
        </div>

        {/* Testimonial Card */}
        <div className="w-[min(85vw,1000px)] mx-auto">
          <div className="glass-card rounded-[2.5rem] p-8 md:p-12 relative">
            {/* Quote Icon */}
            <div className="absolute top-6 left-8 w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
              <Quote className="w-6 h-6 text-accent" />
            </div>

            <div className="grid md:grid-cols-[200px,1fr] gap-8 md:gap-12 items-center">
              {/* Image */}
              <div className="flex flex-col items-center">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden mb-4 ring-4 ring-accent/20">
                  <img
                    src={current.image}
                    alt={current.name}
                    className="w-full h-full object-cover transition-all duration-500"
                  />
                </div>
                <h4 className="font-heading font-semibold text-slate-850 text-center">
                  {current.name}
                </h4>
                <p className="text-sm text-slate-550 text-center">{current.role}</p>
              </div>

              {/* Content */}
              <div className="relative">
                <blockquote className="text-lg md:text-xl text-slate-850 leading-relaxed mb-6">
                  "{current.quote}"
                </blockquote>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10">
                  <span className="w-2 h-2 rounded-full bg-accent" />
                  <span className="text-sm font-medium text-accent">
                    {current.highlight}
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200/50">
              {/* Dots */}
              <div className="flex items-center gap-2">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      index === currentIndex
                        ? 'bg-accent w-6'
                        : 'bg-slate-300 hover:bg-slate-400'
                    }`}
                  />
                ))}
              </div>

              {/* Arrows */}
              <div className="flex items-center gap-2">
                <button
                  onClick={prevTestimonial}
                  className="w-10 h-10 rounded-full bg-white/80 hover:bg-white flex items-center justify-center transition-colors shadow-sm"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-550" />
                </button>
                <button
                  onClick={nextTestimonial}
                  className="w-10 h-10 rounded-full bg-white/80 hover:bg-white flex items-center justify-center transition-colors shadow-sm"
                >
                  <ChevronRight className="w-5 h-5 text-slate-550" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="w-[min(80vw,900px)] mx-auto mt-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: '50K+', label: 'Active Families' },
              { value: '4.9', label: 'App Store Rating' },
              { value: '2.3M', label: 'Insights Delivered' },
              { value: '18', label: 'Years of Support' },
            ].map((stat, index) => (
              <div key={index} className="glass-card rounded-2xl p-5 text-center">
                <p className="font-heading font-bold text-2xl md:text-3xl text-accent mb-1">
                  {stat.value}
                </p>
                <p className="text-xs text-slate-550">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
