"use client";
import { useEffect, useState } from "react";
import { Share2 } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { DECODE_COLUMNS, decodeFromRow, type DecodeRow } from "@/lib/mappers";
import { ShareSheet } from "@/components/ShareSheet";
import type { Child, Decode } from "@/types";

/**
 * The child's playbook: words a parent marked as having helped, newest first, ready to reuse or share
 * with anyone who looks after the child. Built only from the parent's own feedback; never a score.
 */
export function WhatWorks({ child }: { child: Child }) {
  const [items, setItems] = useState<Decode[] | null>(null), [failed, setFailed] = useState(false);
  const [sharing, setSharing] = useState<Decode | null>(null);
  useEffect(() => {
    let cancelled = false;
    getSupabase().from("decodes").select(DECODE_COLUMNS).eq("child_id", child.id).eq("safety_category", "none")
      .in("outcome", ["worked", "partly"]).is("analysis->conversation", null)
      .order("created_at", { ascending: false }).limit(8).returns<DecodeRow[]>()
      .then(({ data, error }) => { if (!cancelled) { if (error) setFailed(true); else setItems((data ?? []).map(decodeFromRow)); } },
        () => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [child.id]);
  if (failed) return null;
  return <section className="my-10" aria-labelledby="what-works-title">
    <h2 id="what-works-title" className="font-heading text-2xl text-slate-850">What works for {child.name}</h2>
    <p className="text-sm text-slate-600 mt-1">Words you said helped, kept here to reuse and to pass on to anyone who looks after {child.name}.</p>
    {items === null ? <p role="status" className="text-sm text-slate-500 mt-4">Loading…</p>
      : !items.length ? <p className="mt-4 rounded-2xl bg-paper-deep p-5 text-slate-700">When some words help, tap &ldquo;It helped&rdquo; after an answer. They will be kept here for {child.name}.</p>
      : <ul className="mt-4 grid sm:grid-cols-2 gap-3">{items.map(d => <li key={d.id} className="rounded-2xl border border-slate-200 bg-surface p-5">
          <p className="text-xs text-clay">{d.outcome === "worked" ? "Helped" : "Partly helped"} · {new Date(d.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
          <p className="font-heading text-lg text-slate-850 leading-snug mt-2">&ldquo;{d.analysis?.sayThis}&rdquo;</p>
          <p className="text-sm text-slate-600 mt-2 line-clamp-2">{d.scenario}</p>
          <button onClick={() => setSharing(d)} className="mt-3 inline-flex items-center gap-1.5 text-sm text-clay underline py-2"><Share2 className="w-4 h-4" aria-hidden /> Share with a caregiver</button>
        </li>)}</ul>}
    {sharing && <ShareSheet key={sharing.id} decode={sharing} childName={child.name} onClose={() => setSharing(null)} />}
  </section>;
}
