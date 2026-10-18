import { useState } from "react";
import { useAppStore } from "@/stores/appStore";
import { useFamilyPlan } from "@/components/care/useFamilyPlan";
import {
  FamilyEntryForm,
  actionClass,
} from "@/components/care/FamilyEntryForm";
import { blankValue, type FamilyEntry } from "@/lib/family-planner";
export function PhotoTimelinePage() {
  const { children, selectedChildId, setPage } = useAppStore();
  const child = children.find((c) => c.id === selectedChildId);
  const { data, error, busy, reload, save } = useFamilyPlan();
  const [draft, setDraft] = useState<FamilyEntry | null>(null),
    [archive, setArchive] = useState(false),
    [notice, setNotice] = useState("");
  if (!child) return null;
  const memories = (data?.entries ?? [])
    .filter(
      (e) =>
        e.kind === "memory" &&
        e.child_id === child.id &&
        e.value.archived === archive,
    )
    .sort(
      (a, b) =>
        a.value.date.localeCompare(b.value.date) || a.id.localeCompare(b.id),
    );
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-10 pb-28">
      <button
        className="text-clay underline py-3"
        onClick={() => setPage("child-profile")}
      >
        ← Child profile
      </button>
      <p className="text-sm text-clay mt-5">
        The moments you’ll want to remember
      </p>
      <h1 className="font-heading text-4xl mt-3">
        {child.name}’s photo timeline
      </h1>
      <p className="text-slate-600 mt-4">
        First steps, a brave beginning, an ordinary afternoon. Keep one
        photograph and its story, just for your family.
      </p>
      <p className="text-sm text-slate-500 mt-3">
        Private to your signed-in account. Photos are not used for AI guidance.
        Video creation and social sharing are not available yet.
      </p>
      <div className="flex flex-wrap gap-5 items-center my-7">
        <button
          disabled={!data || busy || !!draft}
          className={actionClass}
          onClick={() => {
            setDraft({
              id: crypto.randomUUID(),
              child_id: child.id,
              kind: "memory",
              revision: 0,
              value: blankValue(),
            });
            setNotice("");
          }}
        >
          Add a photo memory
        </button>
        <label className="text-sm flex items-center gap-2">
          <input
            type="checkbox"
            checked={archive}
            onChange={(e) => setArchive(e.target.checked)}
          />
          Show archived
        </label>
      </div>
      {error && (
        <div role="alert" className="text-red-700 my-4">
          <p>{error}</p>
          <button disabled={busy} className="underline py-3" onClick={reload}>
            Reload saved records (keep draft)
          </button>
        </div>
      )}
      {notice && <p role="status">{notice}</p>}
      {!data && !error && <p role="status">Loading your memories…</p>}
      {draft && (
        <FamilyEntryForm
          key={draft.id}
          initial={draft}
          latest={data?.entries.find((e) => e.id === draft.id)}
          children={[child]}
          busy={busy}
          onCancel={() => setDraft(null)}
          onSave={async (e, file) => {
            await save(e, file);
            setDraft(null);
            setNotice("Your memory is saved.");
          }}
        />
      )}
      {data && !memories.length && (
        <div className="border-y border-clay/20 py-12 mt-8">
          <p className="font-heading text-2xl">
            {archive
              ? "Nothing archived here."
              : "Their story starts with a moment."}
          </p>
          <p className="text-slate-600 mt-3">
            {archive
              ? "Archived memories can be restored here."
              : "Add a favourite photo from any age. Memories will appear in date order, from earliest to latest."}
          </p>
        </div>
      )}
      <ol className="border-l border-clay/25 ml-2 mt-10 space-y-12">
        {memories.map((e) => (
          <li key={e.id} className="pl-5 sm:pl-8 relative">
            <span className="absolute w-3 h-3 rounded-full bg-clay -left-1.5 top-1" />
            <p className="text-sm text-clay">{e.value.date}</p>
            <h2 className="font-heading text-2xl mt-2 break-words">
              {e.value.title}
            </h2>
            {e.photo_ready ? (
              <PrivatePhoto id={e.id} title={e.value.title} />
            ) : (
              <p className="bg-paper-deep p-5 rounded-xl my-4">
                The photo upload hasn’t finished. Choose Edit / retry and select
                the same photo.
              </p>
            )}
            <p className="text-slate-600 whitespace-pre-wrap break-words mt-4">
              {e.value.note}
            </p>
            <div className="flex gap-5 mt-3">
              <button
                disabled={busy || !!draft}
                className="text-clay underline py-3"
                onClick={() => setDraft(e)}
              >
                Edit{!e.photo_ready ? " / retry" : ""}
              </button>
              <button
                disabled={busy}
                className="underline py-3"
                onClick={async () => {
                  try {
                    await save({
                      ...e,
                      value: { ...e.value, archived: !e.value.archived },
                    });
                    setNotice(
                      e.value.archived
                        ? "Memory restored."
                        : "Archived. Turn on Show archived to restore it.",
                    );
                  } catch {
                    /* Hook shows error */
                  }
                }}
              >
                {archive ? "Restore" : "Archive"}
              </button>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
function PrivatePhoto({ id, title }: { id: string; title: string }) {
  const [failed, setFailed] = useState(false),
    [retry, setRetry] = useState(0);
  return failed ? (
    <button
      className="underline text-clay p-5"
      onClick={() => {
        setFailed(false);
        setRetry((n) => n + 1);
      }}
    >
      Photo unavailable. Try loading again
    </button>
  ) : (
    <img
      key={retry}
      src={`/api/family-photos/${id}?retry=${retry}`}
      alt={title}
      loading="lazy"
      onError={() => setFailed(true)}
      className="w-full max-h-[620px] object-contain rounded-2xl bg-paper-deep mt-4"
    />
  );
}
