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
import Link from 'next/link';
import { useRequestScope } from '@/hooks/useRequestScope';
import { GuidanceTrust } from '@/components/GuidanceTrust';
import { CLARIFY_WINDOW_MS } from '@/lib/plans';
import type { AgentAnalysis, Child, Decode, DecodeOutcome, DecodeStreamEvent, HandbookFallback, ImmediateAnalysis, SafetyNotice } from '@/types';

const SPRING_TRANSITION = { type: 'spring', stiffness: 100, damping: 20 } as const;

const EXAMPLES: Record<Child['age']['stage'], string[]> = {
  pregnancy: ['I feel anxious about the birth and can\'t sleep', 'My partner and I disagree about how to raise the baby'],
  infancy: ['She cries every time I put her down', 'He bites when he gets frustrated', 'Won\'t sleep unless we rock him for an hour'],
  'early-childhood': ['Refuses to leave the park and screams', 'Says "I hate you" when I say no', 'Hits his little sister when she takes his toys'],
  'middle-childhood': ['Melts down over homework every evening', 'Lies about small things', 'Won\'t stop gaming when time is up'],
  teenage: ['Slammed the door and won\'t talk to me', 'Grades dropping and stays in their room', 'Wants to go to a party I\'m not comfortable with'],
};

const VOICE_LANGUAGES: Record<string, { code: string; label: string; name: string }> = {
  English: { code: 'en-IN', label: 'English', name: 'English' },
  Hindi: { code: 'hi-IN', label: 'हिन्दी', name: 'Hindi' },
  Marathi: { code: 'mr-IN', label: 'मराठी', name: 'Marathi' },
  Malayalam: { code: 'ml-IN', label: 'മലയാളം', name: 'Malayalam' },
  Tamil: { code: 'ta-IN', label: 'தமிழ்', name: 'Tamil' },
  Bengali: { code: 'bn-IN', label: 'বাংলা', name: 'Bengali' },
  Telugu: { code: 'te-IN', label: 'తెలుగు', name: 'Telugu' },
  Kannada: { code: 'kn-IN', label: 'ಕನ್ನಡ', name: 'Kannada' },
  Gujarati: { code: 'gu-IN', label: 'ગુજરાતી', name: 'Gujarati' },
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

export function AskAIPage({ initialScenario = "" }: { initialScenario?: string }) {
  const { selectedChildId, children, entitlement, setEntitlement, openPaywall, openExpert, openHandbook } = useAppStore();
  const selectedChild = children.find((c) => c.id === selectedChildId);

  const [scenario, setScenario] = useState(initialScenario);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [current, setCurrent] = useState<Decode | null>(null);
  // The checked immediate answer, shown while the checked explanation is still being prepared.
  const [first, setFirst] = useState<ImmediateAnalysis | null>(null);
  const [fallback, setFallback] = useState<{ message: string; card: HandbookFallback } | null>(null);
  const [continuation, setContinuation] = useState<Decode | null>(null);
  const scenarioInput = useRef<HTMLTextAreaElement>(null);
  const [safety, setSafety] = useState<SafetyNotice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scope = useRequestScope();
  const activeRequest = useRef<ReturnType<typeof scope.start> | null>(null);
  const receipt = useRef<{ key: string; id: string } | null>(null);
  const [progress, setProgress] = useState('Reading what you shared…');
  // Bring the words into view when a new answer arrives, so a parent on a phone does not have to hunt for them.
  const answerRef = useRef<HTMLDivElement>(null);
  const revealAnswer = useRef(false);
  useEffect(() => {
    if (!revealAnswer.current || (!first && (!current || isAnalyzing))) return;
    revealAnswer.current = false;
    const calm = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    answerRef.current?.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
  }, [current, first, isAnalyzing]);
  const [support, setSupport] = useState<string | null>(null);
  const [outcomes, setOutcomes] = useState<Record<string, { state: 'saving' | 'saved' | 'failed'; value: DecodeOutcome }>>({});
  const savingOutcomes = useRef(new Set<string>());
  const [sharing, setSharing] = useState<Decode | null>(null);
  const [history, setHistory] = useState<Decode[]>([]);
  const [historyOffset, setHistoryOffset] = useState<number | null>(null);
  const [historyBusy, setHistoryBusy] = useState(false);
  const historyVersion = useRef(0);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<Recognition | null>(null);
  const [voiceSupported, setVoiceSupported] = useState(false);

  useEffect(() => setVoiceSupported(!!createRecognition()), []);
  // Listen in the family's home language by default; one tap switches to English.
  const homeVoice = selectedChild?.homeLanguages.filter(l => l !== 'English').map(l => VOICE_LANGUAGES[l]).find(Boolean);
  const [voiceInEnglish, setVoiceInEnglish] = useState(false);
  const voice = !homeVoice || voiceInEnglish ? VOICE_LANGUAGES.English : homeVoice;

  const loadHistory = useCallback(async (offset = 0) => {
    if (!selectedChildId) return;
    const version = ++historyVersion.current; setHistoryBusy(true);
    const task = scope.start();
    const { data, error: historyError } = await getSupabase()
      .from('decodes')
      .select(DECODE_COLUMNS)
      .eq('child_id', selectedChildId)
      .is('analysis->conversation', null)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + 9)
      .returns<DecodeRow[]>();
    if (task.active() && version === historyVersion.current) {
      if (historyError) setError('Could not load saved guidance. Reload to retry.');
      else {
        const rows = (data ?? []).map(decodeFromRow);
        setHistory(old => offset ? [...old, ...rows.filter(d => !old.some(x => x.id === d.id))] : rows);
        setHistoryOffset(rows.length === 10 ? offset + 10 : null);
      }
    }
    task.finish();
    if (version === historyVersion.current) setHistoryBusy(false);
  }, [selectedChildId, scope]);

  useEffect(() => {
    setCurrent(null);
    setFirst(null);
    setFallback(null);
    setContinuation(null);
    setSafety(null);
    setError(null);
    loadHistory();
  }, [loadHistory]);

  useEffect(() => () => {
    const rec = recognitionRef.current;
    if (rec) { rec.onresult = null; rec.onend = null; rec.onerror = null; rec.stop(); }
  }, []);

  const toggleVoice = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const rec = createRecognition();
    if (!rec) return;
    rec.lang = voice.code;
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

  /** Run a decode. `refine` answers the previous decode's clarifying question (free, not counted). */
  const handleAnalyze = async (refine?: { decode: Decode; question: string; answer: string }) => {
    if (!selectedChild || activeRequest.current) return;
    const text = refine ? `${refine.decode.scenario}\n\n(${refine.question} ${refine.answer})` : scenario.trim();
    if (!text) return;
    recognitionRef.current?.stop();
    setIsAnalyzing(true);
    setProgress('Reading what you shared…');
    setCurrent(null);
    setFirst(null);
    setFallback(null);
    setSafety(null);
    setError(null);
    setSupport(null);
    let shownFirst = false;
    const task = scope.start();
    activeRequest.current = task;
    const requestKey = JSON.stringify({ childId: selectedChild.id, text, refines: refine?.decode.id, continues: refine ? undefined : continuation?.id });
    if (receipt.current?.key !== requestKey) receipt.current = { key: requestKey, id: crypto.randomUUID() };

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST', signal: task.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: receipt.current.id, childId: selectedChild.id, scenario: text, ...(refine ? { refines: refine.decode.id, answer: refine.answer } : { continues: continuation?.id }) }),
      });
      if (!task.active()) return;
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => null);
        if (!task.active()) return;
        if (body?.entitlement) setEntitlement(body.entitlement);
        if (body?.code === 'upgrade_required') openPaywall(body.error);
        setError(body?.error ?? 'Something went wrong. Please try again.');
        return;
      }

      let terminal = false;
      for await (const event of readNdjson<DecodeStreamEvent>(res.body)) {
        if (!task.active()) return;
        switch (event.type) {
          case 'status': setProgress(event.message); break;
          case 'support': setSupport(event.message); terminal = true; break;
          case 'safety':
            setSafety(event.safety);
            break;
          case 'delta': break; // Never display unvalidated legacy token events.
          case 'first':
            // Already checked on the server; bring it into view straight away.
            shownFirst = true;
            revealAnswer.current = true;
            setFirst(event.analysis);
            break;
          case 'fallback':
            terminal = true;
            setFallback({ message: event.message, card: event.card });
            break;
          case 'done':
            if (event.decode.childId !== selectedChild.id) throw new Error('Response child mismatch');
            terminal = true;
            // The immediate answer is already in view; do not jump the page again when the detail arrives.
            if (!shownFirst) revealAnswer.current = true;
            setCurrent(event.decode);
            setContinuation(null);
            setScenario('');
            setEntitlement(event.entitlement);
            setHistory((h) => [event.decode, ...h.filter(d => d.id !== event.decode.id)]);
            break;
          case 'error':
            terminal = true;
            if (event.code === 'upgrade_required') openPaywall(event.error);
            setError(event.error);
            break;
        }
      }
      if (!terminal) throw new Error('Incomplete response');
    } catch {
      if (activeRequest.current === task) setError('The request stopped before completion. Retry the same moment to recover a saved result.');
    } finally {
      task.finish();
      if (activeRequest.current === task) { activeRequest.current = null; setIsAnalyzing(false); }
    }
  };

  const recordOutcome = async (decode: Decode, outcome: DecodeOutcome) => {
    if (savingOutcomes.current.has(decode.id)) return;
    savingOutcomes.current.add(decode.id);
    setOutcomes(s => ({ ...s, [decode.id]: { state: 'saving', value: outcome } }));
    const task = scope.start(15_000);
    try {
      const res = await fetch(`/api/decodes/${decode.id}/outcome`, { method: 'POST', signal: task.signal,
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ outcome }) });
      if (!res.ok) throw new Error('Save failed');
      if (!task.active()) return;
      const update = (d: Decode) => d.id === decode.id ? { ...d, outcome } : d;
      setCurrent(c => c ? update(c) : c); setHistory(h => h.map(update));
      setOutcomes(s => ({ ...s, [decode.id]: { state: 'saved', value: outcome } }));
    } catch { setOutcomes(s => ({ ...s, [decode.id]: { state: 'failed', value: outcome } })); }
    finally { task.finish(); savingOutcomes.current.delete(decode.id); }
  };

  // A saved answer once 'done' arrives; until then, the checked immediate answer alone.
  const saved = current && !isAnalyzing ? current : null;
  const analysis: (ImmediateAnalysis & Partial<AgentAnalysis>) | null = saved?.analysis ?? first;
  const examples = selectedChild ? EXAMPLES[selectedChild.age.stage] : [];
  const openSaved = (decode: Decode, continueIt = false) => {
    recognitionRef.current?.stop();
    setCurrent(continueIt ? null : decode); setContinuation(continueIt ? decode : null);
    setFirst(null); setFallback(null);
    setScenario(''); setError(null); setSafety(null); setSupport(null);
    if (!continueIt) { revealAnswer.current = true; return; }
    scenarioInput.current?.focus();
    scenarioInput.current?.scrollIntoView({ behavior: 'auto', block: 'center' });
  };

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
          Describe the moment. You'll get the exact words to say, shaped around {selectedChild?.name}'s age and what you share.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-12 gap-10 md:gap-12">
        <div className="md:col-span-7">
          {continuation && <div className="mb-4 rounded-2xl bg-paper-deep p-4" role="status">
            <p className="text-sm font-semibold text-slate-800">Continuing an earlier situation</p>
            <p className="text-sm text-slate-600 mt-2 line-clamp-3">{continuation.scenario}</p>
            <p className="text-xs text-slate-500 mt-2">Share what happened next. Up to four earlier moments in this thread are included. A new response uses your usual allowance.</p>
            <button disabled={isAnalyzing} className="text-sm text-clay underline py-2" onClick={() => setContinuation(null)}>Start fresh instead</button>
          </div>}
          <div className="relative">
            <Textarea
              ref={scenarioInput}
              aria-label="Describe what is happening"
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAnalyze();
              }}
              maxLength={2000}
              placeholder={continuation ? 'What happened next? What helped, or what has changed?' : `e.g., ${examples[0] ?? 'What happened, and what did you try?'}`}
              className="w-full min-h-[140px] px-5 pt-4 pb-16 rounded-[2rem] border-slate-200 bg-white text-slate-800 text-lg placeholder:text-slate-500 focus:border-clay focus:ring-clay/20 resize-none shadow-sm"
            />
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
              {voiceSupported ? (<span className="flex items-center">
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
                {homeVoice && !listening && <button type="button" onClick={() => setVoiceInEnglish(v => !v)} aria-label={`Speak in ${voiceInEnglish ? homeVoice.name : 'English'} instead`} className="ml-1 h-10 px-3 rounded-full text-sm text-slate-600 hover:bg-slate-100">{voice.label}</button>}
              </span>) : <span />}
              <Button
                onClick={() => handleAnalyze()}
                disabled={!scenario.trim() || isAnalyzing}
                className="bg-slate-850 hover:bg-slate-800 text-white rounded-full px-6 h-10 disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Thinking</span>
                ) : (
                  <span className="flex items-center gap-2">Find the words <Send className="w-4 h-4" /></span>
                )}
              </Button>
            </div>
          </div>

          {entitlement?.plan === 'free' && entitlement.limit - entitlement.used <= 1 && (
            <p className="mt-3 text-sm text-slate-600">
              {entitlement.limit - entitlement.used <= 0 ? 'No free Ask turns left this week. Saved guidance and immediate support stay open.' : 'This is your last free Ask turn this week.'}{' '}
              <button onClick={() => openPaywall()} className="text-clay underline py-2">See Plus</button>
            </p>
          )}

          {!current && !first && !fallback && !continuation && !isAnalyzing && !error && (
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

          {isAnalyzing && !first && <div className="mt-8" role="status"><p className="text-slate-700">{progress}</p><button className="mt-3 underline text-clay" onClick={() => { scope.cancel(); activeRequest.current = null; setIsAnalyzing(false); setError('Stopped. Your moment is still here; retry to recover any saved result.'); }}>Stop</button></div>}
          {support && <div role="status" className="mt-6 p-5 rounded-2xl bg-paper-deep"><p>{support}</p><Link href="/help-now" className="inline-block mt-3 text-clay underline">Immediate support</Link></div>}
          {safety && <SafetyBanner notice={safety} onExpert={() => openExpert('safety', scenario.trim())} />}

          {fallback && !isAnalyzing && <HandbookStart fallback={fallback} onOpen={() => openHandbook(fallback.card.id)} />}

          {analysis && (
            <motion.div ref={answerRef} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8 space-y-8 scroll-mt-6">
              {/* 1. Right now + Say this — first, biggest */}
              <div className="space-y-4">
                {analysis.rightNow && <RightNow text={analysis.rightNow} />}
                <div className="p-6 md:p-8 rounded-[2rem] bg-white border border-slate-200/60 shadow-sm">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-leaf" /> Say this
                  </h3>
                  <p className="text-2xl md:text-3xl font-heading text-slate-850 leading-snug">"{analysis.sayThis}"</p>
                  <p className="mt-3 text-xs text-slate-500">An example, not magic words. Say it your way.</p>
                </div>
                {saved?.safetyCategory === 'none' && <button
                  onClick={() => setSharing(saved)}
                  className="w-full flex items-center justify-center gap-2 h-12 rounded-full bg-[#25D366]/10 text-[#128C4B] font-medium hover:bg-[#25D366]/15 transition-colors"
                >
                  <Share2 className="w-4 h-4" /> Send the same words to grandparents or caregivers
                </button>}
              </div>

              {saved && analysis.clarify && !saved.refines && Date.now() - new Date(saved.createdAt).getTime() < CLARIFY_WINDOW_MS && (
                <div className="p-5 rounded-[1.5rem] bg-paper-deep">
                  <p className="font-medium text-slate-800 mb-3">{analysis.clarify.question}</p>
                  <div className="flex flex-wrap gap-2">
                    {analysis.clarify.options.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => handleAnalyze({ decode: saved, question: analysis.clarify!.question, answer: opt })}
                        className="px-4 py-2 rounded-full bg-surface border border-slate-200 text-sm text-slate-700 hover:border-clay"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">This quick follow-up is available for 30 minutes and doesn’t use your allowance.</p>
                </div>
              )}

              {/* 2. Do this now + Leave out */}
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
                <p className="mt-4 p-4 rounded-2xl bg-paper-deep text-sm leading-relaxed text-slate-800"><span className="font-semibold block mb-1">Leave out</span>{analysis.avoid}</p>
              </div>

              {/* Safety-relevant, so never folded away. */}
              {saved && analysis.seekHelpIf && (
                <div className="p-4 rounded-2xl bg-amber-50">
                  <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider mb-1.5">Talk to a professional if</p>
                  <p className="text-sm text-amber-900 leading-relaxed">{analysis.seekHelpIf}</p>
                </div>
              )}

              {/* 3. Understand why — one collapsed block */}
              {!saved && isAnalyzing && (
                <p role="status" className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Adding the why…</p>
              )}
              {!saved && !isAnalyzing && <p className="text-sm text-slate-500">This answer was not saved. Retry the same moment to recover it.</p>}
              {saved && analysis.detailUnavailable && <p className="text-sm text-slate-500">More detail isn&apos;t available for this one.</p>}
              {saved && !analysis.detailUnavailable && <UnderstandWhy analysis={analysis} />}

              {/* 4. Did it work, continue, and the saved moment */}
              {saved && <>
                <OutcomeBar decode={saved} onSelect={recordOutcome} saving={outcomes[saved.id]?.state === 'saving'} />
                {saved.safetyCategory === 'none' && <button className="w-full rounded-full border border-clay text-clay py-3 font-medium" onClick={() => openSaved(saved, true)}>Continue this situation</button>}
                {outcomes[saved.id] && <p role="status" className="text-sm">{outcomes[saved.id].state === 'saving' ? 'Saving feedback…' : outcomes[saved.id].state === 'saved' ? 'Feedback saved.' : 'Feedback was not saved. Tap your choice to retry.'}</p>}
                <details className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
                  <summary className="cursor-pointer py-1">Your moment · {saved.continuationOf ? 'continued' : 'saved'} {new Date(saved.createdAt).toLocaleDateString()}</summary>
                  <p className="mt-2 whitespace-pre-wrap break-words">{saved.scenario}</p>
                </details>
              </>}

              <p className="text-xs text-slate-500 leading-relaxed">
                General guidance, not a diagnosis. Worried about health or safety? Talk to your paediatrician.
              </p>
              <GuidanceTrust />
            </motion.div>
          )}

          {entitlement && (
            <p className="mt-8 text-xs text-slate-500">
              {entitlement.plan === 'free' ? (
                <>
                  {Math.max(0, entitlement.limit - entitlement.used)} of {entitlement.limit} free Ask turns left this week ·{' '}
                  <button onClick={() => openPaywall()} className="text-clay underline py-2">See Plus</button>
                </>
              ) : (
                <>Kahiye Plus · {entitlement.limit} Ask turns per rolling day</>
              )}
            </p>
          )}
        </div>

        {/* History */}
        <aside className="md:col-span-5">
          <h3 className="text-sm font-medium text-slate-500 tracking-wider uppercase mb-4">Your saved situations</h3>
          <p className="text-sm text-slate-500 mb-4">Open past guidance, or choose a situation to continue. Earlier moments are only included when you choose them.</p>
          {history.length === 0 ? (
            <p className="text-sm text-slate-400 leading-relaxed">
              Your guidance for {selectedChild?.name} will appear here. Your feedback can help shape future suggestions; it is not a score for your child.
            </p>
          ) : (
            <div className="space-y-3">
              {history.map((d) => (
                <div key={d.id} className="p-5 rounded-[1.5rem] border border-slate-200/60 bg-white/60 shadow-sm">
                  <p className="text-xs text-slate-500 mb-2">{new Date(d.createdAt).toLocaleDateString()}{d.continuationOf ? ' · Continued situation' : ''}</p>
                  <p className="text-sm text-slate-500 mb-2 line-clamp-2">{d.scenario}</p>
                  {d.analysis && <p className="font-heading text-lg text-slate-850 leading-snug mb-3">"{d.analysis.sayThis}"</p>}
                  {d.outcome ? (
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      d.outcome === 'worked' ? 'bg-clay/10 text-clay' : d.outcome === 'partly' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {OUTCOME_LABELS[d.outcome]}
                    </span>
                  ) : (
                    <><OutcomeBar decode={d} onSelect={recordOutcome} compact saving={outcomes[d.id]?.state === 'saving'} />{outcomes[d.id] && <p role="status" className="text-xs mt-2">{outcomes[d.id].state === 'saving' ? 'Saving…' : outcomes[d.id].state === 'failed' ? 'Not saved. Tap again to retry.' : 'Saved'}</p>}</>
                  )}
                  <div className="flex flex-wrap gap-2 mt-3"><button disabled={isAnalyzing} onClick={() => openSaved(d)} className="text-sm rounded-xl border border-slate-200 px-3 py-2.5 text-slate-700">Open saved guidance</button>{d.safetyCategory === 'none' && <button disabled={isAnalyzing} onClick={() => openSaved(d, true)} className="text-sm rounded-xl bg-clay/10 px-3 py-2.5 text-clay">Continue this situation</button>}</div>
                </div>
              ))}
            </div>
          )}
          {historyOffset !== null && <button disabled={historyBusy} onClick={() => loadHistory(historyOffset)} className="mt-4 px-4 py-2.5 rounded-xl border border-slate-200 text-sm">{historyBusy ? 'Loading…' : 'Load earlier situations'}</button>}
        </aside>
      </div>
      {sharing && selectedChild && (
        <ShareSheet key={sharing.id} decode={sharing} childName={selectedChild.name} onClose={() => setSharing(null)} />
      )}
    </div>
  );
}

