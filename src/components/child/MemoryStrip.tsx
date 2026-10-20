"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Lock, Plus, X } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { ageAtPhoto, memoriesFor, type FamilyEntry } from "@/lib/family-planner";
import { MEMORY_EXAMPLES } from "./MemoryExamples";
import type { Child } from "@/types";

const PROMPTS = ["First day of school", "A birthday", "An ordinary Tuesday"];
const SHOWN = 24;
const formatDate = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/**
 * The child's private photo memories as a sideways strip: oldest to newest, opening at the newest.
 * Native scrolling with snap points; the gentle parallax is CSS-only and stops when motion is reduced.
 */
export function MemoryStrip({ child, entries, loading }: { child: Child; entries: FamilyEntry[] | undefined; loading: boolean }) {
  const openPhotos = useAppStore(s => s.openPhotos);
  const all = memoriesFor(entries ?? [], child.id).filter(e => e.photo_ready);
  const memories = all.slice(-SHOWN);
  const track = useRef<HTMLUListElement>(null);
  const [viewing, setViewing] = useState<number | null>(null);
  const [edges, setEdges] = useState({ start: true, end: true });
  const empty = !loading && !memories.length;

  // Open at the newest memory, then let the parent travel back in time.
  useLayoutEffect(() => {
    const el = track.current;
    if (el && memories.length) el.scrollLeft = el.scrollWidth;
  }, [memories.length]);
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const update = () => setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 8 });
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => { el.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, [memories.length, empty]);

  const scrollBy = (direction: 1 | -1) => track.current?.scrollBy({ left: direction * track.current.clientWidth * 0.85, behavior: "smooth" });
  const focusCard = (index: number) => {
    const cards = track.current?.querySelectorAll<HTMLButtonElement>("[data-memory-card]");
    const card = cards?.[Math.max(0, Math.min(index, cards.length - 1))];
    card?.focus();
    card?.scrollIntoView({ inline: "nearest", block: "nearest" });
  };
  const onKey = (e: React.KeyboardEvent) => {
    const cards = Array.from(track.current?.querySelectorAll<HTMLButtonElement>("[data-memory-card]") ?? []);
    const at = cards.indexOf(document.activeElement as HTMLButtonElement);
    if (at < 0) return;
    const next = { ArrowRight: at + 1, ArrowLeft: at - 1, Home: 0, End: cards.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    focusCard(next);
  };

  return <section aria-labelledby="memories-title" className="mb-10">
    <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
      <div>
        <h2 id="memories-title" className="font-heading text-2xl text-slate-850">Photo memories</h2>
        <p className="text-sm text-slate-600 mt-1 flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" aria-hidden /> Only you can see these. Never used for guidance.</p>
      </div>
      <div className="flex items-center gap-4">
        <button className="inline-flex items-center gap-1.5 rounded-full bg-clay text-white px-4 py-2.5 text-sm font-medium" onClick={() => openPhotos({ title: "" })}><Plus className="w-4 h-4" aria-hidden /> Add a photo</button>
        {!!all.length && <button className="text-clay underline text-sm py-2.5" onClick={() => openPhotos()}>See all ({all.length})</button>}
      </div>
    </div>

    <div className="relative">
      {!edges.start && <button type="button" aria-label="Earlier memories" aria-controls="memory-track" onClick={() => scrollBy(-1)} className="hidden [@media(pointer:fine)]:flex absolute left-1 top-[42%] -translate-y-1/2 z-10 w-11 h-11 items-center justify-center rounded-full bg-surface shadow-paper text-slate-800"><ChevronLeft className="w-5 h-5" /></button>}
      {!edges.end && <button type="button" aria-label="Later memories" aria-controls="memory-track" onClick={() => scrollBy(1)} className="hidden [@media(pointer:fine)]:flex absolute right-1 top-[42%] -translate-y-1/2 z-10 w-11 h-11 items-center justify-center rounded-full bg-surface shadow-paper text-slate-800"><ChevronRight className="w-5 h-5" /></button>}
      <ul id="memory-track" ref={track} onKeyDown={onKey}
        aria-label={empty ? "Example photo memories" : `${child.name}'s photo memories, ${memories.length}, oldest to newest`}
        className="memory-track -mx-4 px-4 flex gap-4 overflow-x-auto snap-x snap-mandatory overscroll-x-contain scroll-px-4 pb-4">
        {loading && !entries && [0, 1, 2].map(i => <li key={i} className="shrink-0 w-[68vw] max-w-[260px] h-[340px] rounded-2xl bg-paper-deep animate-pulse" aria-hidden />)}
        {memories.map((m, i) => <li key={m.id} className="snap-start shrink-0">
          <button type="button" data-memory-card onClick={() => setViewing(i)}
            aria-label={`${m.value.title}, ${formatDate(m.value.date)}${ageAtPhoto(child.dateOfBirth, m.value.date) ? `, age ${ageAtPhoto(child.dateOfBirth, m.value.date)}` : ""}. Open`}
            className={`memory-print group block text-left w-[68vw] max-w-[260px] ${i % 2 ? "motion-safe:rotate-[0.6deg]" : "motion-safe:-rotate-[0.6deg]"} motion-safe:transition-transform hover:rotate-0 focus-visible:rotate-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay rounded-2xl`}>
            <span className="block bg-surface p-1.5 rounded-2xl shadow-paper">
              <span className="block aspect-[4/5] overflow-hidden rounded-xl bg-paper-deep">
                <img src={`/api/family-photos/${m.id}?size=thumb`} alt={m.value.title} loading={i >= memories.length - 3 ? "eager" : "lazy"} decoding="async"
                  width={260} height={325} className="memory-drift h-full w-[112%] max-w-none object-cover" />
              </span>
            </span>
            <span className="block px-1 mt-3 text-sm text-slate-600">{formatDate(m.value.date)}{ageAtPhoto(child.dateOfBirth, m.value.date) && <> · <span className="text-clay">{ageAtPhoto(child.dateOfBirth, m.value.date)}</span></>}</span>
            <span className="block px-1 font-heading text-lg text-slate-850 leading-snug line-clamp-2">{m.value.title}</span>
          </button>
        </li>)}
        {empty && <>
          <li className="snap-start shrink-0">
            <button type="button" onClick={() => openPhotos({ title: "" })} className="w-[68vw] max-w-[260px] aspect-[4/5] rounded-2xl border-2 border-dashed border-clay/50 bg-surface flex flex-col items-center justify-center gap-3 text-clay p-6 text-center">
              <Plus className="w-8 h-8" aria-hidden />
              <span className="font-heading text-xl text-slate-850">Add {child.name}’s first memory</span>
              <span className="text-sm text-slate-600">One photo and a line about the moment.</span>
            </button>
            <div className="flex flex-wrap gap-2 mt-3 max-w-[260px]">{PROMPTS.map(p => <button key={p} className="text-xs rounded-full border border-slate-300 px-3 py-2" onClick={() => openPhotos({ title: p })}>{p}</button>)}</div>
          </li>
          {MEMORY_EXAMPLES.map(({ id, title, age, Art }, i) => <li key={id} className="snap-start shrink-0 opacity-80" aria-label={`Example: ${title}`}>
            <div className={`memory-print w-[68vw] max-w-[260px] ${i % 2 ? "motion-safe:rotate-[0.6deg]" : "motion-safe:-rotate-[0.6deg]"}`}>
              <div className="relative bg-surface p-1.5 rounded-2xl shadow-paper">
                <div className="aspect-[4/5] overflow-hidden rounded-xl"><div className="memory-drift h-full w-[112%]"><Art /></div></div>
                <span className="absolute top-3 left-3 rounded-full bg-surface/90 px-2.5 py-1 text-xs font-medium text-slate-700">Example</span>
              </div>
              <p className="px-1 mt-3 text-sm text-clay">{age}</p>
              <p className="px-1 font-heading text-lg text-slate-850 leading-snug">{title}</p>
            </div>
          </li>)}
        </>}
      </ul>
    </div>
    {viewing !== null && memories[viewing] && <MemoryViewer child={child} memories={memories} index={viewing}
      onMove={setViewing} onClose={() => { const at = viewing; setViewing(null); requestAnimationFrame(() => focusCard(at)); }} onEdit={() => openPhotos()} />}
  </section>;
}

