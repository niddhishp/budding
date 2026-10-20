"use client";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { DECODE_COLUMNS, decodeFromRow, type DecodeRow } from "@/lib/mappers";
import type { Decode, DecodeOutcome } from "@/types";

const CHOICES: [DecodeOutcome, string][] = [["worked", "It helped"], ["partly", "Partly"], ["did_not_work", "Not this time"]];
const dismissedKey = (id: string) => `kahiye.followup.dismissed.${id}`;

/** Asks once, a few hours to a week later, whether recent guidance helped. One tap; skipping is fine. */
export function OutcomeFollowUp({ childId }: { childId: string }) {
  const [decode, setDecode] = useState<Decode | null>(null);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  useEffect(() => {
    let cancelled = false;
    const now = Date.now();
    getSupabase().from("decodes").select(DECODE_COLUMNS).eq("child_id", childId).eq("safety_category", "none")
      .is("outcome", null).is("analysis->conversation", null)
      .gte("created_at", new Date(now - 7 * 86_400_000).toISOString()).lte("created_at", new Date(now - 3 * 3_600_000).toISOString())
      .order("created_at", { ascending: false }).limit(1).returns<DecodeRow[]>()
      .then(({ data }) => {
        const row = data?.[0] ? decodeFromRow(data[0]) : null;
        let dismissed = false;
        try { dismissed = !!row && localStorage.getItem(dismissedKey(row.id)) === "1"; } catch { /* storage unavailable; still show */ }
        if (!cancelled && row?.analysis?.sayThis && !dismissed) setDecode(row);
      }, () => undefined);
    return () => { cancelled = true; };
  }, [childId]);
  if (!decode?.analysis) return null;
  async function record(outcome: DecodeOutcome) {
    if (!decode) return;
    setState("saving");
    try {
      const res = await fetch(`/api/decodes/${decode.id}/outcome`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ outcome }) });
      setState(res.ok ? "saved" : "failed");
    } catch { setState("failed"); }
  }
  function skip() {
    try { if (decode) localStorage.setItem(dismissedKey(decode.id), "1"); } catch { /* the card simply returns next visit */ }
    setDecode(null);
  }
  return <section className="mb-8 rounded-2xl border border-slate-200 p-6" aria-label="How did it go?">
    {state === "saved" ? <>
      <h2 className="font-heading text-2xl">Thank you for telling us.</h2>
      <p className="text-slate-600 mt-3">It shapes the next suggestion for this child. You can review what Kahiye remembers in Child.</p>
    </> : <>
      <p className="text-sm text-clay">How did it go?</p>
      <h2 className="font-heading text-2xl mt-2 leading-snug">“{decode.analysis.sayThis}”</h2>
      <p className="text-slate-600 mt-3">Did these words help, even a little?</p>
      <div className="flex flex-wrap gap-2 mt-4">
        {CHOICES.map(([value, label]) => <button key={value} disabled={state === "saving"} onClick={() => record(value)} className="rounded-full border border-slate-300 px-4 py-3 text-sm hover:border-clay">{label}</button>)}
        <button disabled={state === "saving"} onClick={skip} className="underline text-sm text-slate-600 px-2 py-3">Didn’t get to try it</button>
      </div>
      {state === "saving" && <p role="status" className="text-sm mt-3">Saving…</p>}
      {state === "failed" && <p role="alert" className="text-sm mt-3">That was not saved. Tap your choice again.</p>}
    </>}
  </section>;
}
