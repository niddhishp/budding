import type { Metadata } from 'next';
import Link from 'next/link';
import { archetypeFor, decodeAnswers } from '@/lib/temperament';
import { ResultActions } from './ResultActions';
import { SiteHeader } from '@/views/LandingPage';

type SearchParams = Promise<{ t?: string; n?: string }>;

function readParams({ t, n }: { t?: string; n?: string }) {
  const temperament = decodeAnswers(t);
  const name = n?.slice(0, 40).trim() || null;
  return { temperament, name, code: t ?? '' };
}

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const { temperament, name, code } = readParams(await searchParams);
  if (!temperament) return { title: 'Temperament quiz — Kahiye' };
  const archetype = archetypeFor(temperament);
  const title = `${name ?? 'My child'} is ${archetype.name} ${archetype.emoji}`;
  const og = `/api/og?t=${code}${name ? `&n=${encodeURIComponent(name)}` : ''}`;
  return {
    title: `${title} — Kahiye`,
    description: `${archetype.tagline} Find your child's temperament type in 60 seconds.`,
    openGraph: { title, description: archetype.tagline, images: [{ url: og, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, description: archetype.tagline, images: [og] },
  };
}

export default async function QuizResultPage({ searchParams }: { searchParams: SearchParams }) {
  const { temperament, name, code } = readParams(await searchParams);

  if (!temperament) {
    return (
      <main className="min-h-[100dvh] bg-canvas flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-slate-600">This result link is incomplete.</p>
        <Link href="/quiz" className="text-clay font-medium underline">Take the quiz</Link>
      </main>
    );
  }

  const archetype = archetypeFor(temperament);
  const childName = name ?? 'Your child';

  return (
    <main className="min-h-[100dvh] bg-canvas">
      <SiteHeader />
      <div className="max-w-xl mx-auto px-5 pt-4 pb-16">
        <div className="paper-grain relative overflow-hidden rounded-[2.5rem] bg-night text-[oklch(95%_0.015_82)] p-8 sm:p-10">
          <svg viewBox="0 0 120 120" aria-hidden className="absolute -right-6 -top-6 w-36 h-36">
            <circle cx="60" cy="60" r="52" className="fill-turmeric" />
            <circle cx="88" cy="40" r="34" className="fill-night" />
          </svg>
          <p className="relative text-sm font-semibold text-turmeric tracking-wide mb-4">{childName} is</p>
          <h1 className="relative font-heading text-4xl sm:text-5xl leading-[1.08] mb-4 max-w-[14ch]">
            {archetype.name} <span aria-hidden className="font-sans">{archetype.emoji}</span>
          </h1>
          <p className="relative text-xl leading-relaxed text-[oklch(84%_0.025_82)]">{archetype.tagline}</p>
        </div>

        <p className="mt-10 text-lg text-slate-700 leading-relaxed">{archetype.description}</p>

        <h2 className="mt-12 mb-5 font-heading text-2xl text-slate-900">What works with {name ?? 'them'}</h2>
        <ol className="space-y-5">
          {archetype.tips.map((tip, i) => (
            <li key={tip} className="flex gap-4 text-lg text-slate-700 leading-relaxed">
              <span className="w-5 flex-shrink-0 font-heading text-2xl leading-none text-clay pt-0.5 [font-variant-numeric:lining-nums_tabular-nums]" aria-hidden>{i + 1}</span>
              {tip}
            </li>
          ))}
        </ol>

        <ResultActions code={code} name={name} archetypeName={archetype.name} emoji={archetype.emoji} />

        <p className="mt-10 text-sm text-slate-500 leading-relaxed">
          A playful snapshot based on your answers, not a psychological assessment. Temperament shifts with age and context.
        </p>
      </div>
    </main>
  );
}
