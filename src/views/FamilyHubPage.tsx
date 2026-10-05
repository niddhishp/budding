import { useAppStore } from '@/stores/appStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Users, Check, Flame, Calendar, Sun,
  MessageSquare, TreePine, Gamepad2, Heart,
} from 'lucide-react';

export function FamilyHubPage() {
  const { routines, toggleRoutine } = useAppStore();

  const dailyRoutines = routines.filter((r) => r.frequency === 'daily');
  const weeklyRoutines = routines.filter((r) => r.frequency === 'weekly');
  const completedToday = dailyRoutines.filter((r) => r.completed).length;
  const dailyProgress = dailyRoutines.length > 0 ? (completedToday / dailyRoutines.length) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl text-slate-850">Family Hub</h1>
        <p className="text-slate-500">Routines, rituals, and habits that strengthen connection</p>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Check} label="Today's Routines" value={`${completedToday}/${dailyRoutines.length}`} color="bg-sage-light text-sage" />
        <StatCard icon={Flame} label="Longest Streak" value="15 days" color="bg-amber-50 text-amber-600" />
        <StatCard icon={Calendar} label="This Week" value="12/14" color="bg-blue-50 text-blue-600" />
        <StatCard icon={Users} label="Family Score" value="87" color="bg-purple-50 text-purple-600" />
      </div>

      {/* Daily Progress */}
      <Card className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-semibold text-lg text-slate-850 flex items-center gap-2">
            <Sun className="w-5 h-5 text-amber-500" />
            Today's Progress
          </h2>
          <span className="text-sm text-slate-500">{Math.round(dailyProgress)}%</span>
        </div>
        <Progress value={dailyProgress} className="h-2 mb-4" />
        <div className="space-y-2">
          {dailyRoutines.map((routine) => (
            <button
              key={routine.id}
              onClick={() => toggleRoutine(routine.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                routine.completed ? 'bg-sage/10' : 'bg-white/40 hover:bg-white/60'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                routine.completed ? 'bg-sage' : 'border-2 border-slate-300'
              }`}>
                {routine.completed && <Check className="w-3.5 h-3.5 text-white" />}
              </div>
              <span className="text-lg">{routine.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${routine.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                  {routine.title}
                </p>
                <p className="text-xs text-slate-400">{routine.description}</p>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <Flame className="w-3 h-3" />
                {routine.streak}
              </div>
            </button>
          ))}
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Weekly Routines */}
        <Card className="glass-card p-6">
          <h2 className="font-heading font-semibold text-lg text-slate-850 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            Weekly Rituals
          </h2>
          <div className="space-y-2">
            {weeklyRoutines.map((routine) => (
              <button
                key={routine.id}
                onClick={() => toggleRoutine(routine.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                  routine.completed ? 'bg-sage/10' : 'bg-white/40 hover:bg-white/60'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                  routine.completed ? 'bg-sage' : 'border-2 border-slate-300'
                }`}>
                  {routine.completed && <Check className="w-3.5 h-3.5 text-white" />}
                </div>
                <span className="text-lg">{routine.emoji}</span>
                <div className="flex-1">
                  <p className={`text-sm ${routine.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                    {routine.title}
                  </p>
                  <p className="text-xs text-slate-400">{routine.description}</p>
                </div>
                <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-500 border-0">
                  Weekly
                </Badge>
              </button>
            ))}
          </div>
        </Card>

        {/* Suggested New Routines */}
        <Card className="glass-card p-6">
          <h2 className="font-heading font-semibold text-lg text-slate-850 mb-4 flex items-center gap-2">
            <TreePine className="w-5 h-5 text-green-500" />
            Suggested Rituals
          </h2>
          <div className="space-y-3">
            {[
              { emoji: '🌙', title: 'Gratitude Circle', desc: 'Share 3 things before bed', type: 'daily' },
              { emoji: '🎨', title: 'Creative Time', desc: '30 min of art together', type: 'weekly' },
              { emoji: '🚶', title: 'Nature Walk', desc: 'Explore outdoors weekly', type: 'weekly' },
              { emoji: '🎵', title: 'Family Playlist', desc: 'Share favorite songs', type: 'weekly' },
            ].map((ritual, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/40">
                <span className="text-2xl">{ritual.emoji}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700">{ritual.title}</p>
                  <p className="text-xs text-slate-400">{ritual.desc}</p>
                </div>
                <Button variant="outline" size="sm" className="text-xs border-sage text-sage hover:bg-sage-light">
                  Add
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Family Values */}
      <Card className="glass-card p-6">
        <h2 className="font-heading font-semibold text-lg text-slate-850 mb-4">Family Values</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: MessageSquare, label: 'Open Communication', color: 'bg-blue-50 text-blue-600' },
            { icon: Heart, label: 'Emotional Safety', color: 'bg-rose-50 text-rose-600' },
            { icon: Users, label: 'Respect & Kindness', color: 'bg-green-50 text-green-600' },
            { icon: Gamepad2, label: 'Play & Curiosity', color: 'bg-amber-50 text-amber-600' },
          ].map((value, i) => (
            <div key={i} className={`p-4 rounded-xl ${value.color} text-center`}>
              <value.icon className="w-6 h-6 mx-auto mb-2" />
              <p className="text-sm font-medium">{value.label}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Check; label: string; value: string; color: string }) {
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