function RightNow({ text }: { text: string }) {
  return (
    <div className="mt-8 flex items-start gap-3 p-5 rounded-[1.5rem] bg-slate-850 text-white" aria-live="polite">
      <span className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-turmeric whitespace-nowrap">Right now</span>
      <p className="text-lg leading-snug">{text}</p>
    </div>
  );
}

/** Everything that explains the answer, folded into one block so the words to say stay in front. */
function UnderstandWhy({ analysis }: { analysis: Partial<AgentAnalysis> }) {
  return (
    <details className="group rounded-2xl border border-slate-200 px-5 py-4">
      <summary className="cursor-pointer list-none flex items-center justify-between text-sm font-semibold text-slate-700">
        <span className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-clay" /> Understand why</span>
        {analysis.evidence?.[0] && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-leaf/10 text-leaf">{analysis.evidence[0].label}</span>
        )}
      </summary>
      <div className="mt-4 space-y-6">
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">What may be happening</h4>
          {analysis.hypotheses?.length ? (
            <ul className="space-y-3">
              {analysis.hypotheses.map((h, i) => (
                <li key={i} className="flex gap-3">
                  <span className={`mt-1 h-fit flex-shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${i === 0 ? 'bg-clay/10 text-clay' : 'bg-slate-100 text-slate-500'}`}>
                    {h.likelihood}
                  </span>
                  <span className={i === 0 ? 'text-slate-800 leading-relaxed' : 'text-slate-600 leading-relaxed'}>{h.text}</span>
                </li>
              ))}
            </ul>
          ) : analysis.interpretation ? (
            <p className="text-slate-800 leading-relaxed">{analysis.interpretation}</p>
          ) : null}
          {analysis.developmentalContext && <p className="mt-4 text-slate-500 leading-relaxed">{analysis.developmentalContext}</p>}
          {(analysis.emotionalNeed || analysis.skillBeingBuilt) && <div className="mt-4 flex flex-wrap gap-2">
            {analysis.emotionalNeed && <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-clay/5 border border-clay/10 text-clay text-sm font-medium">
              <Heart className="w-4 h-4" /> Needs: {analysis.emotionalNeed}
            </span>}
            {analysis.skillBeingBuilt && <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-50 border border-slate-100 text-slate-600 text-sm font-medium">
              <Shield className="w-4 h-4" /> Builds: {analysis.skillBeingBuilt}
            </span>}
          </div>}
        </div>
        {analysis.afterwards && <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2"><Clock className="w-4 h-4" /> Later, when calm</h4>
          <p className="text-slate-700 leading-relaxed">{analysis.afterwards}</p>
        </div>}
        {analysis.watchFor && <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Watch for</h4>
          <p className="text-sm text-slate-700 leading-relaxed">{analysis.watchFor}</p>
        </div>}
        {analysis.whyItWorks && <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Why this works</h4>
          <p className="text-sm text-slate-700 leading-relaxed">{analysis.whyItWorks}</p>
          {!!analysis.evidence?.length && (
            <ul className="mt-4 space-y-2.5">
              {analysis.evidence.map((e) => (
                <li key={e.id} className="text-sm leading-relaxed">
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 mr-2">{e.label}</span>
                  <span className="text-slate-600">{e.claim}</span>
                  <span className="block text-xs text-slate-500 mt-0.5">{e.source}</span>
                </li>
              ))}
            </ul>
          )}
        </div>}
      </div>
    </details>
  );
}

