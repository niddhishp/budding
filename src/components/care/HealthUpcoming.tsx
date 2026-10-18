"use client";
import type { Child } from "@/types";
import { useNotebook } from "./useNotebook";
import { healthUpcoming } from "@/lib/profile-notebook";
import { useAppStore } from "@/stores/appStore";
export function HealthUpcoming({ child }: { child: Child }) {
  const book = useNotebook(child.id),
    setPage = useAppStore((s) => s.setPage);
  const upcoming = book.data
    ? healthUpcoming(book.data.health.value.entries).slice(0, 3)
    : [];
  return (
    <section className="border-y py-5 mb-8">
      <div className="flex justify-between gap-3 items-center">
        <h2 className="font-heading text-xl">Their health diary</h2>
        <button
          className="text-clay underline text-sm"
          onClick={() => setPage("health")}
        >
          Open diary →
        </button>
      </div>
      {book.error ? (
        <p className="text-sm mt-3">
          Health dates could not be loaded. Open the diary to retry.
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
                {e.overdue ? "Planned date passed · " : ""}
                {e.due}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-600 mt-3">
          Keep vaccinations, medication and your next check-up together. No
          upcoming dates recorded.
        </p>
      )}
    </section>
  );
}
