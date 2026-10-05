import { useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Brain, Heart, Moon, Sun, Wind, Sparkles,
  TrendingUp, AlertTriangle, CheckCircle2,
} from 'lucide-react';

const burnoutSigns = [
  { label: 'Feeling emotionally drained', severity: 'common' },
  { label: 'Irritability with children', severity: 'common' },
  { label: 'Sleep problems', severity: 'common' },
  { label: 'Loss of patience', severity: 'common' },
  { label: 'Feeling inadequate', severity: 'moderate' },
  { label: 'Social withdrawal', severity: 'moderate' },
];

const copingStrategies = [
  { icon: Wind, title: '5-Minute Reset', desc: 'Step away, breathe deeply, reset before responding', color: 'bg-blue-50 text-blue-600' },
  { icon: Heart, title: 'Self-Compassion', desc: 'You are doing better than you think. Perfection is not the goal.', color: 'bg-rose-50 text-rose-600' },
  { icon: Moon, title: 'Sleep Hygiene', desc: 'Prioritize rest. Even 30 minutes earlier makes a difference.', color: 'bg-purple-50 text-purple-600' },
  { icon: Sun, title: 'Micro-Breaks', desc: 'Find 10 minutes daily just for you. Read, walk, breathe.', color: 'bg-amber-50 text-amber-600' },
];

export function WellbeingPage() {
  const { wellbeingEntries, addWellbeingEntry } = useAppStore();
  const [stressLevel, setStressLevel] = useState(5);
  const [sleepQuality, setSleepQuality] = useState(5);
  const [gratitude, setGratitude] = useState('');
  const [showCheckIn, setShowCheckIn] = useState(false);

  const handleSubmit = () => {
    addWellbeingEntry({
      id: Date.now().toString(),
      date: new Date().toISOString(),
      stressLevel,
      sleepQuality,
      supportNeeded: '',
      gratitudeNote: gratitude,
    });
    setShowCheckIn(false);
    setGratitude('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl text-slate-850">Parent Wellbeing</h1>
        <p className="text-slate-500">You can't pour from an empty cup. Take care of yourself.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Brain} label="Stress Level" value={`${stressLevel}/10`} color="bg-red-50 text-red-500" />
        <StatCard icon={Moon} label="Sleep Quality" value={`${sleepQuality}/10`} color="bg-purple-50 text-purple-600" />
        <StatCard icon={Heart} label="Check-ins" value={`${wellbeingEntries.length}`} color="bg-rose-50 text-rose-600" />
        <StatCard icon={TrendingUp} label="Trend" value="Improving" color="bg-clay/10 text-clay" />
      </div>

      {/* Daily Check-in */}
      <Card className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-clay" />
            <h2 className="font-heading font-semibold text-lg text-slate-850">Daily Check-in</h2>
          </div>
          <Button
            size="sm"
            className="bg-clay hover:bg-clay/90 text-white"
            onClick={() => setShowCheckIn(!showCheckIn)}
          >
            {showCheckIn ? 'Close' : 'Start'}
          </Button>
        </div>

        {showCheckIn && (
          <div className="space-y-4 animate-fade-in-up">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                How stressed do you feel today? ({stressLevel}/10)
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={stressLevel}
                onChange={(e) => setStressLevel(Number(e.target.value))}
                className="w-full accent"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>Calm</span>
                <span>Overwhelmed</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                How did you sleep? ({sleepQuality}/10)
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={sleepQuality}
                onChange={(e) => setSleepQuality(Number(e.target.value))}
                className="w-full accent"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>Poor</span>
                <span>Excellent</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                One thing you're grateful for today
              </label>
              <Textarea
                value={gratitude}
                onChange={(e) => setGratitude(e.target.value)}
                placeholder="I'm grateful for..."
                className="min-h-[60px] rounded-xl border-slate-200 bg-white/80 resize-none"
              />
            </div>

            <Button
              onClick={handleSubmit}
              className="w-full bg-clay hover:bg-clay/90 text-white"
            >
              Log Check-in
            </Button>
          </div>
        )}

        {!showCheckIn && wellbeingEntries.length > 0 && (
          <div className="space-y-2">
            {wellbeingEntries.slice(-3).map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/40">
                <CheckCircle2 className="w-5 h-5 text-clay flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-slate-600">{entry.gratitudeNote}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(entry.date).toLocaleDateString()} &middot; Stress: {entry.stressLevel}/10
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Burnout Awareness */}
        <Card className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h2 className="font-heading font-semibold text-lg text-slate-850">Burnout Awareness</h2>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Parental burnout is real and common. Recognizing the signs is the first step to recovery.
          </p>
          <div className="space-y-2">
            {burnoutSigns.map((sign, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/40">
                <div className={`w-2 h-2 rounded-full ${
                  sign.severity === 'common' ? 'bg-amber-400' : 'bg-orange-400'
                }`} />
                <span className="text-sm text-slate-700">{sign.label}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Coping Strategies */}
        <Card className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-5 h-5 text-rose-500" />
            <h2 className="font-heading font-semibold text-lg text-slate-850">Coping Strategies</h2>
          </div>
          <div className="space-y-3">
            {copingStrategies.map((strategy, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/40">
                <div className={`w-10 h-10 rounded-xl ${strategy.color} flex items-center justify-center flex-shrink-0`}>
                  <strategy.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{strategy.title}</p>
                  <p className="text-xs text-slate-500">{strategy.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Affirmation */}
      <Card className="glass-card p-6 bg-paper-deep text-center">
        <Heart className="w-8 h-8 text-clay mx-auto mb-3" />
        <p className="font-heading font-medium text-lg text-slate-800 mb-2">
          You are enough. You are doing enough.
        </p>
        <p className="text-sm text-slate-500">
          There is no perfect parent. There is only a parent who keeps showing up — 
          and that's exactly what you're doing.
        </p>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Brain; label: string; value: string; color: string }) {
  return (
    <Card className="glass-card p-4 text-center">
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mx-auto mb-2`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="font-heading font-bold text-xl text-slate-850">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </Card>
  );
}
