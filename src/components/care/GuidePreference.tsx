import { useRef, useState } from "react";
import { useAppStore } from "@/stores/appStore";
import type { Child } from "@/types";

export function GuidePreference({ child }: { child: Child }) {
  const { updateChildGuide, setEditingChild } = useAppStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  async function save(guide: "girls" | "boys") {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await updateChildGuide(child.id, guide);
    } catch {
      setError("We could not confirm that choice was saved. Please try again.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <div>
      <p className="font-heading text-xl">
        {child.pubertyGuide
          ? `${child.name}’s ${child.pubertyGuide === "girls" ? "girls’" : "boys’"} guide`
          : `Personalise ${child.name}’s guide`}
      </p>
      {child.pubertyGuide ? (
        <>
          <p className="text-sm text-slate-600 mt-2">
            Matched to the choice saved in their profile.
          </p>
          <button
            onClick={() => setEditingChild(child.id)}
            className="text-clay underline text-sm mt-3 py-2"
          >
            Change guide preference
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-slate-600 mt-2">
            Choose the guide that fits your child. We’ll remember it for next
            time.
          </p>
          <div className="flex flex-wrap gap-3 mt-4">
            {(["girls", "boys"] as const).map((guide) => (
              <button
                key={guide}
                disabled={busy}
                onClick={() => void save(guide)}
                className="rounded-full border border-clay px-4 py-3 text-clay disabled:opacity-50"
              >
                {guide === "girls" ? "Use girls’ guide" : "Use boys’ guide"}
              </button>
            ))}
          </div>
          {busy && (
            <p role="status" className="text-sm mt-3">
              Saving your choice…
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-red-700 mt-3">
              {error}
            </p>
          )}
        </>
      )}
    </div>
  );
}
