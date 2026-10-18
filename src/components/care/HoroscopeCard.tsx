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
  const read = useCallback(() => { try { return localStorage.getItem(key) === 'yes'; } catch { return false; } }, [key]);
  const stored = useSyncExternalStore(subscribe, read, () => false);
  const enabled = fallback ?? stored;
  function toggle(next: boolean) {
    try { if (next) localStorage.setItem(key, 'yes'); else localStorage.removeItem(key); setFallback(null); window.dispatchEvent(new Event('kahiye-horoscope-change')); } catch { setFallback(next); }
  }
  if (!sign || (!profile && !enabled)) return null;
  return <section className="border-y py-5 my-7" aria-label="Optional horoscope">
    <p className="text-xs text-clay">Just for fun · Western sun sign</p>
    <h2 className="font-heading text-xl mt-2">{sign}</h2>
    {enabled && <p className="mt-3 text-slate-700" aria-live="polite">{horoscopeLine(sign, date)}</p>}
    {profile ? <>
      <label className="flex gap-3 text-sm mt-4"><input type="checkbox" checked={enabled} onChange={e => toggle(e.target.checked)} />Show a one-line horoscope reflection in Today</label>
      <p className="text-xs text-slate-500 mt-3">{fallback !== null ? 'This choice could not be saved in your browser.' : 'This optional preference is saved only in this browser.'} Date-based calendar ranges are approximate near sign boundaries. This is an editorial reflection, not a prediction or assessment of your child.</p>
    </> : <><p className="text-xs text-slate-500 mt-3">An editorial reflection, not a prediction. It does not shape health, talent, money or product guidance.</p><button className="text-xs text-clay underline py-3" onClick={() => toggle(false)}>Hide horoscope</button></>}
  </section>;
}
