'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

type Method = 'lmp' | 'conception' | 'ivf';
const DAY = 86_400_000;

const METHODS: { id: Method; label: string; field: string }[] = [
  { id: 'lmp', label: 'Last period', field: 'First day of your last period' },
  { id: 'conception', label: 'Conception', field: 'Conception date' },
  { id: 'ivf', label: 'IVF transfer', field: 'Embryo transfer date' },
];

// Common antenatal moments (India and international practice); shown as "usually around".
const MILESTONES = [
  { week: 8, text: 'First antenatal visit and dating scan, usually weeks 6–9' },
  { week: 12, text: 'NT scan and first-trimester screening, weeks 11–14' },
  { week: 14, text: 'Second trimester begins; energy often returns' },
  { week: 20, text: 'Anomaly (anatomy) scan, weeks 18–22' },
  { week: 26, text: 'Glucose test for gestational diabetes, weeks 24–28' },
  { week: 28, text: 'Third trimester begins; start counting kicks' },
  { week: 36, text: 'Hospital bag packed; birth plan conversation' },
  { week: 40, text: 'Due date' },
];

function parseLocal(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}
const toISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmt = (d: Date) => d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export function DueDateCalculator() {
  const [method, setMethod] = useState<Method>('lmp');
  const [date, setDate] = useState('');
  const [cycle, setCycle] = useState(28);
  const [embryoDay, setEmbryoDay] = useState<3 | 5>(5);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let due: Date | null = null;
  if (date) {
    const d = parseLocal(date);
    if (method === 'lmp') due = new Date(d.getTime() + (280 + (cycle - 28)) * DAY);
    if (method === 'conception') due = new Date(d.getTime() + 266 * DAY);
    if (method === 'ivf') due = new Date(d.getTime() + (embryoDay === 5 ? 261 : 263) * DAY);
  }

  const daysToGo = due ? Math.round((due.getTime() - today.getTime()) / DAY) : 0;
  const gestDays = 280 - daysToGo;
  const week = Math.floor(gestDays / 7);
  const dayOfWeek = gestDays % 7;
  const valid = !!due && gestDays >= 0 && gestDays <= 300;
  const trimester = week < 14 ? 'First' : week < 28 ? 'Second' : 'Third';
  const next = valid ? MILESTONES.filter((m) => m.week >= week).slice(0, 3) : [];

  const startWithGuide = () => {
    if (!due) return;
    try { localStorage.setItem('budding.dueDate', toISO(due)); } catch { /* storage unavailable */ }
  };

  return (
    <div className="mt-10">
      <div className="rounded-[2rem] bg-surface shadow-paper p-6 sm:p-8">
        <div role="radiogroup" aria-label="Calculate from" className="grid grid-cols-3 gap-2 p-1 rounded-full bg-slate-100">
          {METHODS.map((m) => (
            <button
              key={m.id}
              role="radio"
              aria-checked={method === m.id}
              onClick={() => setMethod(m.id)}
              className={`h-11 rounded-full text-sm sm:text-[15px] font-semibold transition-colors ${method === m.id ? 'bg-surface text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="mt-6 grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-sm font-semibold text-slate-700 mb-2">{METHODS.find((m) => m.id === method)!.field}</span>
            <input
              type="date"
              value={date}
              max={toISO(today)}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-paper text-slate-850 focus:outline-none focus:border-clay"
            />
          </label>
          {method === 'lmp' && (
            <label className="block">
              <span className="block text-sm font-semibold text-slate-700 mb-2">Usual cycle length</span>
              <select value={cycle} onChange={(e) => setCycle(Number(e.target.value))} className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-paper text-slate-850">
                {Array.from({ length: 22 }, (_, i) => 21 + i).map((n) => <option key={n} value={n}>{n} days</option>)}
              </select>
            </label>
          )}
          {method === 'ivf' && (
            <label className="block">
              <span className="block text-sm font-semibold text-slate-700 mb-2">Embryo age at transfer</span>
              <select value={embryoDay} onChange={(e) => setEmbryoDay(Number(e.target.value) as 3 | 5)} className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-paper text-slate-850">
                <option value={5}>Day 5 (blastocyst)</option>
                <option value={3}>Day 3</option>
              </select>
            </label>
          )}
        </div>
      </div>

      {date && !valid && (
        <p className="mt-6 text-slate-600">That date doesn&rsquo;t look like a current pregnancy. Check the date and try again.</p>
      )}

      {valid && due && (
        <div className="mt-8 rounded-[2rem] bg-night text-[oklch(95%_0.015_82)] p-7 sm:p-9 paper-grain" aria-live="polite">
          <p className="text-sm font-semibold text-turmeric tracking-wide">Your estimated due date</p>
          <p className="mt-2 font-heading text-[clamp(1.9rem,4.5vw,2.8rem)] leading-tight">{fmt(due)}</p>
          <p className="mt-4 text-lg text-[oklch(84%_0.025_82)]">
            You&rsquo;re <b className="text-[oklch(95%_0.015_82)]">{week} weeks{dayOfWeek ? ` and ${dayOfWeek} day${dayOfWeek > 1 ? 's' : ''}` : ''}</b> pregnant
            · {trimester} trimester · {daysToGo > 0 ? `${daysToGo} days to go` : 'any day now'}
          </p>

          {next.length > 0 && (
            <div className="mt-8 pt-6 border-t border-white/15">
              <p className="text-sm font-semibold text-turmeric tracking-wide mb-3">Coming up</p>
              <ul className="space-y-2 text-[oklch(88%_0.02_82)]">
                {next.map((m) => <li key={m.week}>Week {m.week}: {m.text}</li>)}
              </ul>
            </div>
          )}

          <Link
            href="/login?next=/app"
            onClick={startWithGuide}
            className="mt-8 inline-flex items-center gap-2 h-12 px-6 rounded-full bg-clay text-white font-semibold transition-colors hover:bg-clay-deep"
          >
            Get your week-by-week guide, free <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
