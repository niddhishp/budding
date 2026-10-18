import { useCallback, useEffect, useRef, useState } from "react";
import { careRequest } from "./useCare";
import { cleanEntry, type FamilyEntry } from "@/lib/family-planner";
export type FamilyPlanData = {
  entries: FamilyEntry[];
  health: { id: string; child_id: string; title: string; date: string }[];
};
export function useFamilyPlan() {
  const [data, setData] = useState<FamilyPlanData | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [tick, setTick] = useState(0);
  const saving = useRef(false);
  const reload = useCallback(() => setTick((n) => n + 1), []);
  useEffect(() => {
    const c = new AbortController();
    setError("");
    setData(null);
    careRequest("/api/family-plan", {
      signal: AbortSignal.any([c.signal, AbortSignal.timeout(15000)]),
    })
      .then(setData)
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      });
    return () => c.abort();
  }, [tick]);
  async function save(entry: FamilyEntry, photo?: File) {
    if (saving.current) throw Error("Wait for the current save.");
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      let result;
      if (photo) {
        const form = new FormData();
        form.set("entry", JSON.stringify(cleanEntry(entry)));
        form.set("photo", photo);
        result = await careRequest("/api/family-photos", {
          method: "POST",
          body: form,
          signal: AbortSignal.timeout(60000),
        });
      } else
        result = await careRequest("/api/family-plan", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cleanEntry(entry)),
        });
      setData((d) =>
        d
          ? {
              ...d,
              entries: [
                result.entry,
                ...d.entries.filter((e) => e.id !== entry.id),
              ],
            }
          : d,
      );
      return result.entry as FamilyEntry;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
      throw e;
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  return { data, error, busy, reload, save };
}
