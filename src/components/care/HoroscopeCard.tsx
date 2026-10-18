"use client";
import { useCallback, useState, useSyncExternalStore } from 'react';
import type { Child } from '@/types';
import { sunSign, horoscopeLine } from '@/lib/horoscope';
import { useTodayDate } from './useTodayDate';

export function HoroscopeCard({ child, profile = false }: { child: Child; profile?: boolean }) {
  const date = useTodayDate();
  const sign = sunSign(child.dateOfBirth, date);
  const key = `kahiye.horoscope.v1.${child.id}`;
  const [fallback, setFallback] = useState<boolean | null>(null);
  const subscribe = useCallback((notify: () => void) => {
    window.addEventListener('storage', notify);
    window.addEventListener('kahiye-horoscope-change', notify);
    return () => { window.removeEventListener('storage', notify); window.removeEventListener('kahiye-horoscope-change', notify); };
  }, []);
  const read = useCallback(() => { try { return localStorage.getItem(key) !== 'no'; } catch { return true; } }, [key]);
  const stored = useSyncExternalStore(subscribe, read, () => false);
  const enabled = fallback ?? stored;
  function toggle(next: boolean) {
    try { localStorage.setItem(key, next ? 'yes' : 'no'); setFallback(null); window.dispatchEvent(new Event('kahiye-horoscope-change')); } catch { setFallback(next); }
  }
  if (!sign || (!profile && !enabled)) return null;
  return <section className="rounded-2xl bg-paper-deep p-6 my-7" aria-label="A little starlight">
    <p className="text-xs text-clay">✧ A little starlight · Just for fun</p>
    <h2 className="font-heading text-xl mt-2">{sign} · {child.name}’s little spark</h2>
    {enabled && <p className="mt-3 text-slate-700" aria-live="polite">{horoscopeLine(sign, date)}</p>}
    <p className="text-xs text-slate-500 mt-3">A playful sun-sign reflection, not a prediction.</p>
    <button className="text-xs text-clay underline py-3" onClick={() => toggle(!enabled)}>{enabled ? 'Hide horoscope' : 'Bring back a little starlight'}</button>
    {fallback !== null && <p className="text-xs">This choice could not be saved in your browser.</p>}
  </section>;
}
