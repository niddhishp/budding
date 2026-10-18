"use client";
import { useState } from 'react';
import type { Child } from '@/types';
import type { InterestsBook } from '@/lib/profile-notebook';
import { dailyInterest } from '@/lib/daily-family';
import { todayDate } from '@/lib/family-care';
import { useAppStore } from '@/stores/appStore';

export function DailyInterestActivity({ child, interests, date = todayDate() }: { child: Child; interests: InterestsBook; date?: string }) {
  const [offset, setOffset] = useState(0);
  const setPage = useAppStore(s => s.setPage);
  const activity = dailyInterest(child.dateOfBirth, interests, date, offset);
  return <section className="bg-paper-deep rounded-[1.75rem] p-6 sm:p-8 mb-7" aria-label="Today's interest activity">
    <p className="text-sm text-clay mb-3">A little practice, a little joy</p>
    <h2 className="font-heading text-2xl mb-3">{activity ? `${child.name}’s invitation today` : 'Turn an interest into a little everyday moment'}</h2>
    {activity ? <>
      <p className="text-sm font-medium mb-3">{activity.area} · A few minutes, at their pace</p>
      <p className="text-slate-700 leading-relaxed" aria-live="polite">{activity.text}</p>
      <p className="text-sm text-slate-500 mt-4">Invite, don’t insist. Adapt to their comfort, abilities and any care-plan limits. Tomorrow brings another idea; nothing to catch up on.</p>
      <button className="text-clay underline py-3 mr-5" onClick={() => setOffset(n => n + 1)}>Try another idea</button>
    </> : <p className="text-slate-600">Save what they enjoy and Today will offer a small activity, game or tip matched to their age. No quiz is required.</p>}
    <button className="text-clay underline py-3" onClick={() => setPage('interests')}>{activity ? 'Update their interests' : 'Choose their interests'} →</button>
  </section>;
}
