"use client";
import type { Child } from "@/types";
import { useNotebook } from "./useNotebook";
import { dailyHealth } from "@/lib/daily-family";
import { useTodayDate } from './useTodayDate';
import { DailyInterestActivity } from './DailyInterestActivity';
import { useAppStore } from "@/stores/appStore";
export function HealthUpcoming({ child }: { child: Child }) {
  const book = useNotebook(child.id),
    setPage = useAppStore((s) => s.setPage);
  const date = useTodayDate();
  const health = dailyHealth(book.data?.health.value.entries ?? [], date);
  const upcoming = health.reminders.slice(0, 3);
  return (
    <>
    {book.data && <DailyInterestActivity key={`${child.id}-${book.data.interests.revision}-${date}`} child={child} interests={book.data.interests.value} date={date} />}
    <section className="border-y py-5 mb-8">
      <div className="flex justify-between gap-3 items-center">
        <h2 className="font-heading text-xl">Care to keep in mind today</h2>
        <button
          className="text-clay underline text-sm"
          onClick={() => setPage("health")}
        >
          Open diary →
        </button>
      </div>
      {book.error ? (
        <p className="text-sm mt-3">
          Your interests and health diary could not be loaded. <button className="underline" onClick={book.reload}>Try again</button>
        </p>
      ) : !book.data ? (
        <p role="status" className="text-sm mt-3">
          Loading your planned dates…
        </p>
      ) : upcoming.length ? (
        <ul className="mt-3 space-y-3">
          {upcoming.map((e) => (
            <li key={e.id} className="flex justify-between gap-3 text-sm">
              <span>{e.title}</span>
              <span className="text-slate-600 text-right">
                {e.label} · {e.due}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-600 mt-3">
          Keep vaccinations, medication and your next check-up together. No
          dates due in the next seven days or past their planned date.
        </p>
      )}
      {health.reminders.length > 3 && <p className="text-sm mt-3">{health.reminders.length - 3} more dates in the diary.</p>}
      {health.ongoing.length > 0 && <div className="mt-5 space-y-4">
        <p className="text-sm text-slate-600">Your ongoing medication records. Follow the current instructions from your clinician or pharmacist; this is not a dose alarm.</p>
        {health.ongoing.map(e => <details key={e.id} className="rounded-xl bg-paper-deep p-4">
          <summary className="cursor-pointer font-medium break-words">{e.title} · your recorded care plan</summary>
          {e.instructions && <div className="mt-3"><p className="text-xs text-slate-500">Instructions you recorded</p><p className="whitespace-pre-wrap break-words text-sm mt-1">{e.instructions}</p></div>}
          {e.note && <div className="mt-3"><p className="text-xs text-slate-500">Your condition / care notes</p><p className="whitespace-pre-wrap break-words text-sm mt-1">{e.note}</p></div>}
          <p className="text-sm mt-3">Keep questions or changes you notice for the care team. If instructions are unclear or symptoms change, contact the prescriber or pharmacist; don’t change treatment based on this card.</p>
          <button className="text-clay underline text-sm py-3" onClick={() => setPage('health')}>Review or update this record →</button>
        </details>)}
      </div>}
      {upcoming.some(e => e.overdue) && <p className="text-xs text-slate-500 mt-4">A planned date passing does not mean a vaccination or dose was missed. Update the record if it happened, or confirm the next step with your care team.</p>}
      <p className="text-xs text-slate-500 mt-4">Based on dates and notes you saved. Reminders appear here in Today; email and WhatsApp are not active yet.</p>
    </section>
    </>
  );
}
