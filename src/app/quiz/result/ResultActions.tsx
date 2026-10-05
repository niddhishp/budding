'use client';

import { useSyncExternalStore, useState } from 'react';
import Link from 'next/link';
import { Check, Link2, Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { encodeAnswers, loadQuizResult } from '@/lib/temperament';

const noopSubscribe = () => () => {};

export function ResultActions({ code, name, archetypeName, emoji }: {
  code: string;
  name: string | null;
  archetypeName: string;
  emoji: string;
}) {
  // The parent who took the quiz has these answers saved locally; a friend opening a shared link does not.
  const isOwner = useSyncExternalStore(
    noopSubscribe,
    () => {
      const saved = loadQuizResult();
      return !!saved && encodeAnswers(saved.answers) === code;
    },
    () => false,
  );
  const [copied, setCopied] = useState(false);

  const shareUrl = () => {
    const params = new URLSearchParams({ t: code });
    if (name) params.set('n', name);
    return `${window.location.origin}/quiz/result?${params}`;
  };
  const shareText = () =>
    `${name ?? 'My child'} is ${archetypeName} ${emoji}\nWhat's your child's temperament type? 60-second quiz:`;

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText()} ${shareUrl()}`)}`, '_blank', 'noopener');
  };
  const copyLink = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ text: shareText(), url: shareUrl() });
        return;
      }
      await navigator.clipboard.writeText(shareUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* share sheet dismissed */ }
  };

  return (
    <div className="mt-10 space-y-3">
      {isOwner ? (
        <div className="p-7 rounded-[2rem] bg-paper-deep">
          <p className="font-heading text-xl text-slate-900 mb-2">Get scripts made for {name ?? 'your child'}.</p>
          <p className="text-slate-600 mb-5 leading-relaxed">
            Next meltdown, describe what's happening and Kahiye gives you the exact words to say, tuned to this temperament.
          </p>
          <Button asChild className="w-full h-14 rounded-full bg-clay hover:bg-clay-deep text-white text-lg">
            <Link href="/login?next=/app"><Sparkles className="w-5 h-5" /> Start free</Link>
          </Button>
        </div>
      ) : (
        <Button asChild className="w-full h-14 rounded-full bg-clay hover:bg-clay-deep text-white text-lg">
          <Link href="/quiz">Find your child's type</Link>
        </Button>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={shareWhatsApp} className="h-12 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white">
          <Send className="w-4 h-4" /> WhatsApp
        </Button>
        <Button onClick={copyLink} variant="outline" className="h-12 rounded-full">
          {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />} {copied ? 'Copied' : 'Share link'}
        </Button>
      </div>
    </div>
  );
}
