import { useRequestScope } from '@/hooks/useRequestScope';
import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Loader2, X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/stores/appStore';
import type { Decode } from '@/types';
import type { HandbookCard } from '@/data/handbook';
import { FREE_TRANSLATED_SHARES_PER_MONTH } from '@/lib/plans';

const LANGUAGES = [
  { value: 'English', label: 'English' },
  { value: 'Hindi', label: 'हिन्दी' },
  { value: 'Malayalam', label: 'മലയാളം' },
  { value: 'Tamil', label: 'தமிழ்' },
  { value: 'Marathi', label: 'मराठी' },
  { value: 'Bengali', label: 'বাংলা' },
  { value: 'Telugu', label: 'తెలుగు' },
  { value: 'Kannada', label: 'ಕನ್ನಡ' },
  { value: 'Gujarati', label: 'ગુજરાતી' },
] as const;

const AUDIENCES = [
  { value: 'grandparent', label: 'Grandparent' },
  { value: 'nanny', label: 'Nanny / helper' },
  { value: 'partner', label: 'Partner' },
  { value: 'teacher', label: 'Teacher' },
] as const;

type Language = (typeof LANGUAGES)[number]['value'];
type Audience = (typeof AUDIENCES)[number]['value'];

type ShareSource =
  | { decode: Decode; card?: never; childId?: never }
  | { card: HandbookCard; childId: string; decode?: never };

// One script, every caregiver: turns a decode or a Handbook card into a WhatsApp-ready message in their language.
export function ShareSheet({ childName, onClose, ...source }: ShareSource & { childName: string; onClose: () => void }) {
  const childId = source.decode ? source.decode.childId : source.childId;
  const scope = useRequestScope();
  const active = useRef<AbortSignal | null>(null);
  const { entitlement, openPaywall, children } = useAppStore();
  const isPlus = entitlement?.plan === 'plus';
  // Start in the family's home language when it is one we can write.
  const homeLanguage = children.find(c => c.id === childId)?.homeLanguages.find(h => LANGUAGES.some(l => l.value === h)) as Language | undefined;
  const [language, setLanguage] = useState<Language>(homeLanguage ?? 'English');
  const [translatedLeft, setTranslatedLeft] = useState<number | null>(null);
  const [audience, setAudience] = useState<Audience>('grandparent');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const pickLanguage = (value: Language) => {
    active.current = null; scope.cancel(); setBusy(false);
    setLanguage(value);
    setMessage('');
  };

  const generate = async () => {
    const task = scope.start();
    active.current = task.signal;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/share', {
        method: 'POST', signal: task.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(source.decode ? { decodeId: source.decode.id, language, audience } : { cardId: source.card.id, childId, language, audience }),
      });
      const body = await res.json();
      if (!task.active()) return;
      if (res.status === 402) {
        openPaywall(body.error);
        return;
      }
      if (!res.ok) throw new Error(body.error);
      setMessage(body.message);
      if (typeof body.translatedLeft === 'number') setTranslatedLeft(body.translatedLeft);
    } catch (err) {
      if (active.current !== task.signal) return;
      setError(err instanceof Error && err.message ? err.message : 'Could not write the message. Please try again.');
    } finally {
      task.finish();
      if (active.current === task.signal) { active.current = null; setBusy(false); }
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard blocked; the text is still selectable */ }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-title"
        className="relative w-full sm:max-w-lg max-h-[100dvh] overflow-y-auto bg-white rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl p-6 sm:p-8"
      >
        <button onClick={onClose} aria-label="Close" className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">
          <X className="w-4 h-4" />
        </button>
        <h2 id="share-title" className="font-heading text-2xl text-slate-850 mb-1 pr-8">Everyone, same words.</h2>
        <p className="text-slate-500 text-sm mb-6">{source.card ? <>Send the words from “{source.card.title}” for {childName}, so every caregiver can use them.</> : <>Send this plan for {childName} so every caregiver responds the same way.</>}</p>

        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">For</p>
        <div className="flex flex-wrap gap-2 mb-5">
          {AUDIENCES.map((a) => (
            <button
              key={a.value}
              onClick={() => { active.current = null; scope.cancel(); setBusy(false); setAudience(a.value); setMessage(''); }}
              className={`px-4 py-2 rounded-full text-sm border transition-colors ${audience === a.value ? 'border-clay bg-clay/10 text-slate-850 font-medium' : 'border-slate-200 text-slate-600'}`}
            >
              {a.label}
            </button>
          ))}
        </div>

        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Language</p>
        <div className="flex flex-wrap gap-2 mb-6">
          {LANGUAGES.map((l) => {
            return (
              <button
                key={l.value}
                onClick={() => pickLanguage(l.value)}
                className={`flex items-center gap-1 px-3 py-2 rounded-full text-sm border transition-colors ${
                  language === l.value ? 'border-clay bg-clay/10 text-slate-850 font-medium' : 'border-slate-200 text-slate-600'
                }`}
              >
                {l.label}
              </button>
            );
          })}
        </div>

        {!isPlus && (
          <p className="text-xs text-slate-600 -mt-3 mb-6">
            {translatedLeft !== null
              ? `${Math.max(0, translatedLeft)} of ${FREE_TRANSLATED_SHARES_PER_MONTH} messages in other languages left, counted over the last 30 days. English is always free.`
              : `Free plan: ${FREE_TRANSLATED_SHARES_PER_MONTH} messages every 30 days in other languages. English is always free.`}
          </p>
        )}

        {message ? (
          <>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full min-h-40 p-4 rounded-2xl border border-slate-200 bg-slate-50 text-slate-800 leading-relaxed focus:outline-none focus:border-clay resize-none"
            />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button onClick={copy} variant="outline" className="h-12 rounded-full">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button asChild className="h-12 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white">
                <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">
                  <Send className="w-4 h-4" /> WhatsApp
                </a>
              </Button>
            </div>
          </>
        ) : (
          <Button onClick={generate} disabled={busy} className="w-full h-12 rounded-full bg-slate-850 hover:bg-slate-800 text-white">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Write the message'}
          </Button>
        )}
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </motion.div>
    </div>
  );
}
