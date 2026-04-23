import { useRef, useLayoutEffect, useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const faqs = [
  {
    question: 'How is Budding.live different from other parenting apps?',
    answer: "Budding.live is the first AI-native parenting platform that combines developmental psychology, behavioral science, and NLP communication strategies. Unlike traditional apps that offer generic advice, our AI analyzes your specific situation and provides personalized, evidence-based guidance that evolves with your child's unique development.",
  },
  {
    question: 'Is the advice backed by real research?',
    answer: "Absolutely. Our guidance is grounded in peer-reviewed research from leading institutions including the WHO, CDC, and American Academy of Pediatrics. We work with child psychologists and developmental experts to ensure every recommendation is evidence-based and age-appropriate.",
  },
  {
    question: 'How does the AI Behavior Interpreter work?',
    answer: "Simply describe a challenging behavior or situation, and our AI analyzes it through multiple lenses: developmental stage, emotional needs, environmental context, and communication patterns. You'll receive insights into why the behavior is happening and specific, actionable strategies rooted in psychology.",
  },
  {
    question: 'What is the Parenting Intelligence Score (PIS)?',
    answer: "PIS is a friendly metric that tracks your growth as a parent across three dimensions: emotional responsiveness, communication quality, and consistency. It's designed to celebrate progress, not perfection. As you engage with the platform and apply insights, you'll see your score grow over time.",
  },
  {
    question: 'Is my family data private and secure?',
    answer: "Privacy is our top priority. All data is encrypted end-to-end, and we never sell or share your information with third parties. Your child's developmental data belongs to you—you can export or delete it at any time. We're GDPR compliant and follow the strictest security standards.",
  },
  {
    question: 'Can I use Budding.live for multiple children?',
    answer: "Yes! You can create separate profiles for each child, and the AI will provide age-appropriate guidance tailored to each child's developmental stage and unique personality profile. Many families find this especially helpful when navigating different needs simultaneously.",
  },
  {
    question: 'What age range does Budding.live support?',
    answer: "Budding.live supports families from pregnancy through age 18. Whether you're preparing for your first child, navigating the toddler years, or supporting your teenager's journey to adulthood, our platform provides relevant, stage-appropriate guidance.",
  },
  {
    question: 'How much does Budding.live cost?',
    answer: "We offer a free tier with daily insights and basic features. Our Premium plan unlocks the full AI Behavior Interpreter, personalized coaching, the complete life skills curriculum, and community features. Family plans are available for households with multiple children.",
  },
];

export function FAQSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

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

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section
      ref={sectionRef}
      className="relative w-full min-h-screen overflow-hidden bg-canvas py-[10vh]"
      style={{ zIndex: 128 }}
    >
      {/* Radial glow */}
      <div className="absolute inset-0 glow-radial" />

      <div ref={contentRef} className="will-change-transform">
        {/* Header */}
        <div className="text-center mb-10 px-6">
          <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-550/75 mb-4">
            <HelpCircle className="w-4 h-4" />
            Got Questions?
          </span>
          <h2 className="font-heading font-bold text-section text-slate-850 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-base text-slate-550 max-w-lg mx-auto">
            Everything you need to know about Budding.live and how it can support your family.
          </p>
        </div>

        {/* FAQ Container */}
        <div className="w-[min(85vw,800px)] mx-auto">
          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openIndex === index;

              return (
                <div
                  key={index}
                  className={`glass-card rounded-2xl overflow-hidden transition-all ${
                    isOpen ? 'shadow-card-hover' : ''
                  }`}
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full flex items-center justify-between p-5 text-left"
                  >
                    <span className="font-medium text-slate-850 pr-4">{faq.question}</span>
                    <div
                      className={`w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    >
                      <ChevronDown className="w-4 h-4 text-accent" />
                    </div>
                  </button>

                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      isOpen ? 'max-h-96' : 'max-h-0'
                    }`}
                  >
                    <div className="px-5 pb-5">
                      <p className="text-sm text-slate-550 leading-relaxed">{faq.answer}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Contact CTA */}
          <div className="mt-10 text-center">
            <p className="text-sm text-slate-550 mb-4">
              Still have questions? We're here to help.
            </p>
            <a
              href="mailto:support@budding.live"
              className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline"
            >
              Contact our support team
              <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
