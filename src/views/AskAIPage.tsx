import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import { getSupabase } from '@/lib/supabase';
import { DECODE_COLUMNS, decodeFromRow, type DecodeRow } from '@/lib/mappers';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { motion } from 'framer-motion';
import {
  Send, Sparkles, Heart, MessageSquare, AlertTriangle, Shield, Mic, MicOff,
  Phone, ThumbsUp, ThumbsDown, Minus, Clock, Loader2, Share2,
} from 'lucide-react';
import { ShareSheet } from '@/components/ShareSheet';
import { readNdjson } from '@/lib/ndjson';
import { extractPartialString } from '@/lib/partialJson';
import type { Child, Decode, DecodeOutcome, DecodeStreamEvent, SafetyNotice } from '@/types';

const SPRING_TRANSITION = { type: 'spring', stiffness: 100, damping: 20 } as const;

const EXAMPLES: Record<Child['age']['stage'], string[]> = {
  pregnancy: ['I feel anxious about the birth and can\'t sleep', 'My partner and I disagree about how to raise the baby'],
  infancy: ['She cries every time I put her down', 'He bites when he gets frustrated', 'Won\'t sleep unless we rock him for an hour'],
  'early-childhood': ['Refuses to leave the park and screams', 'Says "I hate you" when I say no', 'Hits his little sister when she takes his toys'],
  'middle-childhood': ['Melts down over homework every evening', 'Lies about small things', 'Won\'t stop gaming when time is up'],
  teenage: ['Slammed the door and won\'t talk to me', 'Grades dropping and stays in their room', 'Wants to go to a party I\'m not comfortable with'],
};

const OUTCOME_LABELS: Record<DecodeOutcome, string> = {
  worked: 'It worked',
  partly: 'Partly',
  did_not_work: 'Didn\'t work',
};

