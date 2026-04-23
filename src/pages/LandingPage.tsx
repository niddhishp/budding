'use client';

import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Brain, Sparkles, Heart, Shield, ArrowRight } from 'lucide-react';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export default function LandingPage() {
  const container = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!container.current) return;
    
    let ctx = gsap.context(() => {
      // Magnetic button physics
      const magneticItems = document.querySelectorAll('.magnetic');
      magneticItems.forEach((elem: any) => {
        elem.addEventListener('mousemove', (e: any) => {
          const rect = elem.getBoundingClientRect();
          const x = e.clientX - rect.left - rect.width / 2;
          const y = e.clientY - rect.top - rect.height / 2;
          gsap.to(elem, { x: x * 0.2, y: y * 0.2, duration: 0.6, ease: 'power3.out' });
        });
        elem.addEventListener('mouseleave', () => {
          gsap.to(elem, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.3)' });
        });
      });

      // Liquid Glass Reveal
      gsap.fromTo('.glass-reveal', 
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.2, stagger: 0.15, ease: 'power4.out', delay: 0.2 }
      );

      // Parallax Image
      gsap.to('.parallax-img', {
        yPercent: 20,
        ease: 'none',
        scrollTrigger: {
          trigger: '.parallax-container',
          start: 'top bottom',
          end: 'bottom top',
          scrub: true
        }
      });

      // Horizontal Scroll Hijack for Bento Grid
      const bentoSection = document.querySelector('.bento-scroll');
      if (bentoSection) {
        gsap.to('.bento-track', {
          xPercent: -35,
          ease: 'none',
          scrollTrigger: {
            trigger: bentoSection,
            start: 'top center',
            end: 'bottom top',
            scrub: 1
          }
        });
      }

      // Scrubbing Text Reveal
      const scrubText = document.querySelector('.scrub-text');
      if (scrubText && scrubText.textContent) {
        const words = scrubText.textContent.trim().split(/\s+/);
        scrubText.innerHTML = '';
        words.forEach(word => {
          const span = document.createElement('span');
          span.textContent = word;
          span.className = 'opacity-20 inline-block';
          scrubText.appendChild(span);
          // Insert a literal space text node to preserve word gaps
          scrubText.appendChild(document.createTextNode(' '));
        });

        gsap.to(scrubText.querySelectorAll('span'), {
          opacity: 1,
          stagger: 0.1,
          ease: 'none',
          scrollTrigger: {
            trigger: scrubText,
            start: 'top 80%',
            end: 'bottom 40%',
            scrub: true
          }
        });
      }
    }, container);

    return () => ctx.revert();
  }, []);

  return (
    <main ref={container} className="overflow-x-hidden w-full max-w-full bg-[#F9FAFB] text-slate-900 font-sans selection:bg-sage/30">
      
      {/* Floating Pill Nav - Liquid Glass */}
      <nav className="fixed top-8 left-1/2 -translate-x-1/2 z-50 glass-reveal">
        <div className="flex items-center justify-between gap-12 bg-white/70 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.6)] rounded-full pl-8 pr-3 py-3">
          <div className="font-heading font-bold text-2xl tracking-tighter text-slate-900">Budding.</div>
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors">Intelligence</Link>
            <Link href="#method" className="text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors">Philosophy</Link>
          </div>
          <Button asChild className="magnetic bg-slate-900 hover:bg-slate-800 text-white rounded-full px-8 h-12 text-sm font-medium shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
            <Link href="/app">Enter App</Link>
          </Button>
        </div>
      </nav>

      {/* Asymmetric Art-Gallery Hero */}
      <section className="relative min-h-[100dvh] flex flex-col justify-center pt-40 pb-20 px-6 md:px-12 lg:px-24">
        {/* Ambient Gradient Mesh */}
        <div className="absolute top-0 right-0 w-[60vw] h-[60vw] bg-sage/20 rounded-full blur-[120px] mix-blend-multiply opacity-60 -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        
        <div className="relative z-10 w-full max-w-[90rem] mx-auto flex flex-col md:flex-row items-center justify-between gap-16 lg:gap-24">
          
          <div className="flex-1 space-y-10 glass-reveal pt-10">
            {/* Inline Typography Image Hero */}
            <h1 className="font-heading font-semibold text-[clamp(4rem,8vw,8.5rem)] leading-[0.9] tracking-tighter text-slate-900">
              Parenting
              <br />
              without
              <span 
                className="inline-block w-[2.2em] h-[0.75em] rounded-[3rem] bg-cover bg-center mx-[0.15em] relative -translate-y-[0.1em] shadow-[inset_0_4px_20px_rgba(0,0,0,0.2)]"
                style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1544126592-807ade215a0b?q=80&w=2070&auto=format&fit=crop)' }}
              />
              <br />
              the guesswork.
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-500 font-medium max-w-lg leading-relaxed tracking-tight">
              An intelligence engine powered by your child's exact neurological DNA. No generic articles. Just perfect empathy.
            </p>
            
            <div className="flex items-center gap-6 pt-6">
              <Button asChild className="magnetic h-16 px-10 bg-sage hover:bg-[#32B577] text-white rounded-full text-lg font-medium shadow-[0_8px_30px_rgba(62,207,139,0.3)] transition-all">
                <Link href="/app">Build Their Genome</Link>
              </Button>
            </div>
          </div>

          {/* Artistic Floating Asset */}
          <div className="hidden md:block relative w-[40vw] h-[75vh] parallax-container rounded-[3rem] overflow-hidden shadow-[0_40px_80px_-20px_rgba(0,0,0,0.25)] flex-shrink-0">
            <div className="absolute inset-0 bg-slate-900/10 mix-blend-multiply z-10" />
            <img 
              src="https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?q=80&w=1972&auto=format&fit=crop" 
              alt="Calm connection" 
              className="parallax-img w-full h-[140%] object-cover -translate-y-[20%] filter contrast-110 saturate-50" 
            />
          </div>

        </div>
      </section>

      {/* Horizontal Scroll Hijack - Intelligence Engine */}
      <section id="features" className="bento-scroll py-32 md:py-48 bg-white relative overflow-hidden">
        <div className="px-6 md:px-12 lg:px-24 mb-24 max-w-[90rem] mx-auto">
          <h2 className="font-heading text-[clamp(3.5rem,6vw,6rem)] leading-[0.95] font-semibold tracking-tighter text-slate-900">
            The Context <br/> Engine.
          </h2>
        </div>
        
        <div className="bento-track flex gap-8 md:gap-12 px-6 md:px-12 lg:px-24 w-[250vw] md:w-[180vw]">
          
          {/* Card 1 */}
          <div className="w-[85vw] md:w-[45vw] flex-shrink-0 aspect-[4/3] rounded-[3rem] bg-[#F4F4F5] p-12 md:p-16 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <Brain className="w-16 h-16 text-slate-900" strokeWidth={1.5} />
            <div className="relative z-10">
              <h3 className="text-[clamp(2.5rem,4vw,3.5rem)] font-heading font-semibold text-slate-900 mb-6 tracking-tight leading-none">Temperament<br />Vector</h3>
              <p className="text-2xl text-slate-500 leading-relaxed max-w-md">
                We mathematically map their sensitivity, intensity, and adaptability to filter all advice perfectly.
              </p>
            </div>
          </div>

          {/* Card 2 - Glass Refraction */}
          <div className="w-[85vw] md:w-[45vw] flex-shrink-0 aspect-[4/3] rounded-[3rem] bg-slate-900 p-12 md:p-16 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-sage/30 via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-1000" />
            <Sparkles className="w-16 h-16 text-sage" strokeWidth={1.5} />
            <div className="relative z-10">
              <h3 className="text-[clamp(2.5rem,4vw,3.5rem)] font-heading font-semibold text-white mb-6 tracking-tight leading-none">Micro-<br />Interventions</h3>
              <p className="text-2xl text-slate-400 leading-relaxed max-w-md">
                No endless blog posts. Receive the exact 2-sentence script required to co-regulate in the moment.
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="w-[85vw] md:w-[45vw] flex-shrink-0 aspect-[4/3] rounded-[3rem] bg-[#fdf2f8] p-12 md:p-16 flex flex-col justify-between group overflow-hidden relative">
             <div className="absolute inset-0 bg-gradient-to-tr from-rose-100/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <Heart className="w-16 h-16 text-rose-400" strokeWidth={1.5} />
            <div className="relative z-10">
              <h3 className="text-[clamp(2.5rem,4vw,3.5rem)] font-heading font-semibold text-slate-900 mb-6 tracking-tight leading-none">Contextual<br />Memory</h3>
              <p className="text-2xl text-slate-600 leading-relaxed max-w-md">
                The engine recalls the exact struggle from last Tuesday, applying long-term memory to short-term reactions.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* Scrubbing Text Reveal (Desire) */}
      <section id="method" className="py-48 px-6 md:px-12 lg:px-24 bg-[#0A0A0B] text-white min-h-[100dvh] flex items-center justify-center">
        <div className="max-w-[80rem] mx-auto">
          <p className="scrub-text font-heading font-semibold text-[clamp(2.5rem,6vw,6.5rem)] leading-[1.05] tracking-tight">
            Generic advice fails because your child isn't an algorithm. They are a deeply complex nervous system. Stop Googling for averages. Coach the individual.
          </p>
        </div>
      </section>

      {/* Action (CTA) - Magnetic & Clean */}
      <section className="relative py-48 px-6 text-center overflow-hidden min-h-[80dvh] flex items-center justify-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] bg-sage/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
          <h2 className="font-heading font-semibold text-[clamp(4.5rem,10vw,10rem)] leading-[0.85] tracking-tighter text-slate-900 mb-16">
            Start the <br/> timeline.
          </h2>
          <Button asChild className="magnetic h-20 px-12 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-2xl font-medium shadow-[0_20px_40px_-10px_rgba(0,0,0,0.2)]">
            <Link href="/app" className="flex items-center gap-4">
              Enter Platform
              <ArrowRight className="w-6 h-6" />
            </Link>
          </Button>
        </div>
      </section>

    </main>
  );
}
