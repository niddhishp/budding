'use client';

import { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { MomentReflection } from '@/components/MomentQuiz';
import { encodeMomentShare } from '@/lib/moments';
import { INTAKE_BANDS, QUIZ_STORAGE_KEY, parseSavedMoments, type Answers, type IntakeBand } from '@/lib/temperament';

export function MomentResultActions({ band, answers }: { band: IntakeBand; answers: Answers }) {
  const [message, setMessage] = useState('');
  const share = async () => {
    const url = `${window.location.origin}/quiz/result?t=${encodeMomentShare(band, answers)}`;
    try { await navigator.clipboard.writeText(url); setMessage('Link copied. It includes these choices and age group, without a name.'); }
    catch { setMessage(`Copy this link: ${url}`); }
  };
  return <div className="mt-8 border-t border-slate-200 pt-7 space-y-4">
    <Link href="/app" className="inline-block rounded-full bg-clay text-white px-6 py-4">Get help with a real moment</Link>
    <p className="text-sm text-slate-600">A profile starts with the basics. Adding everyday moments is always optional.</p>
    <button onClick={share} className="py-3 text-leaf underline underline-offset-4">Copy a link to these ideas</button>
    <p className="text-xs text-slate-600">Anyone with the link can see the age group and choices. Your child’s name is left out.</p>
    <p role="status" className="text-sm text-slate-600 break-all">{message}</p>
  </div>;
}
const subscribe = (callback: () => void) => { window.addEventListener('storage', callback); return () => window.removeEventListener('storage', callback); };
const snapshot = () => { try { return localStorage.getItem(QUIZ_STORAGE_KEY); } catch { return null; } };
export function MomentResult({ shared }: { shared?: { band: IntakeBand; answers: Answers } }) {
  const raw = useSyncExternalStore(subscribe, snapshot, () => null);
  const result = shared ?? parseSavedMoments(raw);
  return <main className="min-h-screen bg-canvas px-5 py-10"><div className="max-w-xl mx-auto">
    <Link href="/" className="font-heading text-2xl">kahiye</Link>
    <h1 className="font-heading text-4xl mt-12 mb-6">A few things to try.</h1>
    {result ? <>
      <p className="text-sm text-clay mb-6">Everyday moments · {INTAKE_BANDS.find(b => b.id === result.band)?.label}</p>
      <MomentReflection band={result.band} answers={result.answers} />
      <MomentResultActions band={result.band} answers={result.answers} />
    </> : <p className="text-slate-600">There are no recent choices saved in this browser.</p>}
    <Link href="/quiz" className="inline-block mt-6 py-3 underline underline-offset-4 text-leaf">Try your own four moments</Link>
  </div></main>;
}
