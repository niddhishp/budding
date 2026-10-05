import { useState } from 'react';
import { eqExercises } from '@/data/developmentalData';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Heart, Brain, Users, Wind, CheckCircle2, Play, Clock,
  RotateCcw, Sparkles,
} from 'lucide-react';

const categories = [
  { id: 'all', label: 'All', icon: Sparkles },
  { id: 'self-awareness', label: 'Self-Awareness', icon: Brain },
  { id: 'empathy', label: 'Empathy', icon: Users },
  { id: 'regulation', label: 'Regulation', icon: Wind },
];

export function EmotionalLabPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeExercise, setActiveExercise] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Record<string, number>>({});

  const filtered = activeCategory === 'all'
    ? eqExercises
    : eqExercises.filter((e) => e.category === activeCategory);

  const handleStart = (id: string) => {
    setActiveExercise(id);
    setCompletedSteps((prev) => ({ ...prev, [id]: 0 }));
  };

  const handleStepComplete = (exerciseId: string, stepIndex: number) => {
    setCompletedSteps((prev) => ({
      ...prev,
      [exerciseId]: stepIndex + 1,
    }));
  };

  const activeEx = eqExercises.find((e) => e.id === activeExercise);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl text-slate-850">Emotional Intelligence Lab</h1>
        <p className="text-slate-500">Build EQ through guided exercises and family rituals</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Brain} label="Self-Awareness" value={65} color="bg-blue-50 text-blue-600" />
        <StatCard icon={Users} label="Empathy" value={58} color="bg-rose-50 text-rose-600" />
        <StatCard icon={Wind} label="Regulation" value={72} color="bg-purple-50 text-purple-600" />
      </div>

      {/* Category Filter */}
      <div className="flex gap-2">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeCategory === cat.id
                  ? 'bg-clay text-white'
                  : 'bg-white/60 text-slate-500 hover:bg-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Active Exercise */}
      {activeEx && (
        <Card className="glass-card p-6 bg-paper-deep border-clay/20">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-heading font-semibold text-lg text-slate-850">{activeEx.title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="bg-clay/10 text-clay border-0 text-[10px]">
                  {activeEx.category}
                </Badge>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {activeEx.duration} min
                </span>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setActiveExercise(null)}>
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>

          <p className="text-sm text-slate-600 mb-4">{activeEx.description}</p>

          <div className="space-y-2">
            {activeEx.steps.map((step, i) => {
              const isCompleted = (completedSteps[activeEx.id] || 0) > i;
              return (
                <button
                  key={i}
                  onClick={() => handleStepComplete(activeEx.id, i)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                    isCompleted ? 'bg-clay/10' : 'bg-white/60 hover:bg-white/80'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-clay flex-shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] text-slate-400">{i + 1}</span>
                    </div>
                  )}
                  <span className={`text-sm ${isCompleted ? 'text-clay font-medium' : 'text-slate-700'}`}>
                    {step}
                  </span>
                </button>
              );
            })}
          </div>

          <Progress
            value={((completedSteps[activeEx.id] || 0) / activeEx.steps.length) * 100}
            className="h-1.5 mt-4"
          />
        </Card>
      )}

      {/* Exercise Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {filtered.map((exercise) => {
          const isActive = activeExercise === exercise.id;
          const progress = ((completedSteps[exercise.id] || 0) / exercise.steps.length) * 100;
          
          return (
            <Card
              key={exercise.id}
              className={`glass-card p-5 hover-lift cursor-pointer transition-all ${isActive ? 'ring-2 ring-clay' : ''}`}
              onClick={() => !isActive && handleStart(exercise.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  exercise.category === 'self-awareness' ? 'bg-blue-50 text-blue-600' :
                  exercise.category === 'empathy' ? 'bg-rose-50 text-rose-600' :
                  exercise.category === 'regulation' ? 'bg-purple-50 text-purple-600' :
                  'bg-green-50 text-green-600'
                }`}>
                  {exercise.category === 'self-awareness' && <Brain className="w-5 h-5" />}
                  {exercise.category === 'empathy' && <Users className="w-5 h-5" />}
                  {exercise.category === 'regulation' && <Wind className="w-5 h-5" />}
                  {exercise.category === 'social-skills' && <Heart className="w-5 h-5" />}
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <Clock className="w-3 h-3" />
                  {exercise.duration}m
                </div>
              </div>
              <h3 className="font-medium text-slate-800 mb-1">{exercise.title}</h3>
              <p className="text-sm text-slate-500 mb-3 line-clamp-2">{exercise.description}</p>
              
              {progress > 0 && (
                <div className="flex items-center gap-2">
                  <Progress value={progress} className="h-1 flex-1" />
                  <span className="text-xs text-slate-500">{Math.round(progress)}%</span>
                </div>
              )}
              
              {progress === 0 && (
                <div className="flex items-center gap-1 text-clay text-sm">
                  <Play className="w-4 h-4" />
                  Start Exercise
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Brain; label: string; value: number; color: string }) {
  return (
    <Card className="glass-card p-4">
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-heading font-bold text-slate-850">{value}%</p>
      <p className="text-xs text-slate-500">{label}</p>
      <Progress value={value} className="h-1 mt-2" />
    </Card>
  );
}
