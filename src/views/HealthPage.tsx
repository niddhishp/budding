"use client";
import { useState } from "react";
import type { Child } from "@/types";
import { useAppStore } from "@/stores/appStore";
import { useNotebook } from "@/components/care/useNotebook";
import {
  CareFrame,
  CareError,
  fieldClass,
  buttonClass,
} from "@/components/care/CareFrame";
import {
  healthEntrySchema,
  healthUpcoming,
  type HealthEntry,
} from "@/lib/profile-notebook";
import { todayDate } from "@/lib/family-care";
import { PartnerOffers } from "@/components/partners/PartnerOffers";
import {
  vaccines,
  HEALTH_REFERENCE_URL,
  HPV_REFERENCE_URL,
  type VaccineReference,
} from "@/data/health-reference";
const kindLabel = {
  vaccination: "Vaccination",
  medication: "Medication",
  checkup: "Check-up",
};
const statusLabel = {
  planned: "Planned",
  ongoing: "Ongoing",
  done: "Completed",
  not_applicable: "Not applicable / clinician advised",
};
export function HealthPage() {
  const child = useAppStore((s) =>
    s.children.find((c) => c.id === s.selectedChildId),
  );
  return child ? <HealthChild key={child.id} child={child} /> : null;
}
function HealthChild({ child }: { child: Child }) {
  const book = useNotebook(child.id),
    [editing, setEditing] = useState<HealthEntry | null>(null),
    [filter, setFilter] = useState("all"),
    [archived, setArchived] = useState(false),
    [message, setMessage] = useState("");
  const records = book.data?.health.value.entries ?? [];
  function add(kind: HealthEntry["kind"], ref?: VaccineReference) {
    setMessage("");
    setEditing({
      id: crypto.randomUUID(),
      kind,
      title: ref?.title ?? "",
      status: "planned",
      date: null,
      nextDate: null,
      instructions: "",
      note: ref ? `${ref.when}${ref.note ? ". " + ref.note : ""}` : "",
      referenceId: ref?.id ?? null,
      archived: false,
    });
  }
  async function save(entry: HealthEntry) {
    await book.save("health", {
      entries: [...records.filter((r) => r.id !== entry.id), entry],
    });
    setEditing(null);
    setMessage("Health record saved.");
  }
  return (
    <CareFrame
      title={`${child.name}’s health diary`}
      intro="Vaccinations, medicines and check-ups. Your family’s record, all in one place."
    >
      {!child.dateOfBirth ? (
        <p>
          Add their birth date in the child profile to start a health diary.
        </p>
      ) : (
        <>
          <CareError
            error={book.error}
            reload={() => {
              setEditing(null);
              book.reload();
            }}
          />
          {!book.data && !book.error && (
            <p role="status">Loading your diary…</p>
          )}
          {book.data && (
            <>
              <div className="flex flex-wrap gap-3 mb-5">
                {Object.entries(kindLabel).map(([key, label]) => (
                  <button
                    disabled={book.busy}
                    key={key}
                    className={buttonClass}
                    onClick={() => add(key as HealthEntry["kind"])}
                  >
                    Add {label.toLowerCase()}
                  </button>
                ))}
              </div>
              <p className="text-sm text-slate-600 mb-5">
                Copy medication instructions from your clinician or pharmacy
                label. This diary does not prescribe doses, check interactions
                or send dose reminders.
              </p>
              <p role="status" className="text-leaf mb-4">
                {message}
              </p>
              {editing && (
                <HealthForm
                  key={editing.id}
                  entry={editing}
                  born={child.dateOfBirth}
                  busy={book.busy}
                  save={save}
                  cancel={() => setEditing(null)}
                />
              )}
              <div className="flex flex-wrap items-center gap-4 border-y py-4">
                <label className="flex-1 min-w-40">
                  Show
                  <select
                    className={fieldClass}
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="all">All health records</option>
                    {Object.entries(kindLabel).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex gap-2 items-center">
                  <input
                    type="checkbox"
                    checked={archived}
                    onChange={(e) => setArchived(e.target.checked)}
                  />
                  Include archived
                </label>
              </div>
              <div className="divide-y">
                {records
                  .filter(
                    (r) =>
                      (archived || !r.archived) &&
                      (filter === "all" || r.kind === filter),
                  )
                  .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
                  .map((r) => {
                    const due = healthUpcoming([r])[0];
                    return (
                      <article key={r.id} className="py-6">
                        <p className="text-xs text-clay mb-2">
                          {kindLabel[r.kind]} ·{" "}
                          {r.archived ? "Archived" : statusLabel[r.status]}
                        </p>
                        <h2 className="font-heading text-xl">{r.title}</h2>
                        <p className="text-sm text-slate-600 mt-2">
                          {r.date
                            ? `Recorded date: ${r.date}`
                            : "Date not recorded"}
                          {due
                            ? ` · ${due.overdue ? "Planned date passed" : "Next planned"}: ${due.due}`
                            : ""}
                        </p>
                        {r.instructions && (
                          <p className="text-sm mt-3 whitespace-pre-wrap">
                            <strong>Your recorded instructions:</strong>{" "}
                            {r.instructions}
                          </p>
                        )}
                        {r.note && (
                          <p className="text-sm mt-3 whitespace-pre-wrap text-slate-600">
                            {r.note}
                          </p>
                        )}
                        <div className="flex gap-5 mt-4">
                          <button
                            className="text-clay underline"
                            disabled={book.busy}
                            onClick={() => setEditing(r)}
                          >
                            Edit
                          </button>
                          <button
                            className="underline"
                            disabled={book.busy}
                            onClick={() =>
                              void save({ ...r, archived: !r.archived }).catch(
                                () => {},
                              )
                            }
                          >
                            {r.archived ? "Restore" : "Archive"}
                          </button>
                        </div>
                      </article>
                    );
                  })}
              </div>
              {records.filter(
                (r) =>
                  (archived || !r.archived) &&
                  (filter === "all" || r.kind === filter),
              ).length === 0 && (
                <p className="py-8 text-slate-600">
                  No records here yet. Start with their vaccination card or your
                  next appointment.
                </p>
              )}
              <details className="border-t py-6 mt-6">
                <summary className="font-heading text-2xl cursor-pointer">
                  Vaccinations through the years · India
                </summary>
                <p className="text-sm text-slate-600 my-4">
                  Use this reference alongside your child’s vaccination card. An
                  empty entry means “not recorded”, not “missed”. Your clinician
                  decides eligibility, timing, additional vaccines and catch-up
                  doses. Confirm current local guidance; this is not a complete
                  individual schedule.
                </p>
                {vaccines.map((v) => {
                  const existing = records.find(
                    (r) => r.referenceId === v.id && !r.archived,
                  );
                  return (
                    <div
                      key={v.id}
                      className="border-b py-4 flex gap-4 justify-between"
                    >
                      <div>
                        <p className="text-xs text-clay">{v.when}</p>
                        <p className="mt-1 font-medium">{v.title}</p>
                        {v.note && (
                          <p className="text-xs text-slate-600 mt-1">
                            {v.note}
                          </p>
                        )}
                      </div>
                      <button
                        className="text-clay underline text-sm shrink-0 self-center"
                        disabled={book.busy}
                        onClick={() =>
                          existing
                            ? setEditing(existing)
                            : add("vaccination", v)
                        }
                      >
                        {existing
                          ? statusLabel[existing.status]
                          : "Add to diary"}
                      </button>
                    </div>
                  );
                })}
                <p className="text-xs mt-5">
                  Reference checked 18 October 2026.{" "}
                  <a
                    className="underline"
                    href={HEALTH_REFERENCE_URL}
                    target="_blank"
                    rel="noreferrer"
                  >
                    India national schedule
                  </a>{" "}
                  ·{" "}
                  <a
                    className="underline"
                    href={HPV_REFERENCE_URL}
                    target="_blank"
                    rel="noreferrer"
                  >
                    2026 HPV update
                  </a>
                </p>
              </details>
              <section className="bg-paper-deep rounded-2xl p-6 mt-4">
                <h2 className="font-heading text-2xl">Keep looking ahead</h2>
                <p className="text-sm text-slate-600 mt-3">
                  Ask your clinician about yearly health reviews, dental and
                  vision checks, and seasonal vaccines such as flu where
                  recommended. Record the next date they advise; not every
                  vaccine is annual or appropriate for every child.
                </p>
                <button
                  className="text-clay underline mt-4"
                  onClick={() => add("checkup")}
                >
                  Plan a check-up →
                </button>
              </section>
              <PartnerOffers
                child={child}
                placement="health"
                heading="Care services near you"
                intro="Some services can come to you. Your diary only decides whether these appear; nothing in it is shared with a partner. Follow your own clinician’s advice on what your child needs."
                className="mt-8"
              />
              <p className="text-xs text-slate-500 mt-6">
                Private to your account. These records are not sent to AI or
                shared with experts automatically. Dates appear in Today; no
                email or WhatsApp reminders are sent.
              </p>
            </>
          )}
        </>
      )}
    </CareFrame>
  );
}
function HealthForm({
  entry,
  born,
  busy,
  save,
  cancel,
}: {
  entry: HealthEntry;
  born: string;
  busy: boolean;
  save: (e: HealthEntry) => Promise<void>;
  cancel: () => void;
}) {
  const [draft, setDraft] = useState(entry),
    [error, setError] = useState("");
  const change = <K extends keyof HealthEntry>(key: K, value: HealthEntry[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  return (
    <form
      className="border border-clay rounded-2xl p-5 space-y-4 my-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        const parsed = healthEntrySchema.safeParse(draft);
        if (!parsed.success) {
          setError(parsed.error.issues[0].message);
          return;
        }
        if (
          (draft.date && draft.date < born) ||
          (draft.nextDate && draft.nextDate < born)
        ) {
          setError("Choose a date on or after birth.");
          return;
        }
        try {
          await save(parsed.data);
        } catch (e) {
          setError((e as Error).message);
        }
      }}
    >
      <h2 className="font-heading text-2xl">{kindLabel[draft.kind]} record</h2>
      <fieldset disabled={busy} className="space-y-4">
        <label className="block">
          Name
          <input
            autoFocus
            required
            maxLength={100}
            className={fieldClass}
            value={draft.title}
            onChange={(e) => change("title", e.target.value)}
          />
        </label>
        <label className="block">
          Status
          <select
            className={fieldClass}
            value={draft.status}
            onChange={(e) =>
              change("status", e.target.value as HealthEntry["status"])
            }
          >
            {Object.entries(statusLabel)
              .filter(([k]) => draft.kind === "medication" || k !== "ongoing")
              .map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
          </select>
        </label>
        <div className="grid sm:grid-cols-2 gap-4">
          <label>
            {draft.status === "done" ? "Completed on" : "Date / start date"}
            <input
              required={draft.status === "done"}
              type="date"
              min={born}
              max={draft.status === "done" ? todayDate() : undefined}
              className={fieldClass}
              value={draft.date ?? ""}
              onChange={(e) => change("date", e.target.value || null)}
            />
          </label>
          <label>
            Next visit / review date (optional)
            <input
              type="date"
              min={draft.date ?? born}
              className={fieldClass}
              value={draft.nextDate ?? ""}
              onChange={(e) => change("nextDate", e.target.value || null)}
            />
          </label>
        </div>
        {draft.kind === "medication" && (
          <label className="block">
            Instructions from your clinician / label
            <textarea
              maxLength={1000}
              rows={3}
              className={fieldClass}
              placeholder="Medicine name, strength, prescribed dose and timing, if you want to record them"
              value={draft.instructions}
              onChange={(e) => change("instructions", e.target.value)}
            />
          </label>
        )}
        <label className="block">
          Notes (optional)
          <textarea
            rows={3}
            maxLength={1000}
            className={fieldClass}
            value={draft.note}
            onChange={(e) => change("note", e.target.value)}
          />
        </label>
        <div className="flex gap-5">
          <button className={buttonClass}>
            {busy ? "Saving…" : "Save health record"}
          </button>
          <button type="button" className="underline" onClick={cancel}>
            Cancel
          </button>
        </div>
      </fieldset>
      {error && (
        <p role="alert" className="text-red-800">
          {error}
        </p>
      )}
    </form>
  );
}
