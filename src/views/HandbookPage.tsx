"use client";
import Link from "next/link";
import { useState } from "react";
import { useAppStore } from "@/stores/appStore";
import { HANDBOOK, HANDBOOK_SOURCES, TRACKS, type HandbookCard, type Track } from "@/data/handbook";
import { cardAgeLabel, cardsForChild, nextConversations, suggestedConversation } from "@/lib/handbook";
import { familyNavigation } from "@/lib/family-navigation";
import { CareFrame, CareError, fieldClass, buttonClass } from "@/components/care/CareFrame";
import { useHandbook } from "@/components/care/useHandbook";
import { useTodayDate } from "@/components/care/useTodayDate";
import type { Child } from "@/types";
import { GuidanceTrust } from "@/components/GuidanceTrust";
import { ShareSheet } from "@/components/ShareSheet";
import { ProgrammeShelf } from "@/components/ProgrammeShelf";

export function HandbookPage() {
  const { children, selectedChildId, handbookCardId } = useAppStore();
  const child = children.find(c => c.id === selectedChildId);
  return child ? <Handbook key={`${child.id}-${handbookCardId ?? "all"}`} child={child} /> : <p>Select a child to open their handbook.</p>;
}
function Handbook({ child }: { child: Child }) {
  const { setPage, openAsk, handbookCardId, openHandbook } = useAppStore();
  const date = useTodayDate(), book = useHandbook(child.id);
  const [track, setTrack] = useState<Track | "all">("all"), [search, setSearch] = useState(""), [savedOnly, setSavedOnly] = useState(false);
  const [followUpDraft, setFollowUp] = useState<string | null>(null), [savedMessage, setSavedMessage] = useState(""), [sharing, setSharing] = useState(false);
  const eligible = cardsForChild(child, date), relevance = familyNavigation(child, date);
  const selected = HANDBOOK.find(c => c.id === handbookCardId);
  const progress = book.data?.progress ?? {}, entry = selected ? progress[selected.id] : undefined;
  const followUp = followUpDraft ?? entry?.followUp ?? "";
  const matching = (savedOnly ? HANDBOOK.filter(c => progress[c.id]) : eligible).filter(c =>
    (track === "all" || c.track === track) && `${c.title} ${c.why} ${c.words}`.toLowerCase().includes(search.toLowerCase()));
  const next = nextConversations(child, date), suggestion = suggestedConversation(child, progress, date);
  async function update(status: "saved" | "tried" | "revisit") {
    if (!selected) return;
    if (await book.save(selected.id, { status, followUp: followUp || null, updatedOn: date })) setSavedMessage("Saved for this child.");
  }
  return <CareFrame title={`${child.name}’s handbook`} intro="A few words before you need them. Explore what fits your family, try one small thing, and come back when you want.">
    <CareError error={book.error} reload={book.reload} />
    <GuidanceTrust className="mb-6" />
    {selected ? <article>
      <button className="text-clay underline py-3" onClick={() => openHandbook()}>← All conversations</button>
      <p className="text-sm text-clay mt-5">{TRACKS.find(t => t[0] === selected.track)?.[1]} · {cardAgeLabel(selected)}</p>
      <h2 className="font-heading text-3xl sm:text-4xl mt-3">{selected.title}</h2>
      <p className="text-slate-600 leading-7 mt-4">{selected.why}</p>
      {!eligible.some(c => c.id === selected.id) && <p className="mt-4 text-sm bg-paper-deep p-4 rounded-xl">This saved conversation comes from another age range. It stays in your records; use Ask to adapt the idea to {child.name} now.</p>}
      <section className="my-8 bg-paper-deep rounded-2xl p-6 sm:p-8">
        <p className="text-sm text-clay mb-3">A way to begin</p>
        <p className="font-heading text-2xl sm:text-3xl leading-relaxed">“{selected.words}”</p>
        <p className="text-sm text-slate-600 mt-4">Say it your way. An opening, not a promise of a particular response.</p>
      </section>
      <section className="py-6 border-b"><h3 className="font-heading text-2xl">One small thing to try</h3><p className="leading-7 mt-3">{selected.activity}</p></section>
      <section className="py-6 border-b"><h3 className="font-heading text-2xl">If it goes another way</h3><p className="text-slate-600 mt-3">They might say: “{selected.resistance}”</p><p className="mt-3 leading-7">You could try: “{selected.response}”</p><p className="text-sm mt-4 text-slate-600">Leave out: {selected.avoid}</p></section>
      <div className="flex flex-wrap gap-3 py-6">
        <button className={buttonClass} onClick={() => openAsk("rehearse", `I'd like to practise the conversation "${selected.title}". Help me start.`, selected.id)}>Practise the conversation</button>
        <button className="border rounded-full px-5 py-3" onClick={() => openAsk("guidance", `Help me adapt "${selected.title}" for ${child.name}. Here is what is happening: `, selected.id)}>Make it fit our situation</button>
        <button className="text-clay underline py-3" onClick={() => setSharing(true)}>Send to grandparents or caregivers</button>
      </div>
      {sharing && <ShareSheet card={selected} childId={child.id} childName={child.name} onClose={() => setSharing(false)} />}
      <details className="py-5 border-y"><summary className="cursor-pointer font-medium">Make it work in your home</summary>
        <p className="mt-4 leading-7">Keep it short, use the language you speak at home, and leave room for silence. A drawing or a side-by-side chat can work better than direct questions. Eye contact is not required. Adapt the activity to what is affordable and accessible.</p>
        <div className="flex flex-wrap gap-3 mt-4">{["Hindi", "Hinglish"].map(language => <button key={language} className="text-clay underline py-2" onClick={() => openAsk("talk", `Help me say the opening for "${selected.title}" in natural ${language}, without jargon.`, selected.id)}>Talk this through in {language}</button>)}</div>
        <button className="text-clay underline py-2" onClick={() => openAsk("talk", `Help me draft a respectful agreement with another caregiver about "${selected.title}". Include one shared limit, the words we can use, who will help, and a review date we choose. Ask about our situation first.`, selected.id)}>Draft a caregiver agreement</button>
        <p className="text-sm text-slate-600">You review any wording. Nothing is sent to another person.</p>
      </details>
      <section className="py-8">
        <h3 className="font-heading text-2xl">Keep it for your family</h3>
        <p className="text-slate-600 mt-2">No rush to tick things off. These are your notes about trying a conversation, not a score for your child.</p>
        <label className="block mt-4 text-sm max-w-xs">An optional day to come back to this<input type="date" className={fieldClass} value={followUp} min={date} onChange={e => setFollowUp(e.target.value)} /></label>
        <div className="flex flex-wrap gap-3 mt-5">{(["saved", "tried", "revisit"] as const).map(status => <button key={status} disabled={!book.data || book.busy} aria-pressed={entry?.status === status} className={`rounded-full border px-4 py-3 disabled:opacity-50 ${entry?.status === status ? "bg-clay/10 border-clay" : ""}`} onClick={() => update(status)}>{{ saved: "Keep for later", tried: "We tried it", revisit: "Come back to it" }[status]}</button>)}</div>
        {entry && <button disabled={book.busy} className="text-sm underline py-3 mt-2" onClick={async () => { if (await book.save(selected.id, null)) setSavedMessage("Removed from your saved conversations."); }}>Remove saved status and reminder</button>}
        <p role="status" className="text-sm text-leaf mt-3">{book.busy ? "Saving…" : savedMessage}</p>
        {!book.data && !book.error && <p role="status" className="text-sm">Loading your saved conversations…</p>}
        <p className="text-xs text-slate-600 mt-3">Follow-ups appear in Today. Email and WhatsApp are not activated. These records do not become AI memory.</p>
      </section>
      <SourceNote card={selected} />
    </article> : <>
      <div className="flex flex-wrap gap-x-6 gap-y-2 border-y py-4 mb-8">
        {relevance.born && <button className="text-clay underline py-2" onClick={() => setPage("safety")}>Safety & boundaries →</button>}
        {relevance.puberty && <button className="text-clay underline py-2" onClick={() => setPage("puberty")}>{child.name}’s puberty guide →</button>}
        {relevance.born && <button className="text-clay underline py-2" onClick={() => setPage("play")}>Play & activities →</button>}
        {relevance.stories && <button className="text-clay underline py-2" onClick={() => setPage("stories")}>Stories →</button>}
        {!child.dateOfBirth && child.dueDate && <button className="text-clay underline py-2" onClick={() => setPage("pregnancy")}>Pregnancy space →</button>}
        <Link href="/articles" className="text-clay underline py-2">Articles ↗</Link>
      </div>
      {suggestion && !search && track === "all" && !savedOnly && <button className="w-full text-left bg-paper-deep rounded-2xl p-6 sm:p-8 mb-8" onClick={() => openHandbook(suggestion.id)}>
        <p className="text-sm text-clay mb-3">{progress[suggestion.id]?.followUp && progress[suggestion.id].followUp! <= date ? "You wanted to return to this" : "A conversation to make room for"}</p>
        <h2 className="font-heading text-3xl">{suggestion.title} →</h2><p className="mt-3 text-slate-600 leading-7">{suggestion.why}</p>
      </button>}
      {!search && track === "all" && !savedOnly && <ProgrammeShelf child={child} today={date} />}
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="text-sm">Find a conversation<input type="search" className={fieldClass} placeholder="Try friends, money, school…" value={search} onChange={e => setSearch(e.target.value)} /></label>
        <label className="text-sm">Explore a topic<select className={fieldClass} value={track} onChange={e => setTrack(e.target.value as Track | "all")}><option value="all">All topics</option>{TRACKS.map(t => <option key={t[0]} value={t[0]}>{t[1]}</option>)}</select></label>
      </div>
      <label className="flex items-center gap-3 py-5 text-sm"><input type="checkbox" checked={savedOnly} onChange={e => setSavedOnly(e.target.checked)} />My saved conversations, including earlier ages</label>
      <p className="text-sm text-slate-600 mb-4">{savedOnly ? "Your saved status is kept separately for each child." : "Chosen from the birth date in this profile. Age is a starting point, not a deadline."}</p>
      <div className="divide-y">{matching.map(card => <button key={card.id} className="w-full text-left py-6 grid grid-cols-[1fr_auto] gap-3 group" onClick={() => openHandbook(card.id)}>
        <span><span className="text-xs text-clay">{TRACKS.find(t => t[0] === card.track)?.[1]} · {cardAgeLabel(card)}</span><span className="block font-heading text-2xl mt-2 group-hover:text-clay">{card.title}</span><span className="block text-slate-600 mt-2">{card.why}</span>{progress[card.id] && <span className="block text-sm text-leaf mt-2">{{ saved: "Kept for later", tried: "You tried this", revisit: "To revisit" }[progress[card.id].status]}{progress[card.id].followUp ? ` · Come back ${progress[card.id].followUp}` : ""}</span>}</span><span aria-hidden="true">→</span>
      </button>)}</div>
      {!matching.length && <p className="py-6">No matching conversations here yet. Try another topic, or <button className="underline text-clay" onClick={() => openAsk("talk")}>talk it through in Ask</button>. Saved records are kept.</p>}
      {!!next.length && !savedOnly && <details className="border-y py-5 mt-8"><summary className="cursor-pointer font-heading text-xl">Coming into the next age range</summary><p className="text-sm text-slate-600 mt-3">A preview, not a timetable your child has to follow.</p>{next.map(card => <p key={card.id} className="mt-3">{card.title} <span className="text-sm text-slate-600">· {cardAgeLabel(card)}</span></p>)}</details>}
      <p className="text-xs text-slate-600 leading-6 mt-8">Kahiye editorial conversation starters, informed by linked guidance. They are not individual assessments or therapy. Clinical and safeguarding review is pending; sensitive concerns belong with a qualified professional. <Link className="underline" href="/help-now">Immediate support</Link> remains available.</p>
    </>}
  </CareFrame>;
}
function SourceNote({ card }: { card: HandbookCard }) {
  const source = HANDBOOK_SOURCES[card.source];
  return <details className="border-t pt-5 text-sm"><summary className="cursor-pointer">Where this comes from & when to get help</summary>
    <p className="mt-3 leading-6">An original Kahiye educational example, informed by general guidance. The linked source supports background principles; it has not validated this particular script. Editorial version 20 October 2026. Clinical and safeguarding review pending.</p>
    <a href={source.url} target="_blank" rel="noreferrer" className="inline-block underline text-clay py-3">{source.title} ↗</a>
    <p className="leading-6">If a difficulty persists, affects daily life or involves someone being hurt, seek support from an appropriate professional. A conversation card does not replace an assessment. For immediate danger, use <Link className="underline text-clay" href="/help-now">Immediate support</Link>.</p>
  </details>;
}
