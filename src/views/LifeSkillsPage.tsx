import { useState } from 'react';
import { lifeSkills } from '@/data/developmentalData';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  MessageSquare, DollarSign,
  Shield, Compass, CheckCircle2, Lock, Unlock,
} from 'lucide-react';

const categoryIcons: Record<string, typeof MessageSquare> = {
  'Communication': MessageSquare,
  'Financial Literacy': DollarSign,
  'Resilience': Shield,
  'Independence': Compass,
  'Responsibility': CheckCircle2,
};

const categoryColors: Record<string, string> = {
  'Communication': 'bg-blue-50 text-blue-600',
  'Financial Literacy': 'bg-green-50 text-green-600',
  'Resilience': 'bg-amber-50 text-amber-600',
  'Independence': 'bg-purple-50 text-purple-600',
  'Responsibility': 'bg-teal-50 text-teal-600',
};

export function LifeSkillsPage() {
  const [selectedSkill, setSelectedSkill] = useState(lifeSkills[0]);
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean[]>>({});

  const toggleStep = (skillId: string, stepIndex: number) => {
    setCompletedSteps((prev) => {
      const current = prev[skillId] || [];
      const updated = [...current];
      updated[stepIndex] = !updated[stepIndex];
      return { ...prev, [skillId]: updated };
    });
  };

  const Icon = categoryIcons[selectedSkill.category] || MessageSquare;
  const colorClass = categoryColors[selectedSkill.category] || 'bg-slate-50 text-slate-600';
  const stepsCompleted = (completedSteps[selectedSkill.id] || []).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl text-slate-850">Life Skills Studio</h1>
        <p className="text-slate-500">Age-appropriate curriculum from 3 to 18 years</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Skills List */}
        <div className="lg:col-span-1 space-y-3">
          {lifeSkills.map((skill) => {
            const SkillIcon = categoryIcons[skill.category] || MessageSquare;
            const skillColor = categoryColors[skill.category] || 'bg-slate-50 text-slate-600';
            const isSelected = selectedSkill.id === skill.id;
            return (
              <button
                key={skill.id}
                onClick={() => setSelectedSkill(skill)}
                className={`w-full flex items-center gap-3 p-4 rounded-xl text-left transition-all ${
                  isSelected ? 'bg-sage/10 ring-2 ring-sage' : 'glass-card hover-lift'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl ${skillColor} flex items-center justify-center flex-shrink-0`}>
                  <SkillIcon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${isSelected ? 'text-sage' : 'text-slate-800'}`}>
                    {skill.title}
                  </p>
                  <p className="text-xs text-slate-400">{skill.ageRange}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-medium text-slate-500">{skill.progress}%</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Skill Detail */}
        <div className="lg:col-span-2">
          <Card className="glass-card p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className={`w-14 h-14 rounded-2xl ${colorClass} flex items-center justify-center`}>
                <Icon className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="font-heading font-bold text-xl text-slate-850">{selectedSkill.title}</h2>
                  <Badge variant="secondary" className={`${colorClass} border-0 text-[10px]`}>
                    {selectedSkill.category}
                  </Badge>
                </div>
                <p className="text-sm text-slate-500">{selectedSkill.ageRange}</p>
              </div>
            </div>

            <p className="text-slate-600 mb-6">{selectedSkill.description}</p>

            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-slate-800">Learning Steps</h3>
              <span className="text-sm text-slate-500">
                {stepsCompleted}/{selectedSkill.steps.length} completed
              </span>
            </div>

            <div className="space-y-2">
              {selectedSkill.steps.map((step, i) => {
                const isCompleted = completedSteps[selectedSkill.id]?.[i];
                return (
                  <button
                    key={i}
                    onClick={() => toggleStep(selectedSkill.id, i)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                      isCompleted ? 'bg-sage/10' : 'bg-white/40 hover:bg-white/60'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isCompleted ? 'bg-sage' : 'bg-slate-200'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      ) : (
                        <Lock className="w-3 h-3 text-slate-400" />
                      )}
                    </div>
                    <span className={`text-sm ${isCompleted ? 'text-sage font-medium' : 'text-slate-700'}`}>
                      {step}
                    </span>
                    {isCompleted && <Unlock className="w-4 h-4 text-sage ml-auto" />}
                  </button>
                );
              })}
            </div>

            <Progress
              value={((completedSteps[selectedSkill.id] || []).filter(Boolean).length / selectedSkill.steps.length) * 100}
              className="h-2 mt-4"
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
