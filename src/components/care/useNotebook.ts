"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { careRequest } from "./useCare";
import type { HealthBook, InterestsBook } from "@/lib/profile-notebook";
export type NotebookData = {
  health: { value: HealthBook; revision: number };
  interests: { value: InterestsBook; revision: number };
};
export function useNotebook(childId: string) {
  const [data, setData] = useState<NotebookData | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [tick, setTick] = useState(0);
  const saving = useRef(false);
  const reload = useCallback(() => setTick((n) => n + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError("");
    careRequest(`/api/profile-notebook?childId=${childId}`, {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
    })
      .then(setData)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [childId, tick]);
  async function save<K extends keyof NotebookData>(
    section: K,
    value: NotebookData[K]["value"],
  ) {
    if (!data || saving.current)
      throw Error("Wait for your records to finish loading or saving.");
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      const saved = await careRequest("/api/profile-notebook", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId,
          section,
          revision: data[section].revision,
          value,
        }),
      });
      setData((d) => (d ? { ...d, [section]: saved } : d));
      return saved;
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
