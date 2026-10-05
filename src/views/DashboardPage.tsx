import type { ReactNode } from 'react';
import { useAppStore } from '@/stores/appStore';
import { stageInfo } from '@/data/developmentalData';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Brain, Heart, Quote, Flame, Sunrise } from 'lucide-react';
import type { Child } from '@/types';
import { WeekGuideCard } from '@/components/WeekGuideCard';

const SPRING_TRANSITION = { type: 'spring', stiffness: 100, damping: 20 } as const;

interface FeedItem {
  id: string;
  icon: ReactNode;
  title: string;
  content: string;
  microScript?: string;
  color: string;
}

// Cards are derived from the parent-reported temperament and the child's stage.
// Phase 1 replaces these templates with a daily generated feed.
function buildFeed(child: Child): FeedItem[] {
  const { temperament: t, name, age } = child;
  const stage = stageInfo[age.stage];

  if (age.stage === 'pregnancy') {
    // The week-by-week guide renders separately (WeekGuideCard); this is the reflection beneath it.
    return [
      {
        id: 'reflection', icon: <Quote className="w-6 h-6 text-slate-700" />, color: 'bg-slate-100 border-slate-200',
        title: 'For you, today',
        content: 'Your own rest and emotional steadiness are the first environment your child experiences. What would make today 10% easier for you?',
      },
    ];
  }

  const items: FeedItem[] = [];

  if (t.sensitivity >= 65) {
    items.push({
      id: 'sensitivity', icon: <Sunrise className="w-6 h-6 text-amber-500" />, color: 'bg-amber-50 border-amber-100',
      title: 'A deep feeler',
      content: `${name} takes in more than most children — sounds, tones, moods. Big reactions are often overload, not defiance. A quieter voice and fewer words go further than a firmer one.`,
    });
  } else {
    items.push({
      id: 'stage', icon: <Sunrise className="w-6 h-6 text-amber-500" />, color: 'bg-amber-50 border-amber-100',
      title: stage.focus,
      content: stage.description,
    });
  }

  items.push({
    id: 'theme', icon: <Brain className="w-6 h-6 text-sage" />, color: 'bg-sage/10 border-sage/20',
    title: `What ${age.label} is about`,
    content: `Right now ${name} is working on ${stage.keyThemes.slice(0, 3).join(', ').toLowerCase()}. Much of the friction you see is that work in progress.`,
  });

  if (t.flexibility <= 40 || t.emotionalIntensity >= 65) {
    items.push({
      id: 'flashpoint', icon: <Flame className="w-6 h-6 text-rose-500" />, color: 'bg-rose-50 border-rose-100',
      title: 'Likely flashpoint: transitions',
      content: `With ${t.flexibility <= 40 ? 'a need for predictability' : 'big emotional reactions'}, sudden switches (leaving, screens off, bedtime) are where things tend to break down. A countdown and a choice keep ${name} in control.`,
      microScript: age.years < 7
        ? 'Instead of: "We are leaving right now!"\nTry: "Two more minutes, then shoes. Do you want to hop to the door or march?"'
        : 'Instead of: "Turn it off now!"\nTry: "Ten minutes left. Do you want to finish this level or stop at a save point?"',
    });
  }

  items.push({
    id: 'ritual', icon: <Heart className="w-6 h-6 text-accent" />, color: 'bg-accent/10 border-accent/20',
    title: 'Tonight: Rose and Thorn',
    content: `At dinner, ask ${name} for their "rose" (best part of the day) and "thorn" (hardest part). It builds emotional vocabulary and makes bad moments speakable.`,
  });

  items.push({
    id: 'reflection', icon: <Quote className="w-6 h-6 text-slate-700" />, color: 'bg-slate-100 border-slate-200',
    title: 'For you',
    content: 'When was the last time you felt truly overwhelmed, and what did you wish someone had said to you? Your child likely needs that same grace today.',
  });

  return items;
}

export function DashboardPage() {
  const { selectedChildId, children, setPage } = useAppStore();
  const selectedChild = children.find((c) => c.id === selectedChildId);

  if (!selectedChild) return <div className="p-8 text-center text-slate-500">Select a child to view today's guidance</div>;

  const dailyFeed = buildFeed(selectedChild);
  const isPregnancy = selectedChild.age.stage === 'pregnancy';

  return (
    <div className="max-w-2xl mx-auto pt-8 md:pt-12 pb-32 px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING_TRANSITION}
        className="mb-10 text-center"
      >
        <p className="text-sm font-medium text-sage mb-4 tracking-widest uppercase">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <h1 className="font-heading text-4xl md:text-5xl text-slate-850 leading-[1.1] mb-4">
          Today with {selectedChild.name}
        </h1>
        <p className="text-slate-500 text-lg max-w-md mx-auto">
          Tuned to {selectedChild.name}'s age and temperament.
        </p>
      </motion.div>

      {!isPregnancy && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING_TRANSITION, delay: 0.05 }}
          onClick={() => setPage('ask-ai')}
          className="w-full mb-10 p-6 rounded-[2rem] bg-slate-850 text-left text-white flex items-center gap-4 shadow-lg hover:bg-slate-800 transition-colors"
        >
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-sage" />
          </div>
          <div className="flex-1">
            <p className="font-heading text-xl">Hard moment right now?</p>
            <p className="text-white/60 text-sm">Get the exact words to say in seconds.</p>
          </div>
          <ArrowRight className="w-5 h-5 text-white/60" />
        </motion.button>
      )}

      <div className="space-y-6 md:space-y-8">
        {isPregnancy && selectedChild.age.pregnancyWeek && <WeekGuideCard week={selectedChild.age.pregnancyWeek} />}
        {dailyFeed.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING_TRANSITION, delay: 0.1 + index * 0.08 }}
            className={`p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border ${item.color} relative overflow-hidden`}
          >
            <div className="flex items-start gap-4">
              <div className="mt-1 bg-white/50 backdrop-blur-sm p-3 rounded-full shadow-sm flex-shrink-0">
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-heading font-semibold text-xl text-slate-850 mb-3">{item.title}</h3>
                <p className="text-slate-700 leading-relaxed text-base md:text-lg">{item.content}</p>
                {item.microScript && (
                  <div className="mt-5 p-5 bg-white/60 rounded-2xl border border-white/40 shadow-sm">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Micro-script</h4>
                    <p className="text-slate-800 font-medium whitespace-pre-line leading-relaxed">{item.microScript}</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}

        <div className="text-center pt-6">
          <Sparkles className="w-6 h-6 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-400 text-sm">You are caught up for today.</p>
        </div>
      </div>
    </div>
  );
}
