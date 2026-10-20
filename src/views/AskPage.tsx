"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAppStore } from "@/stores/appStore";
import { AskAIPage, SafetyBanner } from "./AskAIPage";
import { useRequestScope } from "@/hooks/useRequestScope";
import { readNdjson } from "@/lib/ndjson";
import { getSupabase } from "@/lib/supabase";
import { DECODE_COLUMNS, decodeFromRow, type DecodeRow } from "@/lib/mappers";
import { HANDBOOK } from "@/data/handbook";
import { fieldClass, buttonClass } from "@/components/care/CareFrame";
import type { Child, Decode, DecodeStreamEvent, SafetyNotice } from "@/types";
import { CONVERSATION_MESSAGE_LIMIT } from "@/lib/plans";

type Mode = "guidance" | "talk" | "rehearse";
export function AskPage() {
  const { children, selectedChildId, askIntent } = useAppStore();
  const [mode, setMode] = useState<Mode>(askIntent?.mode ?? "guidance");
  const child = children.find(c => c.id === selectedChildId);
  return <div>
    <nav aria-label="Ways to ask" className="max-w-5xl mx-auto px-5 pt-6 flex flex-wrap gap-2">
      {([["guidance", "Help with a moment"], ["talk", "Talk it through"], ["rehearse", "Practise"]] as const).map(([id, label]) =>
        <button key={id} aria-pressed={mode === id} onClick={() => setMode(id)} className={`rounded-full border px-4 py-3 text-sm ${mode === id ? "bg-clay/10 border-clay text-clay" : "border-slate-300 text-slate-700"}`}>{label}</button>)}
    </nav>
    {mode === "guidance" ? <AskAIPage key={`${child?.id}-${askIntent?.prompt ?? ""}`} initialScenario={askIntent?.mode === mode ? askIntent.prompt : ""} />
      : child && <Conversation key={`${child.id}-${mode}`} child={child} mode={mode} initial={askIntent?.mode === mode ? askIntent.prompt : ""} cardId={askIntent?.cardId} />}
  </div>;
}
function Conversation({ child, mode, initial, cardId }: { child: Child; mode: "talk" | "rehearse"; initial: string; cardId?: string }) {
  const { setEntitlement, entitlement, openPaywall, openExpert } = useAppStore();
  const [text, setText] = useState(initial), [turns, setTurns] = useState<Decode[]>([]), [history, setHistory] = useState<Decode[]>([]);
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [error, setError] = useState(""), [status, setStatus] = useState("");
  const [safety, setSafety] = useState<SafetyNotice | null>(null), [support, setSupport] = useState("");
  const [tick, setTick] = useState(0), [offset, setOffset] = useState(0), [hasMore, setHasMore] = useState(false);
  const scope = useRequestScope(), active = useRef<ReturnType<typeof scope.start> | null>(null), receipt = useRef<{ key: string; id: string } | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const task = scope.start(15000); let cancelled = false; setLoading(true);
    getSupabase().from("decodes").select(DECODE_COLUMNS).eq("child_id", child.id).eq("analysis->conversation->>mode", mode)
      .order("created_at", { ascending: false }).order("id", { ascending: false }).range(offset, offset + 19).abortSignal(task.signal).returns<DecodeRow[]>()
      .then(({ data, error: failure }) => {
        if (!cancelled) {
          if (failure) setError("Saved conversations could not be loaded.");
          else {
            const rows = (data ?? []).map(decodeFromRow);
            setHistory(old => offset ? [...old, ...rows.filter(row => !old.some(item => item.id === row.id))] : rows);
            setHasMore(rows.length === 20);
          }
          setLoading(false);
        }
        task.finish();
      }, () => {
        if (!cancelled) { setError("Saved conversations could not be loaded. Please retry."); setLoading(false); }
        task.finish();
      });
    return () => { cancelled = true; task.cancel(); task.finish(); };
  }, [child.id, mode, scope, tick, offset]);
  async function send() {
    const scenario = text.trim();
    if (scenario.length < 3 || active.current) return;
    setBusy(true); setError(""); setSafety(null); setSupport(""); setStatus("Checking your message…");
    const task = scope.start();
    active.current = task;
    const previous = turns.at(-1);
    const resolvedCard = previous?.analysis?.conversation?.cardId ?? cardId;
    const request = { childId: child.id, mode, scenario, continues: previous?.id, cardId: resolvedCard };
    const key = JSON.stringify(request);
    if (receipt.current?.key !== key) receipt.current = { key, id: crypto.randomUUID() };
    try {
      const response = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, signal: task.signal, body: JSON.stringify({ ...request, requestId: receipt.current.id }) });
      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}));
        throw Error(data.error ?? "Could not start this conversation.");
      }
      let terminal = false;
      for await (const event of readNdjson<DecodeStreamEvent>(response.body)) {
        if (!task.active()) return;
        if (event.type === "status") setStatus(event.message);
        if (event.type === "safety") setSafety(event.safety);
        if (event.type === "support") { setSupport(event.message); terminal = true; }
        if (event.type === "error") { terminal = true; setError(event.error); if (event.code === "upgrade_required") openPaywall(event.error); }
        if (event.type === "done") {
          if (event.decode.childId !== child.id || event.decode.analysis?.conversation?.mode !== mode) throw Error("Conversation context changed. Please start fresh.");
          terminal = true; setTurns(old => [...old.filter(t => t.id !== event.decode.id), event.decode]);
          setHistory(old => [event.decode, ...old.filter(t => t.id !== event.decode.id)]);
          setEntitlement(event.entitlement); setText(""); setStatus(""); receipt.current = null;
        }
      }
      if (!terminal) throw Error("The connection stopped. Retry to recover any saved reply.");
    } catch (e) { if (task.active()) setError(e instanceof Error ? e.message : "Could not complete the reply. Retry your message."); }
    finally { task.finish(); if (active.current === task) { active.current = null; setBusy(false); } }
  }
  return <div className="max-w-3xl mx-auto px-5 pt-8 pb-28">
    <h1 className="font-heading text-4xl">{mode === "talk" ? "What is on your mind?" : "Try the words out here first"}</h1>
    <p className="text-slate-600 mt-4 leading-7">{mode === "talk" ? `Talk with Kahiye’s AI about parenting ${child.name}, or how you are feeling as a parent. You do not need a neatly worded question.` : `A fictional practice conversation for you, using ${child.name}’s age. It cannot predict what your child will say. Describe the conversation you want to practise.`}</p>
    <p className="text-sm text-slate-600 mt-3">AI support, not a human conversation or therapy. <button className="underline text-clay" onClick={() => openExpert("menu")}>Request a real professional conversation</button>.</p>
    {(turns.at(-1)?.analysis?.conversation?.cardId ?? cardId) && <p className="text-sm text-clay mt-4">From your Handbook: {HANDBOOK.find(c => c.id === (turns.at(-1)?.analysis?.conversation?.cardId ?? cardId))?.title}</p>}
    <div role="log" aria-live="polite" aria-relevant="additions" aria-label="Conversation" className="mt-8 space-y-7">
      {turns.map(turn => <section key={turn.id} className="space-y-4">
        <div className="ml-6 sm:ml-16 rounded-2xl bg-paper-deep p-5"><p className="text-xs text-slate-600 mb-2">You</p><p className="whitespace-pre-wrap break-words">{turn.scenario}</p></div>
        <div className="border-y py-5"><p className="text-xs text-clay mb-3">Kahiye · AI {mode === "rehearse" ? "practice coach" : "guide"}</p><p className="whitespace-pre-wrap leading-7 break-words">{turn.analysis?.conversation?.reply}</p>
          {turn.analysis?.conversation?.practiceReply && <div className="mt-5 bg-paper-deep p-5 rounded-xl"><p className="text-xs text-slate-600 mb-2">A fictional child might say</p><p className="font-heading text-xl">{turn.analysis.conversation.practiceReply}</p></div>}
          {!!turn.analysis?.conversation?.feedback.length && <div className="mt-5"><p className="text-sm font-medium">Something to take into the real conversation</p><ul className="list-disc pl-5 space-y-2 mt-3">{turn.analysis.conversation.feedback.map((f, i) => <li key={i}>{f}</li>)}</ul></div>}
        </div>
      </section>)}
    </div>
    {safety && <SafetyBanner notice={safety} onExpert={() => openExpert("safety", text)} />}
    {support && <p role="status" className="mt-5 p-4 bg-paper-deep">{support} <Link href="/help-now" className="underline text-clay">Immediate support</Link></p>}
    <form className="mt-7" onSubmit={e => { e.preventDefault(); void send(); }}>
      <label htmlFor="parent-chat" className="block text-sm mb-2">{mode === "talk" ? "Your message" : "The conversation, or the words you would try"}</label>
      <textarea id="parent-chat" ref={input} className={`${fieldClass} min-h-28`} value={text} maxLength={2000} onChange={e => setText(e.target.value)} placeholder={mode === "talk" ? "Today has felt like a lot…" : "I want to talk about phone time without an argument…"} />
      <div className="flex flex-wrap gap-5 items-center mt-4"><button className={buttonClass} disabled={busy || text.trim().length < 3}>{busy ? "Preparing a reply…" : "Send"}</button>
        {busy ? <button type="button" className="underline py-3" onClick={() => { scope.cancel(); active.current = null; setBusy(false); setStatus(""); setError("Stopped. Retry the same message to recover any saved reply."); }}>Stop</button> : !!turns.length && <button type="button" className="underline py-3" onClick={() => { setTurns([]); setSafety(null); setSupport(""); setError(""); setText(""); receipt.current = null; input.current?.focus(); }}>Start a fresh conversation</button>}
      </div>
      {busy && <p role="status" className="text-sm text-slate-600 mt-3">{status}</p>}
      {error && <p role="alert" className="text-sm text-red-800 mt-4">{error}</p>}
    </form>
    <p className="text-xs text-slate-600 mt-5 leading-6">Starting a conversation uses one Ask turn; your next replies in it are included, up to {CONVERSATION_MESSAGE_LIMIT} messages. Safety support never uses your allowance. {entitlement && `${Math.max(0, entitlement.limit - entitlement.used)} of ${entitlement.limit} left in this ${entitlement.window}.`} Replies are saved to this child’s account history. Only when you continue a conversation are up to four earlier turns included. Chat and fictional practice do not create child memories automatically.</p>
    <details className="mt-8 border-t pt-5"><summary className="cursor-pointer">Saved {mode === "talk" ? "chats" : "practice"} for {child.name}</summary>
      {loading ? <p role="status" className="mt-4">Loading…</p> : history.length ? <div className="divide-y mt-3">{history.map(turn => <button disabled={busy} key={turn.id} className="block w-full text-left py-4" onClick={() => { setTurns([turn]); setText(""); setError(""); setSafety(null); setSupport(""); input.current?.focus(); }}><span className="text-xs text-slate-600">{new Date(turn.createdAt).toLocaleDateString()} · Open & continue</span><span className="block line-clamp-2 mt-1">{turn.scenario}</span></button>)}</div> : <p className="mt-4">Your first conversation can start with a single sentence.</p>}
      {hasMore && <button disabled={loading} className="underline py-3 text-sm mr-5" onClick={() => setOffset(n => n + 20)}>Load older conversations</button>}
      <button disabled={loading} className="underline py-3 text-sm" onClick={() => { setError(""); setOffset(0); setTick(t => t + 1); }}>Reload saved conversations</button>
    </details>
  </div>;
}
