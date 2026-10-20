import { useAppStore } from "@/stores/appStore";
import { useTodayDate } from "@/components/care/useTodayDate";
import { useHandbook } from "@/components/care/useHandbook";
import { useFamilyPlan } from "@/components/care/useFamilyPlan";
import { birthdayWithin, suggestedConversation } from "@/lib/handbook";
import { familyNavigation } from "@/lib/family-navigation";
import { HoroscopeCard } from "@/components/care/HoroscopeCard";
import { HealthUpcoming } from "@/components/care/HealthUpcoming";
import { GrowthSnapshot } from "@/components/care/GrowthSnapshot";
import { WeekGuideCard } from "@/components/WeekGuideCard";
import { observedPatterns } from "@/lib/moments";
import { OutcomeFollowUp } from "@/components/OutcomeFollowUp";
import { FamilyCheckin } from "@/components/FamilyCheckin";
import { ProgrammeToday } from "@/components/ProgrammeShelf";
import type { Child } from "@/types";

export function DashboardPage() {
  const { selectedChildId, children } = useAppStore();
  const child = children.find(c => c.id === selectedChildId);
  return child ? <Today key={child.id} child={child} /> : <p className="p-8">Select a child to see your day.</p>;
}
function Today({ child }: { child: Child }) {
  const { openAsk, openHandbook, setPage, setEditingChild } = useAppStore();
  const today = useTodayDate(), book = useHandbook(child.id), family = useFamilyPlan();
  const relevance = familyNavigation(child, today), expecting = !child.dateOfBirth && !!child.dueDate;
  const conversation = suggestedConversation(child, book.data?.progress ?? {}, today);
  const entry = conversation ? book.data?.progress[conversation.id] : undefined;
  const birthday = birthdayWithin(child, today);
  const pattern = observedPatterns(child)[0];
  const soon = new Date(Date.parse(`${today}T00:00:00Z`) + 14 * 86400000).toISOString().slice(0, 10);
  const nextEvent = family.data?.entries.filter(e => e.kind === "event" && !e.value.archived && (!e.child_id || e.child_id === child.id) && e.value.date >= today && e.value.date <= soon)
    .sort((a, b) => a.value.date.localeCompare(b.value.date))[0];
  return <div className="max-w-3xl mx-auto px-5 pt-8 md:pt-12 pb-28">
    <header className="mb-8">
      <p className="text-sm text-clay mb-3">{new Date(`${today}T12:00:00Z`).toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric", timeZone: "Asia/Kolkata" })}</p>
      <h1 className="font-heading text-4xl sm:text-5xl leading-tight">Today with {child.name}</h1>
      <p className="text-slate-600 text-lg mt-4">The words to say, when it matters.</p>
    </header>
    <section className="bg-slate-850 text-white rounded-2xl p-6 sm:p-8 mb-9">
      <h2 className="font-heading text-2xl">Need to find the words?</h2>
      <p className="text-white/80 mt-3">A hard moment, a small worry, or something you just want to talk through.</p>
      <div className="flex flex-wrap gap-4 mt-5">
        <button onClick={() => openAsk("guidance")} className="rounded-full bg-paper text-slate-850 px-5 py-3 font-medium">Help me with a moment →</button>
        <button onClick={() => openAsk("talk")} className="underline py-3">Just talk it through</button>
      </div>
    </section>
    {relevance.born && <OutcomeFollowUp childId={child.id} />}
    {relevance.born && child.age.years >= 2 && <FamilyCheckin child={child} />}
    {relevance.born && <ProgrammeToday child={child} />}
    {conversation && <section className="border-y py-7 mb-8">
      <p className="text-sm text-clay">{entry?.followUp && entry.followUp <= today ? "You wanted to come back to this" : "One conversation to make room for"}</p>
      <h2 className="font-heading text-3xl mt-3">{conversation.title}</h2>
      <p className="text-slate-700 leading-7 mt-4">“{conversation.words}”</p>
      <button className="text-clay underline py-3 mt-2" onClick={() => openHandbook(conversation.id)}>Find the words & a small next step →</button>
      <p className="text-xs text-slate-600">{entry ? "From your saved conversation choices." : "A weekly invitation based on the birth date in this profile. No deadline to complete it."}</p>
    </section>}
    {book.error && <p role="alert" className="text-sm mb-6">Your saved follow-ups could not be loaded. <button className="underline" onClick={book.reload}>Try again</button></p>}
    {nextEvent && <section className="mb-8 p-5 bg-paper-deep rounded-2xl">
      <p className="text-sm text-clay">From your family plan · {nextEvent.value.date}</p>
      <h2 className="font-heading text-2xl mt-2">{nextEvent.value.title}</h2>
      <p className="mt-3">Before the day: ask what {child.name} is looking forward to, what feels uncertain, and what help would be useful.</p>
      <button className="text-clay underline py-3" onClick={() => openAsk("guidance", `Help me prepare ${child.name} for this event I saved: ${nextEvent.value.title}. It is on ${nextEvent.value.date}. What is a short, age-appropriate way to start the conversation?`)}>Help us prepare →</button>
    </section>}
    {family.error && <p className="text-sm mb-5">Family dates could not be loaded. <button className="underline" onClick={family.reload}>Retry</button></p>}
    {expecting && <>
      <button className="w-full text-left border-y py-5 text-clay mb-6" onClick={() => setPage("pregnancy")}>Your pregnancy space: preparations, questions & support →</button>
      {child.age.pregnancyWeek && <WeekGuideCard key={child.age.pregnancyWeek} week={child.age.pregnancyWeek} />}
    </>}
    {relevance.born && <>
      <HealthUpcoming key={child.id} child={child} />
    </>}
    {birthday && <section className="border-b pb-6 mb-7"><p className="text-sm text-clay">A birthday coming up · {birthday}</p><h2 className="font-heading text-2xl mt-2">What would make it special?</h2><p className="text-slate-600 mt-3">A shared experience, something they need, or a thoughtful gift. It need not be a big spend.</p><div className="flex flex-wrap gap-5"><button className="text-clay underline py-3" onClick={() => setPage("gifts")}>Gifts & rewards →</button><button className="text-clay underline py-3" onClick={() => setPage("shop")}>Browse useful finds →</button></div><p className="text-xs text-slate-600">Some retailer links may earn Kahiye a referral fee. Buying is always optional.</p></section>}
    <section className="border-t pt-6 mb-6" aria-label={`More for ${child.name}`}>
      <h2 className="font-heading text-xl">More for {child.name}</h2>
      <ul className="mt-3 divide-y divide-slate-200">
        {relevance.born && <li><button className="w-full text-left py-3" onClick={() => setPage("safety")}>Safety & boundaries</button></li>}
        {relevance.puberty && <li><button className="w-full text-left py-3" onClick={() => setPage("puberty")}>{child.name}’s puberty guide</button></li>}
        {relevance.born && <li><button className="w-full text-left py-3" onClick={() => setPage("play")}>Ideas for play</button></li>}
        <li><button className="w-full text-left py-3" onClick={() => setPage("family-plan")}>Family dates & savings goals</button></li>
        <li><button className="w-full text-left py-3" onClick={() => setPage("parent-space")}>Room for you</button></li>
      </ul>
      {relevance.born && <details className="border-t py-3"><summary className="cursor-pointer py-1">Growth at a glance</summary><div className="pt-4"><GrowthSnapshot child={child} /></div></details>}
      {pattern && <details className="border-t py-3"><summary className="cursor-pointer py-1">Something you shared about {child.name}</summary><p className="mt-3">{pattern.situation}</p><p className="text-slate-600 mt-2">{pattern.answer}</p><p className="text-sm mt-3">An observation you shared, not a fixed description. If it has changed, you can update it.</p><button className="text-clay underline py-3" onClick={() => setEditingChild(child.id)}>Update profile</button></details>}
    </section>
    {relevance.born && <HoroscopeCard child={child} />}
    <p className="text-sm text-center text-slate-600 mt-8">Take what helps. There is no perfect-parent checklist here.</p>
  </div>;
}
