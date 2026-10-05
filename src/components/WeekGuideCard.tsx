import { useEffect, useState } from 'react';
import { Baby, HeartPulse, Loader2, PhoneCall, Smile, Users, CheckSquare, MessageCircleQuestion } from 'lucide-react';
import type { WeekGuide } from '@/lib/ai/weekGuide';

export function WeekGuideCard({ week }: { week: number }) {
  const [guide, setGuide] = useState<WeekGuide | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/week-guide?week=${week}`)
      .then(async (res) => {
        const body = await res.json();
        if (cancelled) return;
        if (res.ok) setGuide(body.guide);
        else setError(body.error);
      })
      .catch(() => !cancelled && setError('Could not load this week\'s guide.'));
    return () => { cancelled = true; };
  }, [week]);

  return (
    <section className="p-6 md:p-8 rounded-[2rem] bg-clay/10 border border-clay/20">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-white/60 p-3 rounded-full"><Baby className="w-6 h-6 text-clay" /></div>
        <div>
          <p className="text-xs font-semibold text-clay uppercase tracking-wider">Week {week}</p>
          {guide && <p className="font-heading text-xl text-slate-850">About the size of {guide.sizeComparison}</p>}
        </div>
      </div>

      {!guide && !error && <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 text-clay animate-spin" /></div>}
      {error && <p className="text-slate-600">{error}</p>}

      {guide && (
        <div className="space-y-5 text-slate-700 leading-relaxed">
          <p>{guide.babyThisWeek}</p>
          <Row icon={<HeartPulse className="w-4 h-4" />} title="Your body">{guide.yourBody}</Row>
          <Row icon={<Smile className="w-4 h-4" />} title="Your mind">{guide.yourMind}</Row>
          <Row icon={<Users className="w-4 h-4" />} title="For your partner or family">{guide.partnerTip}</Row>
          <Row icon={<CheckSquare className="w-4 h-4" />} title="This week">
            <ul className="list-disc pl-5 space-y-1">{guide.checklist.map((c) => <li key={c}>{c}</li>)}</ul>
          </Row>
          {guide.askYourDoctor.length > 0 && (
            <Row icon={<MessageCircleQuestion className="w-4 h-4" />} title="Ask at your next visit">
              <ul className="list-disc pl-5 space-y-1">{guide.askYourDoctor.map((q) => <li key={q}>{q}</li>)}</ul>
            </Row>
          )}
          <div className="p-4 rounded-2xl bg-white/70 border border-rose-100">
            <p className="flex items-center gap-2 text-sm font-semibold text-rose-700 mb-2"><PhoneCall className="w-4 h-4" /> Call your doctor now if</p>
            <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">{guide.callNowIf.map((r) => <li key={r}>{r}</li>)}</ul>
          </div>
          <p className="text-xs text-slate-500">General information, not medical advice. Your doctor knows your pregnancy best.</p>
        </div>
      )}
    </section>
  );
}

function Row({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{icon}{title}</p>
      <div>{children}</div>
    </div>
  );
}
