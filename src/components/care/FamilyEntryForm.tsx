import { useEffect, useState } from "react";
import type { Child } from "@/types";
import {
  entryValueSchema,
  inr,
  savingsProjection,
  type FamilyEntry,
} from "@/lib/family-planner";
import { todayDate } from "@/lib/family-care";
export const fieldClass =
  "w-full border border-slate-300 rounded-xl bg-white p-3 mt-1 text-base";
export const actionClass =
  "rounded-full bg-clay text-white px-5 py-3 disabled:opacity-50";
export function FamilyEntryForm({
  initial,
  children,
  busy,
  onSave,
  onCancel,
  latest,
}: {
  initial: FamilyEntry;
  children: Child[];
  busy: boolean;
  onSave: (e: FamilyEntry, file?: File) => Promise<unknown>;
  onCancel: () => void;
  latest?: FamilyEntry;
}) {
  const [draft, setDraft] = useState(initial),
    [file, setFile] = useState<File>(),
    [preview, setPreview] = useState<string | null>(null),
    [message, setMessage] = useState("");
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  const v = draft.value,
    isGoal = draft.kind === "goal",
    isMemory = draft.kind === "memory";
  const valid = entryValueSchema.safeParse(v).success;
  const projection = isGoal && valid ? savingsProjection(v) : null;
  function update(key: keyof typeof v, value: string | number) {
    setDraft((d) => ({ ...d, value: { ...d.value, [key]: value } }));
  }
  return (
    <form
      className="border-y border-clay/30 py-7 my-6 space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setMessage("");
        if (isMemory && !draft.photo_ready && !file) {
          setMessage("Choose a photo for this memory.");
          return;
        }
        try {
          await onSave(draft, file);
        } catch {
          /* Parent preserves and displays the error. */
        }
      }}
    >
      <h2 className="font-heading text-2xl">
        {initial.revision ? "Edit" : "Add"}{" "}
        {isGoal
          ? "a savings goal"
          : isMemory
            ? "a photo memory"
            : "a family date"}
      </h2>
      <label className="block">
        For
        <select
          className={fieldClass}
          disabled={busy || initial.revision > 0}
          value={draft.child_id ?? ""}
          onChange={(e) =>
            setDraft({ ...draft, child_id: e.target.value || null })
          }
        >
          {!isMemory && <option value="">Whole family</option>}
          {children.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        {isGoal ? "What are you saving for?" : "Title"}
        <input
          required
          maxLength={100}
          className={fieldClass}
          value={v.title}
          onChange={(e) => update("title", e.target.value)}
        />
      </label>
      <label className="block">
        {isGoal ? "Target date" : isMemory ? "When was this memory?" : "Date"}
        <input
          required
          type="date"
          min={
            isMemory
              ? (children.find((c) => c.id === draft.child_id)?.dateOfBirth ??
                "1900-01-01")
              : "1900-01-01"
          }
          max={isMemory ? todayDate() : "2200-01-01"}
          className={fieldClass}
          value={v.date}
          onChange={(e) => update("date", e.target.value)}
        />
      </label>
      {!isMemory && !isGoal && (
        <label className="block">
          Kind of date
          <select
            className={fieldClass}
            value={v.category}
            onChange={(e) => update("category", e.target.value)}
          >
            {["school", "activity", "celebration", "care", "other"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
      )}
      {isMemory && !draft.photo_ready && (
        <label className="block">
          One photo
          <input
            className={fieldClass}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const selected = e.target.files?.[0];
              setFile(selected);
              setPreview(selected ? URL.createObjectURL(selected) : null);
              setMessage("");
            }}
          />
          <span className="block text-sm text-slate-600 mt-2">
            JPEG, PNG or WebP · up to 3 MB and 24 megapixels. Uploads are
            resized; keep your originals. An unfinished upload needs the same
            photo.
          </span>
        </label>
      )}
      {isMemory && draft.photo_ready && (
        <p className="text-sm text-slate-600">
          The saved photo stays with this memory. To use a different photo, add
          a new memory.
        </p>
      )}
      {preview && (
        <img
          src={preview}
          alt="Selected photo preview"
          className="w-full max-h-80 object-contain rounded-xl bg-paper-deep"
        />
      )}
      {isGoal && (
        <>
          <div className="grid sm:grid-cols-2 gap-5">
            {(
              [
                {
                  key: "cost",
                  label: "Estimated cost today (₹)",
                  max: 1e9,
                  min: 1,
                },
                {
                  key: "saved",
                  label: "Already set aside (₹)",
                  max: 1e9,
                  min: 0,
                },
                {
                  key: "monthly",
                  label: "Monthly contribution (₹)",
                  max: 1e7,
                  min: 0,
                },
              ] as const
            ).map((f) => (
              <label key={f.key}>
                {f.label}
                <input
                  className={fieldClass}
                  required
                  type="number"
                  min={f.min}
                  max={f.max}
                  step="0.01"
                  value={Number.isFinite(v[f.key]) ? v[f.key] : ""}
                  onChange={(e) =>
                    update(
                      f.key,
                      e.target.value === "" ? NaN : Number(e.target.value),
                    )
                  }
                />
              </label>
            ))}
          </div>
          <details>
            <summary className="cursor-pointer py-3 text-clay">
              Explore inflation and return assumptions
            </summary>
            <p className="text-sm text-slate-600">
              Both start at zero. These are your scenarios, not promised
              returns. Investment values can fall; fees and taxes are not
              modelled.
            </p>
            <div className="grid sm:grid-cols-2 gap-5 mt-3">
              {(
                [
                  {
                    key: "inflation",
                    label: "Annual cost inflation (%)",
                    min: 0,
                  },
                  {
                    key: "annualReturn",
                    label: "Assumed annual return (%)",
                    min: -20,
                  },
                ] as const
              ).map((f) => (
                <label key={f.key}>
                  {f.label}
                  <input
                    className={fieldClass}
                    required
                    type="number"
                    step="0.1"
                    min={f.min}
                    max={20}
                    value={Number.isFinite(v[f.key]) ? v[f.key] : ""}
                    onChange={(e) =>
                      update(
                        f.key,
                        e.target.value === "" ? NaN : Number(e.target.value),
                      )
                    }
                  />
                </label>
              ))}
            </div>
          </details>
          {projection && <SavingsResult value={projection} />}
        </>
      )}
      <label className="block">
        {isMemory ? "The story behind it (optional)" : "Notes (optional)"}
        <textarea
          maxLength={1500}
          className={fieldClass}
          rows={3}
          value={v.note}
          onChange={(e) => update("note", e.target.value)}
        />
      </label>
      {message && (
        <p role="alert" className="text-red-700">
          {message}
        </p>
      )}
      {latest && latest.revision !== draft.revision && (
        <button
          type="button"
          className="underline text-clay"
          disabled={busy}
          onClick={() => {
            setDraft(latest);
            setFile(undefined);
          }}
        >
          Replace this draft with the latest saved version
        </button>
      )}
      <div className="flex flex-wrap gap-4">
        <button disabled={busy || !valid} className={actionClass}>
          {busy ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          disabled={busy}
          className="px-4 py-3 underline"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
export function SavingsResult({
  value: p,
}: {
  value: ReturnType<typeof savingsProjection>;
}) {
  const total = Math.max(p.target, p.projected, p.contributed, 1);
  return (
    <section
      aria-label="Savings scenario"
      className="bg-paper-deep rounded-2xl p-5 space-y-3"
    >
      <p className="text-sm">
        Illustration from today · {p.months} full monthly contributions
      </p>
      <div className="flex flex-wrap gap-x-8 gap-y-3">
        <div>
          <p className="text-sm">Target cost</p>
          <p className="font-heading text-2xl">{inr(p.target)}</p>
        </div>
        <div>
          <p className="text-sm">Projected amount</p>
          <p className="font-heading text-2xl">{inr(p.projected)}</p>
        </div>
      </div>
      <div aria-hidden="true" className="space-y-2">
        <div
          className="h-3 rounded-full bg-clay"
          style={{ width: `${Math.max(1, (p.contributed / total) * 100)}%` }}
        />
        <div
          className="h-3 rounded-full bg-slate-500"
          style={{ width: `${Math.max(1, (p.projected / total) * 100)}%` }}
        />
      </div>
      <p className="text-sm">
        Your money: {inr(p.contributed)} · Assumed growth or loss:{" "}
        {inr(p.growth)}
      </p>
      <p className="text-sm">
        {p.gap > 0
          ? `Projected gap: ${inr(p.gap)}.`
          : "This scenario reaches the target."}{" "}
        {p.requiredMonthly !== null
          ? `Monthly amount needed in this scenario: ${inr(p.requiredMonthly)}.`
          : "There is no full monthly contribution before this date. Review the timing and money already available."}
      </p>
      <p className="text-xs text-slate-600">
        End-of-month contributions; effective monthly compounding. This is an
        estimate, not a return guarantee or investment recommendation. Update
        the money already saved as it changes.
      </p>
    </section>
  );
}
