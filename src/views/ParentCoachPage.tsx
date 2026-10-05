import { useState } from 'react';
import { communicationScripts } from '@/data/developmentalData';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MessageCircleHeart, Copy, Check, RefreshCw, Lightbulb,
  AlertTriangle, ChevronRight, BookOpen,
} from 'lucide-react';

const situations = [
  'Child refuses to clean up',
  'Child says "I hate you"',
  'Teenager slams door',
  'Child crying after losing',
  'Baby won\'t stop crying',
  'Sibling fighting',
  'Homework refusal',
  'Bedtime battles',
];

export function ParentCoachPage() {
  const [selectedScript, setSelectedScript] = useState(communicationScripts[0]);
  const [copied, setCopied] = useState(false);
  const [selectedSituation, setSelectedSituation] = useState(situations[0]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefresh = () => {
    const random = communicationScripts[Math.floor(Math.random() * communicationScripts.length)];
    setSelectedScript(random);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl text-slate-850">Parent Communication Coach</h1>
        <p className="text-slate-500">Transform your words. Build trust and emotional safety.</p>
      </div>

      {/* Situation Selector */}
      <div className="flex flex-wrap gap-2">
        {situations.map((sit) => (
          <button
            key={sit}
            onClick={() => setSelectedSituation(sit)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              selectedSituation === sit
                ? 'bg-sage text-white'
                : 'bg-white/60 text-slate-600 hover:bg-white'
            }`}
          >
            {sit}
          </button>
        ))}
      </div>

      {/* Script of the Day */}
      <Card className="glass-card p-6 bg-sage-wash/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageCircleHeart className="w-5 h-5 text-sage" />
            <h3 className="font-heading font-semibold text-slate-850">Communication Reframe</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4 text-slate-400" />
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {/* Situation */}
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Situation</p>
            <p className="text-sm text-slate-700">{selectedScript.situation}</p>
            <Badge variant="secondary" className="mt-2 bg-slate-100 text-slate-500 border-0 text-[10px]">
              {selectedScript.context}
            </Badge>
          </div>

          {/* Avoid */}
          <div className="p-4 rounded-xl bg-red-50/50 border border-red-100">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <p className="text-xs font-medium text-red-500 uppercase tracking-wide">Instead of</p>
            </div>
            <p className="text-sm text-red-600 italic">"{selectedScript.avoidSaying}"</p>
          </div>

          {/* Say Instead */}
          <div className="p-4 rounded-xl bg-sage/10 border border-sage/20">
            <div className="flex items-center gap-2 mb-2">
              <MessageCircleHeart className="w-4 h-4 text-sage" />
              <p className="text-xs font-medium text-sage uppercase tracking-wide">Try saying</p>
            </div>
            <p className="text-sm text-slate-800 font-medium mb-3">"{selectedScript.sayInstead}"</p>
            <Button
              variant="outline"
              size="sm"
              className="text-sage border-sage hover:bg-sage-light"
              onClick={() => handleCopy(selectedScript.sayInstead)}
            >
              {copied ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
              {copied ? 'Copied!' : 'Copy Script'}
            </Button>
          </div>

          {/* Why */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50/30">
            <Lightbulb className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">Why this works</p>
              <p className="text-sm text-slate-600">{selectedScript.why}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* All Scripts */}
      <div>
        <h2 className="font-heading font-semibold text-lg text-slate-850 mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-sage" />
          Script Library
        </h2>
        <div className="space-y-3">
          {communicationScripts.map((script) => (
            <Card
              key={script.id}
              className="glass-card p-4 hover-lift cursor-pointer"
              onClick={() => setSelectedScript(script)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{script.situation}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{script.context}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
