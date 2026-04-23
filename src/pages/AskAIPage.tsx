import { useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import { analyzeBehavior } from '@/lib/agentService';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import {
  Send, Sparkles, Brain, Heart, MessageSquare,
  AlertTriangle, Shield, BookOpen, Search
} from 'lucide-react';
import type { AgentAnalysis } from '@/types';

const SPRING_TRANSITION = { type: 'spring', stiffness: 100, damping: 20 };

const exampleScenarios = [
  "My 4-year-old refuses to go to bed and keeps asking for one more story",
  "My teen slammed the door and won't talk to me after I said no to a party",
  "My 5-year-old says 'I hate you' when I set boundaries",
];

export function AskAIPage() {
  const { selectedChildId, children, isAnalyzing, setIsAnalyzing } = useAppStore();
  const selectedChild = children.find((c) => c.id === selectedChildId);
  
  const [scenario, setScenario] = useState('');
  const [analysis, setAnalysis] = useState<AgentAnalysis | null>(null);
  const [saved, setSaved] = useState(false);

  const handleAnalyze = async () => {
    if (!scenario.trim() || !selectedChild) return;
    setIsAnalyzing(true);
    setAnalysis(null);
    setSaved(false);

    const result = await analyzeBehavior(
      scenario,
      `${selectedChild.age.years} years`,
      selectedChild.id
    );
    setAnalysis(result);
    setIsAnalyzing(false);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto pt-12 pb-24 px-4 sm:px-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING_TRANSITION}
        className="mb-16"
      >
        <div className="w-16 h-16 rounded-full bg-sage/10 flex items-center justify-center mb-6">
          <BookOpen className="w-6 h-6 text-sage" />
        </div>
        <h1 className="font-heading text-4xl md:text-5xl text-slate-850 leading-tight mb-4">
          The Library
        </h1>
        <p className="text-slate-500 text-lg max-w-xl">
          Search developmental milestones, decode behaviors, or ask for a personalized script.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-12 gap-12">
        {/* Left Column - Search & Ask AI */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING_TRANSITION, delay: 0.1 }}
          className="md:col-span-7"
        >
          <div className="relative">
            <div className="absolute top-4 left-4 text-slate-400">
              <Search className="w-5 h-5" />
            </div>
            <Textarea
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              placeholder={`Ask about ${selectedChild?.name || 'your child'}... (e.g., Why do they throw food when they're not hungry?)`}
              className="w-full min-h-[140px] pl-12 pr-4 pt-4 pb-16 rounded-[2rem] border-slate-200 bg-white/50 backdrop-blur-md text-slate-800 text-lg placeholder:text-slate-400 focus:border-sage focus:ring-sage/20 resize-none shadow-sm"
            />
            <div className="absolute bottom-3 right-3">
              <Button
                onClick={handleAnalyze}
                disabled={!scenario.trim() || isAnalyzing}
                className="bg-slate-850 hover:bg-slate-800 text-white rounded-full px-6 py-5 transition-transform hover:scale-[0.98] disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Consulting...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Ask <Send className="w-4 h-4 ml-1" />
                  </span>
                )}
              </Button>
            </div>
          </div>

          {!analysis && !isAnalyzing && (
            <div className="mt-8">
              <p className="text-sm font-medium text-slate-500 tracking-wider uppercase mb-4">Common Questions</p>
              <div className="flex flex-wrap gap-2">
                {exampleScenarios.map((example, i) => (
                  <button
                    key={i}
                    onClick={() => setScenario(example)}
                    className="text-sm px-4 py-2.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors text-left"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Analysis Loading State */}
          {isAnalyzing && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-8 space-y-6"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-sage/10 flex items-center justify-center animate-pulse">
                  <Brain className="w-5 h-5 text-sage" />
                </div>
                <div>
                  <p className="font-heading text-lg font-medium text-slate-850">Synthesizing Context...</p>
                  <p className="text-sm text-slate-500">Cross-referencing {selectedChild?.name}'s temperament with stage data.</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Analysis Results */}
          {analysis && !isAnalyzing && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-12 space-y-10"
            >
              {/* Insight */}
              <div>
                <h3 className="text-sm font-semibold text-slate-850 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-sage" />
                  The 'Why'
                </h3>
                <p className="text-lg text-slate-800 leading-relaxed font-medium">
                  {analysis.behaviorInterpretation}
                </p>
                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-sage/5 border border-sage/10 text-sage text-sm font-medium">
                  <Heart className="w-4 h-4" />
                  Core Need: {analysis.emotionalNeed}
                </div>
              </div>

              {/* Script */}
              <div className="border-l-2 border-slate-200 pl-6">
                <h3 className="text-sm font-semibold text-slate-850 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-accent" />
                  What to say
                </h3>
                <p className="text-2xl font-heading text-slate-850 italic mb-4">
                  "{analysis.suggestedReframe}"
                </p>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Shield className="w-4 h-4" />
                  Builds {analysis.skillBeingBuilt}
                </div>
              </div>

              {/* Plan */}
              <div>
                <h3 className="text-sm font-semibold text-slate-850 uppercase tracking-wider mb-4">
                  Action Plan
                </h3>
                <p className="text-slate-600 leading-relaxed mb-6">
                  {analysis.responsePlan}
                </p>
                
                <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 text-red-800">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm leading-relaxed">
                    <span className="font-semibold block mb-1">Avoid</span>
                    {analysis.whatNotToDo}
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex gap-4">
                <Button
                  onClick={handleSave}
                  className="bg-sage text-white rounded-full px-6 hover:bg-sage/90"
                >
                  {saved ? 'Saved to Child Profile' : 'Save Insight'}
                </Button>
                <Button
                  onClick={() => { setScenario(''); setAnalysis(null); }}
                  variant="outline"
                  className="rounded-full px-6"
                >
                  Clear
                </Button>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Right Sidebar - Library Collections */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING_TRANSITION, delay: 0.2 }}
          className="md:col-span-5 space-y-8"
        >
          <div>
            <h3 className="text-sm font-medium text-slate-500 tracking-wider uppercase mb-4">Saved Scripts</h3>
            <div className="space-y-3">
              <div className="p-5 rounded-[2rem] border border-slate-200/60 bg-white/50 backdrop-blur-md shadow-sm">
                <p className="text-sm text-slate-500 mb-2">When they say "I can't do it"</p>
                <p className="font-heading text-lg text-slate-850 italic mb-3">"You're right, it's hard right now. Let's take a break and try again in 5 minutes."</p>
                <Badge variant="secondary" className="bg-sage/10 text-sage border-0">Growth Mindset</Badge>
              </div>
              <div className="p-5 rounded-[2rem] border border-slate-200/60 bg-white/50 backdrop-blur-md shadow-sm">
                <p className="text-sm text-slate-500 mb-2">Transition warning</p>
                <p className="font-heading text-lg text-slate-850 italic mb-3">"Two more slides, and then we're going to the car. Which slide first?"</p>
                <Badge variant="secondary" className="bg-accent/10 text-accent border-0">Autonomy</Badge>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-slate-500 tracking-wider uppercase mb-4">Recent Topics</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="rounded-full px-4 py-1.5 text-sm font-normal text-slate-600 border-slate-200">Sleep Regression</Badge>
              <Badge variant="outline" className="rounded-full px-4 py-1.5 text-sm font-normal text-slate-600 border-slate-200">Picky Eating</Badge>
              <Badge variant="outline" className="rounded-full px-4 py-1.5 text-sm font-normal text-slate-600 border-slate-200">Separation Anxiety</Badge>
              <Badge variant="outline" className="rounded-full px-4 py-1.5 text-sm font-normal text-slate-600 border-slate-200">Sibling Rivalry</Badge>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
