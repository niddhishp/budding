import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2, Stethoscope, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/stores/appStore';
import { EXPERT_SESSION, STORY_LANGUAGES } from '@/lib/plans';

export function ExpertSheet() {
  const { expert, closeExpert, selectedChildId } = useAppStore();
  const [concern, setConcern] = useState(expert.concern ?? '');
  const [phone, setPhone] = useState('');
  const [language, setLanguage] = useState<string>('English');
  const [time, setTime] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!expert.open) return null;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/expert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concern: concern.trim(),
          phone: phone.trim(),
          preferredLanguage: language,
          preferredTime: time.trim() || undefined,
          childId: selectedChildId ?? undefined,
          source: expert.source,
        }),
      });
      const body = await res.json();
      if (!res.ok && res.status !== 409) throw new Error(body.error);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Could not send. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={closeExpert} />
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="expert-title"
        className="relative w-full sm:max-w-lg max-h-[100dvh] overflow-y-auto bg-white rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl p-6 sm:p-8"
      >
        <button onClick={closeExpert} aria-label="Close" className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">
          <X className="w-4 h-4" />
        </button>

        {done ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto rounded-full bg-sage/10 flex items-center justify-center mb-5"><Check className="w-8 h-8 text-sage" /></div>
            <h2 id="expert-title" className="font-heading text-3xl text-slate-850 mb-2">We'll call you.</h2>
            <p className="text-slate-500 mb-8">Expect a call within one working day to match you with a child psychologist and find a time.</p>
            <Button onClick={closeExpert} className="rounded-full bg-slate-850 text-white px-8 h-12">Done</Button>
          </div>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-sage/10 flex items-center justify-center mb-5"><Stethoscope className="w-6 h-6 text-sage" /></div>
            <h2 id="expert-title" className="font-heading text-3xl text-slate-850 mb-2 pr-8">Talk to a child psychologist</h2>
            <p className="text-slate-500 mb-6">
              A {EXPERT_SESSION.minutes}-minute video session with a qualified child psychologist, from {EXPERT_SESSION.price}. We call you first to understand the concern and match the right expert.
            </p>

            <label className="block text-sm font-medium text-slate-700 mb-2" htmlFor="expert-concern">What's worrying you?</label>
            <textarea
              id="expert-concern"
              value={concern}
              onChange={(e) => setConcern(e.target.value)}
              maxLength={2000}
              className="w-full h-28 p-4 rounded-2xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-sage resize-none mb-4"
            />
            <label className="block text-sm font-medium text-slate-700 mb-2" htmlFor="expert-phone">Phone number</label>
            <input
              id="expert-phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98xxx xxxxx"
              className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-sage mb-4"
            />
            <div className="grid grid-cols-2 gap-3 mb-2">
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-2">Language</span>
                <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full h-12 px-3 rounded-2xl border border-slate-200 bg-slate-50">
                  {STORY_LANGUAGES.map((l) => <option key={l}>{l}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-2">Best time to call</span>
                <input value={time} onChange={(e) => setTime(e.target.value)} placeholder="e.g., weekday evenings" className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50" />
              </label>
            </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <Button
              onClick={submit}
              disabled={busy || concern.trim().length < 5 || phone.trim().length < 8}
              className="mt-6 w-full h-14 rounded-full bg-slate-850 hover:bg-slate-800 text-white text-lg"
            >
              {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Request a call'}
            </Button>
            <p className="mt-3 text-xs text-center text-slate-400">No payment now. In an emergency, call 112.</p>
          </>
        )}
      </motion.div>
    </div>
  );
}
