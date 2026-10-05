import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { BookHeart, Loader2, Lock, Moon, Pause, Play, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/stores/appStore';
import { STORY_LANGUAGES } from '@/lib/plans';
import type { Child, Story } from '@/types';

const SPRING_TRANSITION = { type: 'spring', stiffness: 100, damping: 20 } as const;

const THEMES: Record<Child['age']['stage'], string[]> = {
  pregnancy: [],
  infancy: ['Saying goodnight to everything in the room', 'A new baby sibling', 'Being brave at the doctor'],
  'early-childhood': ['Starting a new school', 'Afraid of the dark', 'Sharing with a sibling', 'Big feelings that feel like a storm'],
  'middle-childhood': ['Making a new friend', 'Losing a game and trying again', 'Nervous before an exam', 'Telling the truth when it is hard'],
  teenage: ['Feeling different from everyone', 'Finding your own way', 'A friendship that changed'],
};

// BCP-47 tags for the device voice fallback.
const SPEECH_LANG: Record<string, string> = {
  English: 'en-IN', Hindi: 'hi-IN', Malayalam: 'ml-IN', Tamil: 'ta-IN', Marathi: 'mr-IN',
  Bengali: 'bn-IN', Telugu: 'te-IN', Kannada: 'kn-IN', Gujarati: 'gu-IN',
};

export function StoriesPage() {
  const { selectedChildId, children, entitlement, openPaywall } = useAppStore();
  const child = children.find((c) => c.id === selectedChildId);
  const isPlus = entitlement?.plan === 'plus';

  const [stories, setStories] = useState<Story[]>([]);
  const [current, setCurrent] = useState<Story | null>(null);
  const [theme, setTheme] = useState('');
  const [language, setLanguage] = useState<string>('English');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!selectedChildId) return;
    const res = await fetch(`/api/stories?childId=${selectedChildId}`);
    if (res.ok) setStories((await res.json()).stories);
  }, [selectedChildId]);

  useEffect(() => {
    setCurrent(null);
    load();
  }, [load]);

  if (!child) return null;
  if (child.age.stage === 'pregnancy') {
    return (
      <div className="max-w-xl mx-auto pt-16 px-6 text-center text-slate-500">
        <Moon className="w-8 h-8 mx-auto mb-4 text-indigo-400" />
        Bedtime stories begin once {child.name} arrives. Until then, the Today tab has your week-by-week guide.
      </div>
    );
  }

  const create = async () => {
    if (!theme.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId: child.id, theme: theme.trim(), language }),
      });
      const body = await res.json();
      if (res.status === 402) {
        openPaywall(body.error);
        return;
      }
      if (!res.ok) throw new Error(body.error);
      setCurrent(body.story);
      setStories((s) => [body.story, ...s]);
      setTheme('');
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Could not write the story. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const pickLanguage = (value: string) => {
    if (value !== 'English' && !isPlus) {
      openPaywall('Bedtime stories in the language of home.');
      return;
    }
    setLanguage(value);
  };

  if (current) {
    return <StoryReader story={current} onBack={() => setCurrent(null)} />;
  }

  return (
    <div className="max-w-3xl mx-auto pt-8 md:pt-12 pb-24 px-4 sm:px-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={SPRING_TRANSITION} className="mb-10">
        <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center mb-6">
          <Moon className="w-6 h-6 text-indigo-600" />
        </div>
        <h1 className="font-heading text-4xl md:text-5xl text-slate-850 leading-tight mb-3">Tonight's story</h1>
        <p className="text-slate-500 text-lg max-w-xl">
          {child.name} is the hero. Tell us what's on their mind, and the story helps them through it.
        </p>
      </motion.div>

      <div className="p-6 md:p-8 rounded-[2rem] bg-white border border-slate-200/60 shadow-sm">
        <label htmlFor="story-theme" className="block text-sm font-medium text-slate-700 mb-2">What should it help with?</label>
        <input
          id="story-theme"
          value={theme}
          maxLength={300}
          onChange={(e) => setTheme(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && create()}
          placeholder="e.g., Nervous about the first day at school"
          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {THEMES[child.age.stage].map((t) => (
            <button key={t} onClick={() => setTheme(t)} className="text-sm px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200">
              {t}
            </button>
          ))}
        </div>

        <p className="mt-6 mb-2 text-sm font-medium text-slate-700">Language</p>
        <div className="flex flex-wrap gap-2">
          {STORY_LANGUAGES.map((l) => {
            const locked = l !== 'English' && !isPlus;
            return (
              <button
                key={l}
                onClick={() => pickLanguage(l)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm border ${language === l ? 'border-indigo-400 bg-indigo-50 text-slate-850 font-medium' : 'border-slate-200 text-slate-600'}`}
              >
                {locked && <Lock className="w-3 h-3 text-slate-400" />} {l}
              </button>
            );
          })}
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <Button onClick={create} disabled={!theme.trim() || busy} className="mt-6 w-full h-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-lg">
          {busy ? <><Loader2 className="w-5 h-5 animate-spin" /> Writing {child.name}'s story…</> : <><Sparkles className="w-5 h-5" /> Write the story</>}
        </Button>
        {!isPlus && (
          <p className="mt-3 text-xs text-center text-slate-400">
            Your first story is free. <button onClick={() => openPaywall()} className="underline">Plus</button> gives you a new one every night, narrated, in 9 languages.
          </p>
        )}
      </div>

      {stories.length > 0 && (
        <div className="mt-12">
          <h2 className="text-sm font-medium text-slate-500 tracking-wider uppercase mb-4">{child.name}'s stories</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {stories.map((s) => (
              <button
                key={s.id}
                onClick={() => setCurrent(s)}
                className="text-left p-5 rounded-[1.5rem] border border-slate-200/60 bg-white/60 hover:bg-white shadow-sm"
              >
                <BookHeart className="w-5 h-5 text-indigo-500 mb-3" />
                <p className="font-heading text-lg text-slate-850 leading-snug">{s.title}</p>
                <p className="text-sm text-slate-500 mt-1 line-clamp-1">{s.theme} · {s.language}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StoryReader({ story, onBack }: { story: Story; onBack: () => void }) {
  const [playing, setPlaying] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => {
    audioRef.current?.pause();
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
  }, []);

  const speakOnDevice = () => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance([story.title, story.body, story.moral].filter(Boolean).join('. \n'));
    utterance.lang = SPEECH_LANG[story.language] ?? 'en-IN';
    utterance.rate = 0.85;
    utterance.onend = () => setPlaying(false);
    synth.speak(utterance);
    setPlaying(true);
  };

  const toggle = async () => {
    if (playing) {
      audioRef.current?.pause();
      window.speechSynthesis?.cancel();
      setPlaying(false);
      return;
    }
    if (audioRef.current) {
      await audioRef.current.play();
      setPlaying(true);
      return;
    }
    setLoadingAudio(true);
    try {
      const res = await fetch(`/api/stories/${story.id}/audio`, { method: 'POST' });
      const body = await res.json();
      if (body.url) {
        const audio = new Audio(body.url);
        audio.onended = () => setPlaying(false);
        audioRef.current = audio;
        await audio.play();
        setPlaying(true);
      } else {
        speakOnDevice();
      }
    } catch {
      speakOnDevice();
    } finally {
      setLoadingAudio(false);
    }
  };

  return (
    <div className="min-h-full bg-[#0F1222] text-[#EDEAF6] -mx-0 md:-m-6 md:rounded-none">
      <div className="max-w-2xl mx-auto px-6 pt-8 pb-32">
        <button onClick={onBack} className="text-sm text-white/50 hover:text-white mb-10">← All stories</button>
        <h1 className="font-heading text-4xl leading-tight mb-8">{story.title}</h1>
        <div className="space-y-5 text-xl leading-[1.8] font-heading">
          {story.body.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
        </div>
        {story.moral && <p className="mt-10 text-white/60 italic text-lg">{story.moral}</p>}
      </div>
      <div className="fixed bottom-24 md:bottom-8 inset-x-0 flex justify-center pointer-events-none">
        <button
          onClick={toggle}
          disabled={loadingAudio}
          className="pointer-events-auto flex items-center gap-2 h-14 px-7 rounded-full bg-white text-[#0F1222] font-medium shadow-2xl"
        >
          {loadingAudio ? <Loader2 className="w-5 h-5 animate-spin" /> : playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          {loadingAudio ? 'Preparing narration…' : playing ? 'Pause' : 'Read it to us'}
        </button>
      </div>
    </div>
  );
}
