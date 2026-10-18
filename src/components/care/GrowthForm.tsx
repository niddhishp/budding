"use client";
import { useRef, useState } from "react";
import { todayDate, ageMonths, type GrowthEntry } from "@/lib/family-care";
import { careRequest } from "./useCare";
import { fieldClass, buttonClass } from "./CareFrame";
export function GrowthForm({
  childId,
  born,
  entry,
  onSaved,
  onCancel,
}: {
  childId: string;
  born: string;
  entry: GrowthEntry | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(entry?.measured_on ?? todayDate()),
    [weight, setWeight] = useState(entry?.weight_kg?.toString() ?? ""),
    [length, setLength] = useState(entry?.length_cm?.toString() ?? ""),
    [head, setHead] = useState(entry?.head_cm?.toString() ?? ""),
    [showHead, setShowHead] = useState(entry?.head_cm != null),
    [method, setMethod] = useState(
      entry?.method ?? (ageMonths(born) >= 24 ? "standing" : "lying"),
    ),
    [note, setNote] = useState(entry?.note ?? ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const receipt = useRef<string | null>(entry?.id ?? null);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    receipt.current ??= crypto.randomUUID();
    try {
      await careRequest("/api/care", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: receipt.current,
          child_id: childId,
          revision: entry?.revision ?? 0,
          measured_on: date,
          weight_kg: weight ? Number(weight) : null,
          length_cm: length ? Number(length) : null,
          head_cm: head.trim() ? Number(head) : null,
          method,
          note,
          archived: entry?.archived ?? false,
        }),
      });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={save}
      className="border border-clay rounded-2xl p-5 space-y-5 my-8"
    >
      <h2 className="font-heading text-2xl">
        {entry ? "Correct measurement" : "Add measurement"}
      </h2>
      <fieldset disabled={busy} className="space-y-5">
        <label className="block">
          Measured on
          <input
            type="date"
            autoFocus
            required
            min={born}
            max={todayDate()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={fieldClass}
          />
        </label>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            ["Weight (kg)", weight, setWeight, 0.3, 300],
            ["Length / height (cm)", length, setLength, 20, 250],
            ...(ageMonths(born, date) < 24 || showHead
              ? [["Head circumference (cm)", head, setHead, 15, 80]]
              : []),
          ].map(([label, value, set, min, max]) => (
            <label key={String(label)}>
              {String(label)}
              <input
                type="number"
                step="0.01"
                min={Number(min)}
                max={Number(max)}
                value={String(value)}
                onChange={(e) => (set as (v: string) => void)(e.target.value)}
                className={fieldClass}
              />
            </label>
          ))}
        </div>
        {ageMonths(born, date) >= 24 && !showHead && (
          <button
            type="button"
            className="text-sm underline"
            onClick={() => setShowHead(true)}
          >
            Add head circumference (if requested by clinician)
          </button>
        )}
        <label className="block">
          Length / height method
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as typeof method)}
            className={fieldClass}
          >
            <option value="lying">Lying length</option>
            <option value="standing">Standing height</option>
          </select>
        </label>
        <label className="block">
          Measurement note (optional)
          <input
            maxLength={300}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="For example: measured at the clinic"
            className={fieldClass}
          />
        </label>
        <div className="flex gap-5">
          <button className={buttonClass}>
            {busy ? "Saving…" : "Save measurement"}
          </button>
          <button type="button" onClick={onCancel} className="underline">
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
