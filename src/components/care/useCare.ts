"use client";
import { useCallback, useEffect, useState } from "react";
import type { CareSettings, GrowthEntry } from "@/lib/family-care";
export type CareData = {
  settings: CareSettings;
  revision: number;
  growth: GrowthEntry[];
};
export async function careRequest(url: string, init?: RequestInit) {
  const r = await fetch(url, {
    ...init,
    cache: "no-store",
    signal: init?.signal ?? AbortSignal.timeout(15000),
  });
  const data = await r.json();
  if (!r.ok) throw Error(data.error ?? "Could not save. Please try again.");
  return data;
}
export function useCare(childId: string) {
  const [data, setData] = useState<CareData | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((n) => n + 1), []);
  useEffect(() => {
    const c = new AbortController();
    setData(null);
    setError("");
    careRequest(`/api/care?childId=${childId}`, {
      signal: AbortSignal.any([c.signal, AbortSignal.timeout(15000)]),
    })
      .then(setData)
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      });
    return () => c.abort();
  }, [childId, tick]);
  async function save(settings: CareSettings) {
    if (!data || busy) throw new Error('Wait for the current save to finish.');
    setBusy(true);
    setError("");
    try {
      const saved = await careRequest("/api/care", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId, revision: data.revision, settings }),
      });
      setData(current => current ? { ...current, ...saved } : current);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
      throw e;
    } finally {
      setBusy(false);
    }
  }
  return { data, error, busy, reload, save };
}