// Minimal Web Speech API typing; available in Chrome, Edge and Safari.
type Recognition = {
  lang: string; interimResults: boolean; continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null; onerror: (() => void) | null;
  start: () => void; stop: () => void;
};
function createRecognition(): Recognition | null {
  if (typeof window === 'undefined') return null;
  const Ctor = (window as unknown as Record<string, new () => Recognition>).SpeechRecognition
    ?? (window as unknown as Record<string, new () => Recognition>).webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export function AskAIPage() {
  const { selectedChildId, children, entitlement, setEntitlement, openPaywall, openExpert } = useAppStore();
  const selectedChild = children.find((c) => c.id === selectedChildId);

  const [scenario, setScenario] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [current, setCurrent] = useState<Decode | null>(null);
  const [safety, setSafety] = useState<SafetyNotice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [streamingSay, setStreamingSay] = useState<string | null>(null);
  const [sharing, setSharing] = useState<Decode | null>(null);
  const [history, setHistory] = useState<Decode[]>([]);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<Recognition | null>(null);
  const [voiceSupported, setVoiceSupported] = useState(false);

  useEffect(() => setVoiceSupported(!!createRecognition()), []);

  const loadHistory = useCallback(async () => {
    if (!selectedChildId) return;
    const { data } = await getSupabase()
      .from('decodes')
      .select(DECODE_COLUMNS)
      .eq('child_id', selectedChildId)
      .order('created_at', { ascending: false })
      .limit(10)
      .returns<DecodeRow[]>();
    setHistory((data ?? []).map(decodeFromRow));
  }, [selectedChildId]);

  useEffect(() => {
    setCurrent(null);
    setSafety(null);
    setError(null);
    loadHistory();
  }, [loadHistory]);

  const toggleVoice = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const rec = createRecognition();
    if (!rec) return;
    rec.lang = navigator.language || 'en-IN';
    rec.interimResults = true;
    rec.continuous = true;
    const base = scenario ? `${scenario.trim()} ` : '';
    rec.onresult = (e) => {
      const text = Array.from(e.results).map((r) => r[0].transcript).join('');
      setScenario(base + text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  };

  const handleAnalyze = async () => {
    if (!scenario.trim() || !selectedChild || isAnalyzing) return;
    recognitionRef.current?.stop();
    setIsAnalyzing(true);
    setCurrent(null);
    setSafety(null);
    setError(null);
    setStreamingSay(null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId: selectedChild.id, scenario: scenario.trim() }),
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => null);
        if (body?.entitlement) setEntitlement(body.entitlement);
        if (body?.code === 'upgrade_required') openPaywall(body.error);
        setError(body?.error ?? 'Something went wrong. Please try again.');
        return;
      }

      let json = '';
      for await (const event of readNdjson<DecodeStreamEvent>(res.body)) {
        switch (event.type) {
          case 'safety':
            setSafety(event.safety);
            break;
          case 'delta': {
            json += event.text;
            const partial = extractPartialString(json, 'sayThis');
            if (partial) setStreamingSay(partial.text);
            break;
          }
          case 'done':
            setCurrent(event.decode);
            setEntitlement(event.entitlement);
            setHistory((h) => [event.decode, ...h].slice(0, 10));
            break;
          case 'error':
            setError(event.error);
            break;
        }
      }
    } catch {
      setError('The connection dropped. Check your internet and try again.');
    } finally {
      setStreamingSay(null);
      setIsAnalyzing(false);
    }
  };

  const recordOutcome = async (decode: Decode, outcome: DecodeOutcome) => {
    const update = (d: Decode) => (d.id === decode.id ? { ...d, outcome } : d);
    setCurrent((c) => (c ? update(c) : c));
    setHistory((h) => h.map(update));
    const { error: updateError } = await getSupabase()
      .from('decodes')
      .update({ outcome, outcome_at: new Date().toISOString() })
      .eq('id', decode.id);
    if (updateError) console.error('[decode] outcome not saved', updateError.message);
  };

  const analysis = current?.analysis;
  const examples = selectedChild ? EXAMPLES[selectedChild.age.stage] : [];

  return (
    <div className="max-w-5xl mx-auto pt-8 md:pt-12 pb-24 px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING_TRANSITION}
        className="mb-8 md:mb-12"
      >
        <h1 className="font-heading text-4xl md:text-5xl text-slate-850 leading-tight mb-3">
          What's happening with {selectedChild?.name}?
        </h1>
        <p className="text-slate-500 text-lg max-w-xl">
          Describe the moment. You'll get the exact words to say, tuned to {selectedChild?.name}'s temperament.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-12 gap-10 md:gap-12">
        <div className="md:col-span-7">
          <div className="relative">
            <Textarea
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAnalyze();
              }}
              maxLength={2000}
              placeholder={`e.g., ${examples[0] ?? 'What happened, and what did you try?'}`}
              className="w-full min-h-[140px] px-5 pt-4 pb-16 rounded-[2rem] border-slate-200 bg-white/70 backdrop-blur-md text-slate-800 text-lg placeholder:text-slate-400 focus:border-clay focus:ring-clay/20 resize-none shadow-sm"
            />
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
              {voiceSupported ? (
                <button
                  type="button"
                  onClick={toggleVoice}
                  aria-label={listening ? 'Stop voice input' : 'Speak instead of typing'}
                  className={`flex items-center gap-2 h-10 px-4 rounded-full text-sm font-medium transition-colors ${
                    listening ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  {listening ? 'Listening…' : 'Speak'}
                </button>
              ) : <span />}
              <Button
                onClick={handleAnalyze}
                disabled={!scenario.trim() || isAnalyzing}
                className="bg-slate-850 hover:bg-slate-800 text-white rounded-full px-6 h-10 disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Thinking</span>
                ) : (
                  <span className="flex items-center gap-2">Decode <Send className="w-4 h-4" /></span>
                )}
              </Button>
            </div>
          </div>

          {entitlement && (
            <p className="mt-3 text-xs text-slate-400">
              {entitlement.plan === 'free' ? (
                <>
                  {Math.max(0, entitlement.limit - entitlement.used)} of {entitlement.limit} free decodes left this week ·{' '}
                  <button onClick={() => openPaywall()} className="text-leaf font-medium hover:underline">Go unlimited</button>
                </>
              ) : (
                <>Kahiye Plus · unlimited decodes</>
              )}
            </p>
          )}

          {!current && !isAnalyzing && !error && (
            <div className="mt-8">
              <p className="text-sm font-medium text-slate-500 tracking-wider uppercase mb-4">Common moments</p>
              <div className="flex flex-wrap gap-2">
                {examples.map((example) => (
                  <button
                    key={example}
                    onClick={() => setScenario(example)}
                    className="text-sm px-4 py-2.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors text-left"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div role="alert" className="mt-8 flex items-start gap-3 p-4 rounded-2xl bg-red-50 text-red-800 text-sm">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" /> {error}
            </div>
          )}

          {isAnalyzing && streamingSay && (
            <div className="mt-8 p-6 md:p-8 rounded-[2rem] bg-white border border-slate-200/60 shadow-sm" aria-live="polite">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-leaf" /> Say this
              </h3>
              <p className="text-2xl md:text-3xl font-heading text-slate-850 leading-snug">"{streamingSay}"</p>
              <p className="mt-4 flex items-center gap-2 text-sm text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" /> Writing the rest of the plan…
              </p>
            </div>
          )}

          {isAnalyzing && !streamingSay && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-clay/10 flex items-center justify-center animate-pulse">
                <Sparkles className="w-5 h-5 text-clay" />
              </div>
              <div>
                <p className="font-heading text-lg font-medium text-slate-850">Reading the moment…</p>
                <p className="text-sm text-slate-500">Considering {selectedChild?.name}'s age, temperament and history.</p>
              </div>
            </motion.div>
          )}

          {safety && <SafetyBanner notice={safety} onExpert={() => openExpert('safety', scenario.trim())} />}

          {analysis && current && !isAnalyzing && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8 space-y-8">
              {/* Say this — first, biggest */}
              <div className="p-6 md:p-8 rounded-[2rem] bg-white border border-slate-200/60 shadow-sm">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-leaf" /> Say this
                </h3>
                <p className="text-2xl md:text-3xl font-heading text-slate-850 leading-snug">"{analysis.sayThis}"</p>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Do this now</h3>
                <ol className="space-y-2">
                  {analysis.doThis.map((step, i) => (
                    <li key={i} className="flex gap-3 text-slate-700 leading-relaxed">
                      <span className="w-6 h-6 flex-shrink-0 rounded-full bg-clay/10 text-clay text-xs font-semibold flex items-center justify-center mt-0.5">{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 text-red-800">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm leading-relaxed"><span className="font-semibold block mb-1">Avoid</span>{analysis.avoid}</p>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-clay" /> What's going on
                </h3>
                <p className="text-lg text-slate-800 leading-relaxed">{analysis.interpretation}</p>
                <p className="mt-3 text-slate-500 leading-relaxed">{analysis.developmentalContext}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-clay/5 border border-clay/10 text-clay text-sm font-medium">
                    <Heart className="w-4 h-4" /> Needs: {analysis.emotionalNeed}
                  </span>
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-50 border border-slate-100 text-slate-600 text-sm font-medium">
                    <Shield className="w-4 h-4" /> Builds: {analysis.skillBeingBuilt}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Later, when calm
                </h3>
                <p className="text-slate-700 leading-relaxed">{analysis.afterwards}</p>
              </div>

              <OutcomeBar decode={current} onSelect={recordOutcome} />

              <button
                onClick={() => setSharing(current)}
                className="w-full flex items-center justify-center gap-2 h-12 rounded-full bg-[#25D366]/10 text-[#128C4B] font-medium hover:bg-[#25D366]/15 transition-colors"
              >
                <Share2 className="w-4 h-4" /> Send to grandparents or caregivers
              </button>

              <p className="text-xs text-slate-400 leading-relaxed">
                General guidance, not a diagnosis. If you're worried about your child's health or safety, talk to your pediatrician.
              </p>
            </motion.div>
          )}
        </div>

        {/* History */}
        <aside className="md:col-span-5">
          <h3 className="text-sm font-medium text-slate-500 tracking-wider uppercase mb-4">Recent decodes</h3>
          {history.length === 0 ? (
            <p className="text-sm text-slate-400 leading-relaxed">
              Your decodes for {selectedChild?.name} will appear here. Mark whether each one worked, and Kahiye learns what fits {selectedChild?.name}.
            </p>
          ) : (
            <div className="space-y-3">
              {history.map((d) => (
                <div key={d.id} className="p-5 rounded-[1.5rem] border border-slate-200/60 bg-white/60 shadow-sm">
                  <p className="text-sm text-slate-500 mb-2 line-clamp-2">{d.scenario}</p>
                  {d.analysis && <p className="font-heading text-lg text-slate-850 leading-snug mb-3">"{d.analysis.sayThis}"</p>}
                  {d.outcome ? (
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      d.outcome === 'worked' ? 'bg-clay/10 text-clay' : d.outcome === 'partly' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {OUTCOME_LABELS[d.outcome]}
                    </span>
                  ) : (
                    <OutcomeBar decode={d} onSelect={recordOutcome} compact />
                  )}
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
      {sharing && selectedChild && (
        <ShareSheet decode={sharing} childName={selectedChild.name} onClose={() => setSharing(null)} />
      )}
    </div>
  );
}

function SafetyBanner({ notice, onExpert }: { notice: SafetyNotice; onExpert: () => void }) {
  const urgent = notice.level === 'urgent';
  return (
    <div role="alert" className={`mt-8 p-6 rounded-[2rem] border ${urgent ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
      <p className={`font-semibold mb-4 leading-relaxed ${urgent ? 'text-red-900' : 'text-amber-900'}`}>{notice.message}</p>
      <div className="grid sm:grid-cols-2 gap-2">
        {notice.helplines.map((h) => (
          <a
            key={h.number}
            href={`tel:${h.number}`}
            className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300"
          >
            <Phone className={`w-4 h-4 ${urgent ? 'text-red-600' : 'text-amber-700'}`} />
            <span className="text-sm">
              <span className="font-semibold text-slate-850">{h.name} · {h.number}</span>
              <span className="block text-slate-500 text-xs">{h.note}</span>
            </span>
          </a>
        ))}
      </div>
      <button
        onClick={onExpert}
        className={`mt-3 w-full h-11 rounded-xl text-sm font-medium ${urgent ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-amber-600 text-white hover:bg-amber-700'}`}
      >
        Request a call from a child psychologist
      </button>
    </div>
  );
}

function OutcomeBar({ decode, onSelect, compact = false }: {
  decode: Decode;
  onSelect: (decode: Decode, outcome: DecodeOutcome) => void;
  compact?: boolean;
}) {
  const options: { value: DecodeOutcome; icon: typeof ThumbsUp }[] = [
    { value: 'worked', icon: ThumbsUp },
    { value: 'partly', icon: Minus },
    { value: 'did_not_work', icon: ThumbsDown },
  ];
  return (
    <div className={compact ? '' : 'pt-6 border-t border-slate-100'}>
      {!compact && <p className="text-sm font-medium text-slate-700 mb-3">Did it work? Your answer shapes the next suggestion.</p>}
      <div className="flex flex-wrap gap-2">
        {options.map(({ value, icon: Icon }) => {
          const selected = decode.outcome === value;
          return (
            <button
              key={value}
              onClick={() => onSelect(decode, value)}
              className={`flex items-center gap-1.5 rounded-full border transition-colors ${compact ? 'px-3 py-1 text-xs' : 'px-4 py-2 text-sm'} ${
                selected ? 'border-clay bg-clay/10 text-clay font-medium' : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <Icon className={compact ? 'w-3 h-3' : 'w-4 h-4'} /> {OUTCOME_LABELS[value]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
