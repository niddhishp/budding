import type { Metadata } from 'next';
import Link from 'next/link';
import { archetypeFor, decodeAnswers } from '@/lib/temperament';
import { ResultActions } from './ResultActions';

type SearchParams = Promise<{ t?: string; n?: string }>;

function readParams({ t, n }: { t?: string; n?: string }) {
  const temperament = decodeAnswers(t);
  const name = n?.slice(0, 40).trim() || null;
  return { temperament, name, code: t ?? '' };
}

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const { temperament, name, code } = readParams(await searchParams);
  if (!temperament) return { title: 'Temperament quiz — Budding' };
  const archetype = archetypeFor(temperament);
  const title = `${name ?? 'My child'} is ${archetype.name} ${archetype.emoji}`;
  const og = `/api/og?t=${code}${name ? `&n=${encodeURIComponent(name)}` : ''}`;
  return {
    title: `${title} — Budding`,
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
        <Link href="/quiz" className="text-sage font-medium underline">Take the quiz</Link>
      </main>
    );
  }

  const archetype = archetypeFor(temperament);
  const childName = name ?? 'Your child';

  return (
    <main className="min-h-[100dvh] bg-canvas px-5 py-8">
      <div className="max-w-xl mx-auto">
        <Link href="/" className="font-heading font-bold text-xl text-slate-900">Budding.</Link>

        <div className="mt-8 p-8 sm:p-10 rounded-[2.5rem] bg-slate-900 text-white relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-sage/30 blur-3xl" />
          <p className="relative text-sm font-semibold text-sage uppercase tracking-widest mb-4">{childName} is</p>
          <h1 className="relative font-heading text-4xl sm:text-5xl leading-tight mb-3">
            {archetype.name} <span aria-hidden>{archetype.emoji}</span>
          </h1>
          <p className="relative text-xl text-white/70">{archetype.tagline}</p>
        </div>

        <p className="mt-8 text-lg text-slate-700 leading-relaxed">{archetype.description}</p>

        <h2 className="mt-10 mb-4 text-sm font-semibold text-slate-500 uppercase tracking-wider">What works with {name ?? 'them'}</h2>
        <ul className="space-y-3">
          {archetype.tips.map((tip) => (
            <li key={tip} className="p-5 rounded-2xl bg-white border border-slate-200/60 text-slate-700 leading-relaxed">{tip}</li>
          ))}
        </ul>

        <ResultActions code={code} name={name} archetypeName={archetype.name} emoji={archetype.emoji} />

        <p className="mt-10 text-xs text-slate-400 leading-relaxed">
          A playful snapshot based on your answers, not a psychological assessment. Temperament shifts with age and context.
        </p>
      </div>
    </main>
  );
}
