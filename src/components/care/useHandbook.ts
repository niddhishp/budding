import { useCallback, useEffect, useRef, useState } from "react";
import { careRequest } from "./useCare";
import type { HandbookProgress } from "@/lib/handbook";
type Data = { progress: HandbookProgress; revision: number };
export function useHandbook(childId: string) {
  const [data, setData] = useState<Data | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState(false), [tick, setTick] = useState(0);
  const lock = useRef(false), mounted = useRef(true);
  const reload = useCallback(() => setTick(t => t + 1), []);
  useEffect(() => {
    const abort = new AbortController(); mounted.current = true; setData(null); setError("");
    careRequest(`/api/handbook?childId=${childId}`, { signal: AbortSignal.any([abort.signal, AbortSignal.timeout(15000)]) })
      .then(value => { if (!abort.signal.aborted) setData(value); })
      .catch(e => { if (!abort.signal.aborted) setError(e.message); });
    return () => { mounted.current = false; abort.abort(); };
  }, [childId, tick]);
  async function save(cardId: string, entry: HandbookProgress[string] | null) {
    if (!data || lock.current) return false;
    lock.current = true; setBusy(true); setError("");
    try {
      const result = await careRequest("/api/handbook", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ childId, revision: data.revision, cardId, entry }) });
      if (mounted.current) setData(result);
      return true;
    } catch (e) { if (mounted.current) setError(e instanceof Error ? e.message : "Not saved."); return false; }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  }
  return { data, error, busy, reload, save };
}