function MemoryViewer({ child, memories, index, onMove, onClose, onEdit }: { child: Child; memories: FamilyEntry[]; index: number; onMove: (i: number) => void; onClose: () => void; onEdit: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const m = memories[index], age = ageAtPhoto(child.dateOfBirth, m.value.date);
  useEffect(() => { const d = dialog.current; if (d && !d.open) d.showModal(); }, []);
  return <dialog ref={dialog} onClose={onClose} aria-labelledby="memory-viewer-title"
    onKeyDown={e => { if (e.key === "ArrowRight" && index < memories.length - 1) onMove(index + 1); if (e.key === "ArrowLeft" && index > 0) onMove(index - 1); }}
    className="backdrop:bg-slate-900/80 bg-transparent p-0 w-full max-w-4xl max-h-[100dvh]">
    <div className="bg-surface rounded-2xl overflow-hidden m-3">
      <div className="flex items-center justify-between px-5 py-3">
        <p className="text-sm text-slate-600">{index + 1} of {memories.length}</p>
        <button aria-label="Close" onClick={() => dialog.current?.close()} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-paper-deep"><X className="w-5 h-5" /></button>
      </div>
      <img src={`/api/family-photos/${m.id}`} alt={m.value.title} className="w-full max-h-[65dvh] object-contain bg-paper-deep" />
      <div className="p-5">
        <p className="text-sm text-slate-600">{formatDate(m.value.date)}{age && <> · <span className="text-clay">{age}</span></>}</p>
        <h3 id="memory-viewer-title" className="font-heading text-2xl text-slate-850 mt-1">{m.value.title}</h3>
        {m.value.note && <p className="text-slate-700 mt-3 whitespace-pre-wrap leading-7">{m.value.note}</p>}
        <div className="flex flex-wrap items-center gap-3 mt-5">
          <button disabled={index === 0} onClick={() => onMove(index - 1)} className="rounded-full border px-4 py-2.5 text-sm disabled:opacity-40">← Earlier</button>
          <button disabled={index === memories.length - 1} onClick={() => onMove(index + 1)} className="rounded-full border px-4 py-2.5 text-sm disabled:opacity-40">Later →</button>
          <button onClick={onEdit} className="ml-auto text-clay underline text-sm py-2.5">Edit or archive in all memories</button>
        </div>
      </div>
    </div>
  </dialog>;
}
