import { useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import { stageInfo, milestones } from '@/data/developmentalData';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Baby, Flower2, TreePine, Mountain, Heart,
  CheckCircle2, Circle, ChevronRight, Clock,
} from 'lucide-react';
import type { DevelopmentalStage } from '@/types';

const stageConfig: Record<DevelopmentalStage, { icon: typeof Baby; color: string; bg: string }> = {
  pregnancy: { icon: Heart, color: 'text-rose-600', bg: 'bg-rose-100' },
  infancy: { icon: Baby, color: 'text-blue-600', bg: 'bg-blue-100' },
  'early-childhood': { icon: Flower2, color: 'text-amber-600', bg: 'bg-amber-100' },
  'middle-childhood': { icon: TreePine, color: 'text-green-600', bg: 'bg-green-100' },
  teenage: { icon: Mountain, color: 'text-purple-600', bg: 'bg-purple-100' },
};

export function DevelopmentTimelinePage() {
  const { selectedChildId, children } = useAppStore();
  const child = children.find((c) => c.id === selectedChildId);
  const [activeStage, setActiveStage] = useState<DevelopmentalStage>(child?.age.stage || 'early-childhood');

  const stage = stageInfo[activeStage];
  const config = stageConfig[activeStage];
  const Icon = config.icon;
  const stageMilestones = milestones.filter((m) => m.stage === activeStage);
  const completedCount = stageMilestones.filter((m) => m.completed).length;
  const completionRate = stageMilestones.length > 0 ? Math.round((completedCount / stageMilestones.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl text-slate-850">Development Journey</h1>
        <p className="text-slate-500">Track milestones and understand each developmental stage</p>
      </div>

      {/* Stage Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {(Object.keys(stageInfo) as DevelopmentalStage[]).map((s) => {
          const cfg = stageConfig[s];
          const CfgIcon = cfg.icon;
          const isActive = s === activeStage;
          return (
            <button
              key={s}
              onClick={() => setActiveStage(s)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                isActive
                  ? `${cfg.bg} ${cfg.color}`
                  : 'bg-white/60 text-slate-500 hover:bg-white'
              }`}
            >
              <CfgIcon className="w-4 h-4" />
              {stageInfo[s].title}
            </button>
          );
        })}
      </div>

      {/* Stage Overview */}
      <Card className="glass-card p-6">
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-2xl ${config.bg} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-7 h-7 ${config.color}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="font-heading font-bold text-xl text-slate-850">{stage.title}</h2>
              <Badge variant="secondary" className={`${config.bg} ${config.color} border-0`}>
                {stage.ageRange}
              </Badge>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">{stage.description}</p>
            <div className="flex flex-wrap gap-2">
              {stage.keyThemes.map((theme, i) => (
                <Badge key={i} variant="secondary" className="bg-slate-100 text-slate-600 border-0">
                  {theme}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Milestones */}
        <Card className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-slate-850">Milestones</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">{completionRate}% complete</span>
              <Progress value={completionRate} className="w-20 h-1.5" />
            </div>
          </div>
          <div className="space-y-2">
            {stageMilestones.map((m) => (
              <button
                key={m.id}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                  m.completed ? 'bg-clay/10' : 'bg-white/40 hover:bg-white/60'
                }`}
              >
                {m.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-clay flex-shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-300 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className={`text-sm ${m.completed ? 'text-clay font-medium' : 'text-slate-700'}`}>
                    {m.title}
                  </p>
                </div>
                <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-500 border-0 flex-shrink-0">
                  {m.ageRange}
                </Badge>
              </button>
            ))}
          </div>
        </Card>

        {/* Parent Guidance */}
        <Card className="glass-card p-6">
          <h3 className="font-heading font-semibold text-slate-850 mb-4">Parent Guidance</h3>
          
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-blue-50/50">
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-2">What to Expect</p>
              <ul className="space-y-2">
                {stage.parentChallenges.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <ChevronRight className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-paper-deep">
              <p className="text-xs font-medium text-clay uppercase tracking-wide mb-2">Focus Areas</p>
              <div className="grid grid-cols-2 gap-2">
                {stage.keyThemes.slice(0, 4).map((theme, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-clay" />
                    <span className="text-sm text-slate-700">{theme}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/50">
              <p className="text-xs font-medium text-amber-600 uppercase tracking-wide mb-2">Kahiye Support</p>
              <p className="text-sm text-slate-600">
                Our AI provides daily insights, communication scripts, and emotional intelligence 
                exercises tailored to the {stage.title.toLowerCase()} stage. Check your dashboard 
                for today's personalized content.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
