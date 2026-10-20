"use client";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import type { Child } from "@/types";

const EVENINGS = [["0", "None"], ["1-2", "1–2"], ["3-4", "3–4"], ["5+", "5 or more"]] as const;
const SURE = [[1, "Not at all"], [2, "A little"], [3, "Somewhat"], [4, "Mostly"], [5, "Very"]] as const;
type Evenings = (typeof EVENINGS)[number][0];
type Checkin = { hard_evenings: Evenings; confidence: number; created_at: string };
const snoozeKey = (id: string) => `kahiye.checkin.snooze.${id}`;
const DAY = 86_400_000;
const level = (e: Evenings) => EVENINGS.findIndex(([v]) => v === e);

/** Optional, every two weeks: are evenings getting easier? Two taps, no score, skippable. */
export function FamilyCheckin({ child }: { child: Child }) {
  // undefined while loading; `due` is decided once, when the last check-in is known.
  const [previous, setPrevious] = useState<Checkin | null | undefined>(undefined), [due, setDue] = useState(false);
  const [evenings, setEvenings] = useState<Evenings | null>(null), [sure, setSure] = useState<number | null>(null);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "failed" | "hidden">(() => {
    try { return Number(localStorage.getItem(snoozeKey(child.id)) ?? 0) > Date.now() ? "hidden" : "idle"; } catch { return "idle"; }
  });
  const [receipt] = useState(() => crypto.randomUUID());
  useEffect(() => {
    let cancelled = false;
    getSupabase().from("family_checkins").select("hard_evenings,confidence,created_at").eq("child_id", child.id)
      .order("created_at", { ascending: false }).limit(1).returns<Checkin[]>()
      .then(({ data, error }) => {
        if (cancelled) return;
        const last = error ? null : data?.[0] ?? null;
        setPrevious(last);
        setDue(!error && (!last || Date.now() - Date.parse(last.created_at) > 14 * DAY));
      }, () => { if (!cancelled) setPrevious(null); });
    return () => { cancelled = true; };
  }, [child.id]);
  if (state === "hidden" || previous === undefined || (!due && state !== "saved")) return null;

  async function save() {
    if (!evenings || !sure) return;
    setState("saving");
    const { data, error } = await getSupabase().rpc("record_family_checkin", { target: child.id, receipt, evenings, sure });
    setState(!error && data?.status ? "saved" : "failed");
  }
  function snooze() {
    try { localStorage.setItem(snoozeKey(child.id), String(Date.now() + 3 * DAY)); } catch { /* hidden for this visit only */ }
    setState("hidden");
  }

  if (state === "saved") {
    const change = previous && evenings ? level(evenings) - level(previous.hard_evenings) : null;
    return <section className="mb-8 rounded-2xl bg-paper-deep p-6" aria-live="polite">
      <h2 className="font-heading text-2xl">Thank you.</h2>
      <p className="text-slate-700 mt-3">
        {change === null ? `We'll ask again in two weeks, so you can see whether evenings with ${child.name} get easier.`
          : change < 0 ? "Fewer hard evenings than last time. That's worth noticing."
          : change > 0 ? "A harder stretch than last time. That happens. Ask Kahiye about one of those evenings if it would help."
          : "About the same as last time. Small steps still count."}
      </p>
    </section>;
  }
  return <section className="mb-8 rounded-2xl border border-slate-200 p-6" aria-labelledby="checkin-title">
    <p className="text-sm text-clay">A two-question check-in · optional</p>
    <h2 id="checkin-title" className="font-heading text-2xl mt-2">How have evenings been with {child.name}?</h2>
    <fieldset className="mt-5">
      <legend className="text-slate-700">In the last 7 days, how many evenings ended in a fight or tears?</legend>
      <div className="flex flex-wrap gap-2 mt-3">{EVENINGS.map(([value, label]) => <button key={value} type="button" aria-pressed={evenings === value} onClick={() => setEvenings(value)} className={`rounded-full border px-4 py-3 text-sm ${evenings === value ? "border-clay bg-clay/10" : "border-slate-300"}`}>{label}</button>)}</div>
    </fieldset>
    <fieldset className="mt-5">
      <legend className="text-slate-700">How confident do you feel handling {child.name}&apos;s hard moments?</legend>
      <div className="flex flex-wrap gap-2 mt-3">{SURE.map(([value, label]) => <button key={value} type="button" aria-pressed={sure === value} onClick={() => setSure(value)} className={`rounded-full border px-4 py-3 text-sm ${sure === value ? "border-clay bg-clay/10" : "border-slate-300"}`}>{label}</button>)}</div>
    </fieldset>
    <div className="flex flex-wrap items-center gap-4 mt-6">
      <button disabled={!evenings || !sure || state === "saving"} onClick={save} className="rounded-full bg-clay text-white px-5 py-3 font-medium disabled:opacity-50">{state === "saving" ? "Saving…" : "Save"}</button>
      <button onClick={snooze} className="underline text-sm text-slate-600 py-3">Not now</button>
    </div>
    <p className="text-xs text-slate-600 mt-4">Private to you. It helps you, and Kahiye, see whether things get easier over time. It is never a score for your child.</p>
    {state === "failed" && <p role="alert" className="text-sm mt-3">That was not saved. Please try again.</p>}
  </section>;
}
