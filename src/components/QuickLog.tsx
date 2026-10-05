'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/stores/appStore';

export function QuickLog() {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const selectedChild = useAppStore((s) => s.children.find(c => c.id === s.selectedChildId));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !selectedChild) return;

    setIsSubmitting(true);
    setStatus('idle');

    try {
      const response = await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId: selectedChild.id,
          content,
          logType: 'observation',
        }),
      });

      if (!response.ok) throw new Error('Failed to log');
      
      setStatus('success');
      setTimeout(() => {
        setIsOpen(false);
        setContent('');
        setStatus('idle');
      }, 1500);
      
    } catch (error) {
      console.error(error);
      setStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button aria-label="Log a moment"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 md:bottom-6 right-4 md:right-6 w-14 h-14 rounded-full bg-leaf hover:bg-leaf/90 shadow-lg shadow-leaf/25 flex items-center justify-center p-0 z-40 transition-transform hover:scale-105"
      >
        <Plus className="w-6 h-6 text-white" />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full sm:max-w-lg bg-white rounded-t-[2rem] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-leaf/10 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-leaf" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-slate-850">Log a moment</h3>
                    <p className="text-xs font-medium text-slate-500">Kahiye uses this next time you ask about {selectedChild?.name || 'your child'}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="p-6">
                {status === 'success' ? (
                  <div className="py-8 text-center flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-leaf/10 flex items-center justify-center mb-4 text-leaf">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h4 className="font-heading font-semibold text-lg text-slate-850 mb-1">Saved</h4>
                    <p className="text-slate-500 text-sm">Added to {selectedChild?.name}'s history.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="e.g., Had a meltdown at the park when we had to leave without warning."
                      className="w-full h-32 p-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-850 placeholder:text-slate-400 focus:outline-none focus:border-leaf focus:ring-1 focus:ring-leaf/20 resize-none"
                      autoFocus
                    />
                    
                    {status === 'error' && (
                      <p className="text-red-500 text-sm font-medium">Failed to save log. Please try again.</p>
                    )}
                    
                    <Button
                      type="submit"
                      disabled={!content.trim() || isSubmitting}
                      className="w-full h-12 bg-leaf hover:bg-leaf/90 text-white font-medium rounded-xl transition-all"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save'
                      )}
                    </Button>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
