import { useState } from "react";
import { useAppStore } from "@/stores/appStore";
import { useFamilyPlan } from "@/components/care/useFamilyPlan";
import { FamilyEntryForm, actionClass } from "@/components/care/FamilyEntryForm";
import { ageAtPhoto, blankValue, memoriesFor, type FamilyEntry } from "@/lib/family-planner";
import type { Child } from "@/types";

const formatDate = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export function PhotoTimelinePage() {
  const { children, selectedChildId } = useAppStore();
  const child = children.find((c) => c.id === selectedChildId);
  // Keyed by child so a draft, filter or notice never carries over to another child.
  return child ? <PhotoTimeline key={child.id} child={child} /> : null;
}

function PhotoTimeline({ child }: { child: Child }) {
  const { setPage, photoIntent } = useAppStore();
  const { data, error, busy, reload, save } = useFamilyPlan();
  const newDraft = (title = ""): FamilyEntry => ({ id: crypto.randomUUID(), child_id: child.id, kind: "memory", revision: 0, value: { ...blankValue(), title } });
  const [draft, setDraft] = useState<FamilyEntry | null>(() => (photoIntent ? newDraft(photoIntent.title) : null)),
    [archive, setArchive] = useState(false),
    [notice, setNotice] = useState("");
  const memories = memoriesFor(data?.entries ?? [], child.id, archive).slice().reverse();
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 pb-28">
      <button className="text-clay underline py-3" onClick={() => setPage("child-profile")}>← {child.name}</button>
      <h1 className="font-heading text-4xl mt-4">{child.name}’s photo memories</h1>
      <p className="text-slate-600 mt-3 max-w-2xl">First steps, a brave beginning, an ordinary afternoon. Keep a photo and its story, just for your family.</p>
      <p className="text-sm text-slate-500 mt-2">Private to your signed-in account. Photos are never used for guidance.</p>
      <div className="flex flex-wrap gap-5 items-center my-7">
        <button disabled={!data || busy || !!draft} className={actionClass} onClick={() => { setDraft(newDraft()); setNotice(""); }}>Add a photo memory</button>
        <button className="text-sm underline py-3" onClick={() => setArchive(a => !a)}>{archive ? "Back to memories" : "Archived memories"}</button>
      </div>
      {error && <div role="alert" className="text-red-700 my-4"><p>{error}</p><button disabled={busy} className="underline py-3" onClick={reload}>Reload saved records (keep draft)</button></div>}
      {notice && <p role="status">{notice}</p>}
      {!data && !error && <p role="status">Loading your memories…</p>}
      {draft && <FamilyEntryForm key={draft.id} initial={draft} latest={data?.entries.find((e) => e.id === draft.id)} children={[child]} busy={busy}
        onCancel={() => setDraft(null)}
        onSave={async (e, file) => { await save(e, file); setDraft(null); setNotice("Your memory is saved."); }} />}
      {data && !memories.length && <div className="border-y border-clay/20 py-12 mt-8">
        <p className="font-heading text-2xl">{archive ? "Nothing archived here." : "Their story starts with a moment."}</p>
        <p className="text-slate-600 mt-3">{archive ? "Archived memories can be restored here." : "Add a favourite photo from any age. The newest appears first."}</p>
      </div>}
      <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {memories.map((e) => {
          const age = ageAtPhoto(child.dateOfBirth, e.value.date);
          return <li key={e.id} className="bg-surface rounded-2xl shadow-paper p-2">
            {e.photo_ready ? <PrivatePhoto id={e.id} title={e.value.title} />
              : <p className="bg-paper-deep p-5 rounded-xl aspect-[4/5] flex items-center">The photo upload hasn’t finished. Choose Edit / retry and select the same photo.</p>}
            <div className="px-2 pt-3 pb-2">
              <p className="text-sm text-slate-600">{formatDate(e.value.date)}{age && <> · <span className="text-clay">{age}</span></>}</p>
              <h2 className="font-heading text-xl mt-1 break-words">{e.value.title}</h2>
              {e.value.note && <p className="text-slate-600 whitespace-pre-wrap break-words mt-2 line-clamp-4">{e.value.note}</p>}
              <div className="flex gap-5 mt-2">
                <button disabled={busy || !!draft} className="text-clay underline py-3" onClick={() => setDraft(e)}>Edit{!e.photo_ready ? " / retry" : ""}</button>
                <button disabled={busy} className="underline py-3" onClick={async () => {
                  try {
                    await save({ ...e, value: { ...e.value, archived: !e.value.archived } });
                    setNotice(e.value.archived ? "Memory restored." : "Archived. Open Archived memories to restore it.");
                  } catch { /* Hook shows error */ }
                }}>{archive ? "Restore" : "Archive"}</button>
              </div>
            </div>
          </li>;
        })}
      </ul>
    </div>
  );
}
function PrivatePhoto({ id, title }: { id: string; title: string }) {
  const [failed, setFailed] = useState(false), [attempt, setAttempt] = useState(0);
  return failed ? (
    <button className="underline text-clay p-5 aspect-[4/5] w-full" onClick={() => { setFailed(false); setAttempt((n) => n + 1); }}>Photo unavailable. Try loading again</button>
  ) : (
    <img key={attempt} src={`/api/family-photos/${id}?size=thumb`} alt={title} loading="lazy" decoding="async" width={320} height={400}
      onError={() => setFailed(true)} className="w-full aspect-[4/5] object-cover rounded-xl bg-paper-deep" />
  );
}
