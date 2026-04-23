import { useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Heart, Sparkles, ArrowRight, Activity, Shield } from 'lucide-react';
import type { Child } from '@/types';

export function GenomeOnboarding() {
  const { addChild, completeOnboarding } = useAppStore();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    dateOfBirth: '',
    temperament: {
      sensitivity: 50,
      intensity: 50,
      adaptability: 50
    }
  });

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
    else handleComplete();
  };

  const handleComplete = () => {
    const newChild: Child = {
      id: Math.random().toString(36).substring(7),
      name: formData.name,
      dateOfBirth: formData.dateOfBirth,
      age: { years: 3, months: 0, days: 0, stage: 'early-childhood' }, // Simplified for MVP
      temperament: {
        curiosity: 50,
        persistence: 50,
        sociability: 50,
        flexibility: 50,
        sensitivity: formData.temperament.sensitivity,
        emotionalIntensity: formData.temperament.intensity,
        // adaptability is mapped from flexibility/etc in full model, but we keep it simple here
      },
      milestones: [],
      emotionalPatterns: [],
      behaviorLogs: [],
    };
    addChild(newChild);
    completeOnboarding();
  };

  return (
    <div className="fixed inset-0 z-50 bg-canvas/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden border border-slate-200/50"
      >
        <div className="p-12">
          <div className="flex justify-between items-center mb-12">
            <div className="flex gap-2">
              {[1, 2, 3].map((i) => (
                <div 
                  key={i} 
                  className={`h-2 rounded-full transition-all duration-500 ${step >= i ? 'w-12 bg-sage' : 'w-4 bg-slate-200'}`} 
                />
              ))}
            </div>
            <div className="font-heading font-bold text-xl text-slate-850">Budding.</div>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="mb-8 inline-flex items-center justify-center w-16 h-16 rounded-full bg-sage/10 text-sage">
                  <Heart className="w-8 h-8" />
                </div>
                <h2 className="font-heading text-4xl text-slate-850 mb-4">Let's meet your child.</h2>
                <p className="text-lg text-slate-500 mb-8 leading-relaxed">
                  Every child's nervous system is unique. We'll start with the basics to build their personalized intelligence timeline.
                </p>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">First Name</label>
                    <input 
                      type="text" 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-sage/50 transition-all"
                      placeholder="e.g., Leo"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Date of Birth</label>
                    <input 
                      type="date" 
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-sage/50 transition-all"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="mb-8 inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/10 text-accent">
                  <Brain className="w-8 h-8" />
                </div>
                <h2 className="font-heading text-4xl text-slate-850 mb-4">Temperament DNA.</h2>
                <p className="text-lg text-slate-500 mb-8 leading-relaxed">
                  How does {formData.name || 'your child'} process the world? There are no wrong answers. This helps our AI predict triggers and tailor communication.
                </p>
                
                <div className="space-y-10">
                  {/* Slider 1: Sensitivity */}
                  <div>
                    <div className="flex justify-between mb-4">
                      <div>
                        <h4 className="font-medium text-slate-850">Sensory & Emotional Sensitivity</h4>
                        <p className="text-sm text-slate-500">How deeply do they feel and notice things?</p>
                      </div>
                      <span className="text-sage font-medium">{formData.temperament.sensitivity}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="100" 
                      value={formData.temperament.sensitivity}
                      onChange={(e) => setFormData({...formData, temperament: {...formData.temperament, sensitivity: parseInt(e.target.value)}})}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sage"
                    />
                    <div className="flex justify-between text-xs font-medium text-slate-400 mt-2 uppercase tracking-wider">
                      <span>Easygoing</span>
                      <span>Highly Sensitive</span>
                    </div>
                  </div>

                  {/* Slider 2: Intensity */}
                  <div>
                    <div className="flex justify-between mb-4">
                      <div>
                        <h4 className="font-medium text-slate-850">Reaction Intensity</h4>
                        <p className="text-sm text-slate-500">How loud or physically expressive are their reactions?</p>
                      </div>
                      <span className="text-sage font-medium">{formData.temperament.intensity}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="100" 
                      value={formData.temperament.intensity}
                      onChange={(e) => setFormData({...formData, temperament: {...formData.temperament, intensity: parseInt(e.target.value)}})}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sage"
                    />
                    <div className="flex justify-between text-xs font-medium text-slate-400 mt-2 uppercase tracking-wider">
                      <span>Mild / Quiet</span>
                      <span>Big / Explosive</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-center py-8"
              >
                <div className="mb-8 inline-flex items-center justify-center w-24 h-24 rounded-full bg-sage/10 text-sage">
                  <Sparkles className="w-12 h-12" />
                </div>
                <h2 className="font-heading text-4xl text-slate-850 mb-4">Genome Generated.</h2>
                <p className="text-lg text-slate-500 mb-8 leading-relaxed max-w-md mx-auto">
                  We've mapped {formData.name || 'your child'}'s initial psychological profile. As you log behaviors, the intelligence engine will adapt and grow with them.
                </p>
                <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-slate-50 border border-slate-100 text-slate-600 font-medium">
                  <Shield className="w-5 h-5 text-sage" />
                  Absolute Data Privacy Guaranteed
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-12 flex justify-end">
            <Button 
              onClick={handleNext}
              disabled={step === 1 && (!formData.name || !formData.dateOfBirth)}
              className="h-14 px-8 bg-slate-850 hover:bg-slate-800 text-white rounded-full text-lg shadow-lg"
            >
              {step === 3 ? 'Enter Platform' : 'Continue'} <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