/** Shown when no custom answer could be checked: reviewed editorial words from the Handbook, not generated text. */
function HandbookStart({ fallback, onOpen }: { fallback: { message: string; card: HandbookFallback }; onOpen: () => void }) {
  const { message, card } = fallback;
  return (
    <div role="status" className="mt-8 p-6 rounded-[2rem] bg-paper-deep space-y-3">
      <p className="text-sm text-slate-700">{message}</p>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">From your Handbook · {card.title}</p>
      <p className="text-xl font-heading text-slate-850 leading-snug">"{card.words}"</p>
      <p className="text-sm text-slate-700 leading-relaxed">{card.activity}</p>
      <p className="text-sm text-slate-700 leading-relaxed"><span className="font-semibold">Leave out: </span>{card.avoid}</p>
      <button className="text-clay underline py-2" onClick={onOpen}>Open this in your Handbook</button>
      <p className="text-xs text-slate-500">This did not use your allowance.</p>
    </div>
  );
}

export function SafetyBanner({ notice, onExpert }: { notice: SafetyNotice; onExpert: () => void }) {
  // Tier 1 (parent distress) is support, not alarm.
  if (notice.tier === 1) {
    return (
      <div role="status" className="mt-8 p-5 rounded-[1.5rem] bg-leaf/10 border border-leaf/20">
        <p className="font-semibold text-slate-800 leading-relaxed">{notice.message}</p>
        {notice.steps.map((s) => <p key={s} className="mt-2 text-sm text-slate-700 leading-relaxed">{s}</p>)}
        {notice.helplines.map((h) => (
          <a key={h.number} href={`tel:${h.number}`} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-leaf">
            <Phone className="w-4 h-4" /> {h.name} · {h.number}
          </a>
        ))}
      </div>
    );
  }
  const urgent = notice.level === 'urgent';
  return (
    <div role="alert" className={`mt-8 p-6 rounded-[2rem] border ${urgent ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
      <p className={`font-semibold mb-4 leading-relaxed ${urgent ? 'text-red-900' : 'text-amber-900'}`}>{notice.message}</p>
      {notice.steps.length > 0 && (
        <ol className={`mb-5 space-y-2 text-[15px] leading-relaxed ${urgent ? 'text-red-950' : 'text-amber-950'}`}>
          {notice.steps.map((s, i) => (
            <li key={s} className="flex gap-3">
              <span className="font-semibold">{i + 1}.</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      )}
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
      {notice.category !== 'medical' && <button
        onClick={onExpert}
        className={`mt-3 w-full h-11 rounded-xl text-sm font-medium ${urgent ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-amber-600 text-white hover:bg-amber-700'}`}
      >
        Request a call from a child psychologist
      </button>}
    </div>
  );
}

function OutcomeBar({ decode, onSelect, compact = false, saving = false }: {
  decode: Decode;
  onSelect: (decode: Decode, outcome: DecodeOutcome) => void;
  compact?: boolean;
  saving?: boolean;
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
              disabled={saving}
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
