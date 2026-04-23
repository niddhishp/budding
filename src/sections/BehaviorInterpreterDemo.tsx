import { useRef, useLayoutEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Sparkles, Lightbulb, MessageSquareHeart, Brain } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const exampleScenarios = [
  "My 4-year-old refuses to go to bed and keeps asking for one more story.",
  "My 7-year-old gets frustrated and gives up when homework gets hard.",
  "My toddler throws tantrums whenever we leave the playground.",
];

interface AnalysisResult {
  stage: string;
  emotionalNeed: string;
  reframe: string;
  strategy: string;
}

const mockAnalysis: Record<string, AnalysisResult> = {
  bed: {
    stage: 'Early Childhood (3-6)',
    emotionalNeed: 'Autonomy & Connection',
    reframe: '"I see you want more time together. Let\'s plan an extra story tomorrow morning."',
    strategy: 'Offer structured choices: "Would you like the blue pajamas or the red ones?"',
  },
  homework: {
    stage: 'Middle Childhood (7-12)',
    emotionalNeed: 'Competence & Support',
    reframe: '"This feels hard right now. Let\'s break it into smaller pieces together."',
    strategy: 'Use the "Yet" technique: "You haven\'t figured it out... yet."',
  },
  tantrum: {
    stage: 'Early Childhood (2-4)',
    emotionalNeed: 'Emotional Regulation',
    reframe: '"You\'re upset because you were having fun. It\'s hard to stop when we\'re enjoying ourselves."',
    strategy: 'Give a 5-minute warning + visual timer. Validate feelings before transitioning.',
  },
  default: {
    stage: 'Developmental Stage Analysis',
    emotionalNeed: 'Understanding & Validation',
    reframe: '"I see you\'re having big feelings. Let\'s take a breath together."',
    strategy: 'Stay calm, validate emotions, offer comfort, then problem-solve together.',
  },
};

function analyzeScenario(scenario: string): AnalysisResult {
  const lower = scenario.toLowerCase();
  if (lower.includes('bed') || lower.includes('sleep') || lower.includes('story')) {
    return mockAnalysis.bed;
  }
  if (lower.includes('homework') || lower.includes('school') || lower.includes('frustrated')) {
    return mockAnalysis.homework;
  }
  if (lower.includes('tantrum') || lower.includes('playground') || lower.includes('leave')) {
    return mockAnalysis.tantrum;
  }
  return mockAnalysis.default;
}

export function BehaviorInterpreterDemo() {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scenario, setScenario] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const content = contentRef.current;

    if (!section || !content) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        content,
        { y: '8vh', opacity: 0 },
        {
          y: 0,
          opacity: 1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 75%',
            end: 'top 40%',
            scrub: 0.5,
          },
        }
      );
    }, section);

    return () => ctx.revert();
  }, []);

  const handleAnalyze = () => {
    if (!scenario.trim()) return;
    setAnalyzing(true);
    setResult(null);

    // Simulate AI analysis delay
    setTimeout(() => {
      const analysis = analyzeScenario(scenario);
      setResult(analysis);
      setAnalyzing(false);
    }, 1500);
  };

  const handleExample = (example: string) => {
    setScenario(example);
    setResult(null);
  };

  return (
    <section
      ref={sectionRef}
      className="relative w-full min-h-screen overflow-hidden bg-sage py-[10vh]"
      style={{ zIndex: 115 }}
    >
      {/* Radial glow */}
      <div className="absolute inset-0 glow-radial" />

      <div ref={contentRef} className="will-change-transform">
        {/* Header */}
        <div className="text-center mb-10 px-6">
          <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-accent mb-4">
            <Sparkles className="w-4 h-4" />
            Try It Now
          </span>
          <h2 className="font-heading font-bold text-section text-slate-850 mb-4">
            AI Behavior Interpreter
          </h2>
          <p className="text-base text-slate-550 max-w-lg mx-auto">
            Describe a challenging moment. Our AI will analyze the developmental context 
            and suggest psychologically-grounded responses.
          </p>
        </div>

        {/* Demo Container */}
        <div className="w-[min(85vw,900px)] mx-auto">
          <div className="glass-card rounded-[2.5rem] p-6 md:p-10">
            {/* Input Section */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-850 mb-3">
                Describe what happened:
              </label>
              <Textarea
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                placeholder="My child..."
                className="min-h-[120px] rounded-2xl border-slate-200 bg-white/80 text-slate-850 placeholder:text-slate-400 focus:border-accent focus:ring-accent/20 resize-none"
              />

              {/* Example Buttons */}
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="text-xs text-slate-550 mr-1">Try an example:</span>
                {exampleScenarios.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => handleExample(example)}
                    className="text-xs px-3 py-1.5 rounded-full bg-white/60 hover:bg-white text-slate-550 hover:text-slate-850 transition-colors"
                  >
                    {example.length > 40 ? example.slice(0, 40) + '...' : example}
                  </button>
                ))}
              </div>
            </div>

            {/* Analyze Button */}
            <Button
              onClick={handleAnalyze}
              disabled={!scenario.trim() || analyzing}
              className="w-full h-12 bg-accent hover:bg-accent/90 text-white rounded-xl text-sm font-medium transition-all hover:shadow-lg hover:shadow-accent/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {analyzing ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analyzing...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Analyze Behavior
                </span>
              )}
            </Button>

            {/* Results */}
            {result && (
              <div className="mt-8 pt-8 border-t border-slate-200/50 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-2 mb-6">
                  <Brain className="w-5 h-5 text-accent" />
                  <h3 className="font-heading font-semibold text-lg text-slate-850">
                    AI Analysis
                  </h3>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {/* Stage */}
                  <div className="p-5 rounded-2xl bg-white/60">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="w-4 h-4 text-amber-500" />
                      <span className="text-xs font-medium text-slate-550 uppercase tracking-wide">
                        Developmental Stage
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-850">{result.stage}</p>
                  </div>

                  {/* Emotional Need */}
                  <div className="p-5 rounded-2xl bg-white/60">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquareHeart className="w-4 h-4 text-rose-500" />
                      <span className="text-xs font-medium text-slate-550 uppercase tracking-wide">
                        Emotional Need
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-850">{result.emotionalNeed}</p>
                  </div>

                  {/* Reframe */}
                  <div className="md:col-span-2 p-5 rounded-2xl bg-accent/10 border border-accent/20">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquareHeart className="w-4 h-4 text-accent" />
                      <span className="text-xs font-medium text-accent uppercase tracking-wide">
                        Suggested Reframe
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-850 italic">{result.reframe}</p>
                  </div>

                  {/* Strategy */}
                  <div className="md:col-span-2 p-5 rounded-2xl bg-white/60">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-purple-500" />
                      <span className="text-xs font-medium text-slate-550 uppercase tracking-wide">
                        Practical Strategy
                      </span>
                    </div>
                    <p className="text-sm text-slate-850">{result.strategy}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
