import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sprout } from 'lucide-react';

export function Navigation() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/80 backdrop-blur-lg shadow-sm'
          : 'bg-transparent'
      }`}
    >
      <div className="flex items-center justify-between px-[6vw] py-5">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center transition-transform group-hover:scale-105">
            <Sprout className="w-5 h-5 text-white" />
          </div>
          <span className="font-heading font-semibold text-lg text-slate-850">
            Budding.live
          </span>
        </a>

        {/* Nav Links */}
        <div className="hidden md:flex items-center gap-8">
          <a
            href="#features"
            className="text-sm font-medium text-slate-550 hover:text-slate-850 transition-colors"
          >
            Features
          </a>
          <a
            href="#community"
            className="text-sm font-medium text-slate-550 hover:text-slate-850 transition-colors"
          >
            Community
          </a>
          <a
            href="#support"
            className="text-sm font-medium text-slate-550 hover:text-slate-850 transition-colors"
          >
            Support
          </a>
        </div>

        {/* CTA */}
        <Button
          asChild
          className="bg-accent hover:bg-accent/90 text-white rounded-full px-5 py-2 text-sm font-medium transition-all hover:shadow-lg hover:shadow-accent/25"
        >
          <Link href="/app">Get Early Access</Link>
        </Button>
      </div>
    </nav>
  );
}
