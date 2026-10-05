import { useCallback, useEffect, useState } from 'react';
import { CalendarRange, Loader2, Printer, Sparkles, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/stores/appStore';
import type { Child, Report } from '@/types';

export function WeeklyReportCard({ child }: { child: Child }) {
  const { entitlement, openPaywall, openExpert } = useAppStore();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/report?childId=${child.id}`);
      const body = await res.json();
      setReport(res.ok ? body.report : null);
    } catch {
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [child.id]);

  useEffect(() => {
    load();
  }, [load]);

  const generate = async () => {
    if (entitlement?.plan !== 'plus') {
      openPaywall(`See ${child.name}'s patterns every week.`);
      return;
    }
    setGenerating(true);
    setMessage(null);
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId: child.id }),
      });
      const body = await res.json();
      if (res.status === 402) openPaywall(body.error);
      else if (!res.ok) setMessage(body.error);
      else setReport(body.report);
    } catch {
      setMessage('The connection dropped. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const isStale = !report || Date.now() - new Date(report.createdAt).getTime() > 86_400_000;

  return (
    <section className="print-area mb-12 p-6 md:p-8 rounded-[2rem] bg-white border border-slate-200/60 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-clay/10 flex items-center justify-center">
            <CalendarRange className="w-5 h-5 text-clay" />
          </div>
          <div>
            <h2 className="font-heading text-xl text-slate-850">{child.name}'s week</h2>
            {report && (
              <p className="text-xs text-slate-400">
                {fmt(report.periodStart)} – {fmt(report.periodEnd)}
              </p>
            )}
          </div>
        </div>
        {report && (
          <button onClick={() => window.print()} className="print:hidden flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800" aria-label="Print or save as PDF">
            <Printer className="w-4 h-4" /> <span className="hidden sm:inline">Save PDF</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 text-slate-300 animate-spin" /></div>
      ) : report ? (
        <div className="space-y-6">
          <p className="font-heading text-2xl text-slate-850 leading-snug">{report.report.headline}</p>

          {report.report.patterns.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Patterns</h3>
              <ul className="space-y-3">
                {report.report.patterns.map((p) => (
                  <li key={p.title}>
                    <p className="font-medium text-slate-850">{p.title}</p>
                    <p className="text-slate-600 leading-relaxed">{p.detail}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report.report.whatsWorking.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">What's working</h3>
              <ul className="space-y-2">
                {report.report.whatsWorking.map((w) => (
                  <li key={w} className="text-slate-700 leading-relaxed pl-4 border-l-2 border-clay">{w}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Try this week</h3>
            <ol className="space-y-2">
              {report.report.tryThisWeek.map((t, i) => (
                <li key={t} className="flex gap-3 text-slate-700 leading-relaxed">
                  <span className="w-6 h-6 flex-shrink-0 rounded-full bg-leaf/10 text-leaf text-xs font-semibold flex items-center justify-center mt-0.5">{i + 1}</span>
                  {t}
                </li>
              ))}
            </ol>
          </div>

          {report.report.watchFor && (
            <div className="flex gap-3 p-4 rounded-2xl bg-amber-50 text-amber-900">
              <Stethoscope className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm leading-relaxed"><span className="font-semibold block mb-1">Worth discussing with your pediatrician</span>{report.report.watchFor}
                <button onClick={() => openExpert('report', report.report.watchFor)} className="print:hidden block mt-2 font-semibold underline underline-offset-4">
                  Or talk to a child psychologist
                </button>
              </p>
            </div>
          )}

          <p className="text-slate-500 italic leading-relaxed">{report.report.encouragement}</p>

          {isStale && (
            <Button onClick={generate} disabled={generating} variant="outline" className="print:hidden rounded-full">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Refresh for this week
            </Button>
          )}
          <p className="hidden print:block text-xs text-slate-400">Generated by Kahiye from the parent's own notes. General guidance, not a clinical assessment.</p>
        </div>
      ) : (
        <div>
          <p className="text-slate-600 leading-relaxed mb-5">
            Every week, Kahiye reads your notes and decodes for {child.name} and shows the patterns: triggers, times of day, and what is actually working. Save it as a PDF for your pediatrician.
          </p>
          <Button onClick={generate} disabled={generating} className="rounded-full bg-slate-850 hover:bg-slate-800 text-white px-6">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {entitlement?.plan === 'plus' ? "Generate this week's report" : 'See weekly patterns with Plus'}
          </Button>
        </div>
      )}

      {message && <p className="mt-4 text-sm text-slate-600">{message}</p>}
    </section>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
