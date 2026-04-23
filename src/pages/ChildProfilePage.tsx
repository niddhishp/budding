import { useAppStore } from '@/stores/appStore';
import { milestones as allMilestones, stageInfo } from '@/data/developmentalData';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Star, CheckCircle2, Circle, Target, Sparkles } from 'lucide-react';

const SPRING_TRANSITION = { type: 'spring', stiffness: 100, damping: 20 };

export function ChildProfilePage() {
  const { selectedChildId, children } = useAppStore();
  const child = children.find((c) => c.id === selectedChildId);
  
  if (!child) return <div className="p-8 text-center text-slate-500">Select a child</div>;

  const stage = stageInfo[child.age.stage];
  const childMilestones = allMilestones.filter((m) => m.stage === child.age.stage);
  const completedCount = childMilestones.filter((m) => m.completed).length;

  return (
    <div className="max-w-4xl mx-auto pt-12 pb-24 px-4 sm:px-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING_TRANSITION}
        className="mb-16 text-center"
      >
        <div className="w-24 h-24 mx-auto rounded-full bg-sage/10 flex items-center justify-center mb-6">
          <span className="font-heading text-4xl text-sage">{child.name.charAt(0)}</span>
        </div>
        <h1 className="font-heading text-4xl md:text-5xl text-slate-850 leading-tight mb-3">
          {child.name}'s Journey
        </h1>
        <p className="text-slate-500 uppercase tracking-widest text-sm font-medium">
          {child.age.years} years, {child.age.months} months &middot; {stage?.title}
        </p>
      </motion.div>

      <div className="grid md:grid-cols-12 gap-12">
        {/* Left Column - The Memory Timeline */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING_TRANSITION, delay: 0.1 }}
          className="md:col-span-8"
        >
          <div className="relative border-l border-slate-200/60 ml-4 md:ml-6 space-y-12 pb-12">
            
            <div className="relative pl-8 md:pl-12">
              <div className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-canvas border-2 border-sage flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-sage" />
              </div>
              <p className="text-sm text-sage font-medium tracking-widest uppercase mb-2">Current Phase</p>
              <h2 className="text-2xl font-heading text-slate-850 mb-4">{stage?.title}</h2>
              <p className="text-slate-600 leading-relaxed mb-6">
                {stage?.description}
              </p>
              <div className="flex flex-wrap gap-2">
                {stage?.keyThemes.map((theme, i) => (
                  <Badge key={i} variant="secondary" className="bg-sage/10 text-sage border-0 font-medium px-3 py-1">
                    {theme}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="relative pl-8 md:pl-12">
              <div className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-canvas border border-slate-300 flex items-center justify-center">
                <Star className="w-3 h-3 text-slate-400" />
              </div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-heading text-slate-850">Active Milestones</h3>
                <span className="text-sm font-medium text-slate-400">{completedCount}/{childMilestones.length}</span>
              </div>
              
              <div className="space-y-4">
                {childMilestones.map((milestone) => (
                  <div
                    key={milestone.id}
                    className={`flex gap-4 p-5 rounded-[2rem] border transition-all ${
                      milestone.completed
                        ? 'bg-sage/5 border-sage/20'
                        : 'bg-white/50 border-slate-200/60 shadow-sm backdrop-blur-md'
                    }`}
                  >
                    <div className="mt-1">
                      {milestone.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-sage" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300" />
                      )}
                    </div>
                    <div>
                      <p className={`text-base mb-1 ${milestone.completed ? 'text-slate-850 font-medium' : 'text-slate-700'}`}>
                        {milestone.title}
                      </p>
                      <p className="text-xs text-slate-500 uppercase tracking-wider">{milestone.ageRange}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </motion.div>

        {/* Right Sidebar - Immutable Traits */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING_TRANSITION, delay: 0.2 }}
          className="md:col-span-4 space-y-6"
        >
          <div className="p-8 rounded-[2rem] border border-slate-200/60 bg-white/50 backdrop-blur-md shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-accent" />
              </div>
              <h3 className="font-semibold text-slate-850 text-lg">Temperament DNA</h3>
            </div>
            
            <div className="space-y-6">
              {Object.entries(child.temperament).map(([trait, value]) => (
                <div key={trait}>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700 capitalize">{trait.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span className="text-sm font-medium text-slate-400">{value}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-accent rounded-full opacity-80" 
                      style={{ width: `${value}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <div className="flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                <p className="text-sm text-slate-600 leading-relaxed">
                  {child.name}'s high 
                  <span className="font-medium text-slate-850"> {Object.entries(child.temperament).sort((a, b) => b[1] - a[1])[0][0].replace(/([A-Z])/g, ' $1').trim()} </span> 
                  means they process the world deeply. Honor this by giving them time to observe before engaging.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
