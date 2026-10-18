"use client";
import { useRef, useState } from "react";
import { useAppStore } from "@/stores/appStore";
import { ageDays, todayDate, type GrowthEntry } from "@/lib/family-care";
import {
  percentile,
  referenceValue,
  type GrowthMetric,
} from "@/lib/growth-reference";
import {
  CareFrame,
  CareError,
  fieldClass,
  buttonClass,
} from "@/components/care/CareFrame";
import { careRequest, useCare } from "@/components/care/useCare";
const metrics = {
  weight_kg: { name: "Weight", unit: "kg" },
  length_cm: { name: "Length / height", unit: "cm" },
  head_cm: { name: "Head circumference", unit: "cm" },
};
export function GrowthPage() {
  const child = useAppStore((s) =>
    s.children.find((c) => c.id === s.selectedChildId),
  );
  return child ? <GrowthChild key={child.id} child={child} /> : null;
}
function GrowthChild({ child }: { child: import("@/types").Child }) {
  const care = useCare(child.id);
  const [metric, setMetric] = useState<GrowthMetric>("weight_kg"),
    [editing, setEditing] = useState<GrowthEntry | null>(null),
    [showForm, setShowForm] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [showArchived, setShowArchived] = useState(false),
    [busy, setBusy] = useState(false);
  const settings = care.data?.settings;
  const entries = care.data?.growth ?? [];
  const active = entries.filter((e) => !e.archived);
  const born = child.dateOfBirth;
  async function archive(entry: GrowthEntry) {
    setBusy(true);
    setError("");
    try {
      await careRequest("/api/care", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...entry, archived: !entry.archived }),
      });
      setMessage(
        entry.archived
          ? "Measurement restored."
          : "Measurement archived. Open archived measurements to undo.",
      );
      care.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <CareFrame
      title={`${child.name}’s growth`}
      intro="Keep a record to discuss with your clinician. A percentile describes a reference comparison; it is not a score, a target or a diagnosis."
    >
      {!born ? (
        <p>
          Growth measurements begin after birth. Update the birth date in the
          child profile when you are ready.
        </p>
      ) : (
        <>
          <CareError error={care.error || error} reload={()=>{setError('');care.reload();}} />
          {!care.data && !care.error && (
            <p role="status">Loading saved measurements…</p>
          )}
          {settings && (
            <>
              <section className="border-y py-6 mb-8">
                <h2 className="font-heading text-2xl mb-4">
                  Choose the reference together
                </h2>
                <p className="text-sm text-slate-600 mb-4">
                  WHO charts use separate boys’ and girls’ reference data.
                  Choose the reference used in your child’s clinical record; it
                  is never inferred from their name. This chart supports birth
                  to 730 days only.
                </p>
                <label>
                  Growth chart reference
                  <select
                    className={fieldClass}
                    disabled={care.busy}
                    value={settings.reference}
                    onChange={(e) =>
                      void care
                        .save({
                          ...settings,
                          reference: e.target
                            .value as typeof settings.reference,
                        })
                        .catch(() => {})
                    }
                  >
                    <option value="unknown">
                      Not selected · measurements only
                    </option>
                    <option value="boys">WHO boys</option>
                    <option value="girls">WHO girls</option>
                  </select>
                </label>
                <label className="flex items-start gap-3 mt-5">
                  <input
                    type="checkbox"
                    checked={settings.preterm}
                    disabled={care.busy}
                    onChange={(e) =>
                      void care
                        .save({ ...settings, preterm: e.target.checked })
                        .catch(() => {})
                    }
                  />
                  Born prematurely / clinician advises a different reference
                </label>
                <p className="text-xs text-slate-500 mt-3">
                  When selected, percentiles are withheld. Ask your clinician
                  about corrected age and the right chart. Growth records stay
                  private to your account and are not added to AI memory.
                </p>
              </section>
              <div className="flex flex-wrap gap-4 items-end justify-between mb-5">
                <label className="flex-1">
                  Measurement
                  <select
                    className={fieldClass}
                    value={metric}
                    onChange={(e) => setMetric(e.target.value as GrowthMetric)}
                  >
                    {Object.entries(metrics).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className={buttonClass}
                  onClick={() => {
                    setEditing(null);
                    setShowForm(true);
                  }}
                >
                  Add measurement
                </button>
              </div>
              <p role="status" className="text-leaf text-sm mb-4">
                {message}
              </p>
              <GrowthChart
                entries={active}
                born={born}
                settings={settings}
                metric={metric}
              />
              <p className="text-sm text-slate-600 my-5">
                Reference lines show the 3rd, 50th and 97th percentiles, not
                boundaries for health. Missing percentiles can mean age,
                measurement method, reference choice or an extreme value needs
                review. Check surprising entries with the person who measured
                your child. Trends need clinical context.
              </p>
              {showForm && (
                <GrowthForm
                  key={editing?.id ?? "new"}
                  childId={child.id}
                  born={born}
                  entry={editing}
                  onCancel={() => setShowForm(false)}
                  onSaved={() => {
                    setShowForm(false);
                    setMessage("Measurement saved.");
                    care.reload();
                  }}
                />
              )}
              <h2 className="font-heading text-2xl mt-9 mb-4">Your record</h2>
              <label className="flex gap-3 mb-4">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                />
                Include archived measurements
              </label>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <caption className="sr-only">
                    Dated measurements and reference percentiles
                  </caption>
                  <thead>
                    <tr className="border-b">
                      <th className="py-3 pr-4">Date</th>
                      <th className="pr-4">{metrics[metric].name}</th>
                      <th className="pr-4">Percentile</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries
                      .filter((e) => showArchived || !e.archived)
                      .map((e) => {
                        const pct = percentile(e, born, settings, metric);
                        return (
                          <tr key={e.id} className="border-b">
                            <th className="font-normal py-4 pr-4 whitespace-nowrap">
                              {e.measured_on}
                              {e.archived ? " · Archived" : ""}
                              <span className="block text-xs text-slate-500 whitespace-normal max-w-xs">
                                {e.note}
                              </span>
                            </th>
                            <td className="pr-4 whitespace-nowrap">
                              {e[metric] ?? "—"}{" "}
                              {e[metric] !== null ? metrics[metric].unit : ""}
                            </td>
                            <td>
                              {e.archived
                                ? "—"
                                : pct === null
                                  ? "Not shown"
                                  : `${pct}th`}
                            </td>
                            <td>
                              <div className="flex gap-4">
                                <button
                                  className="underline"
                                  disabled={busy}
                                  onClick={() => {
                                    setEditing(e);
                                    setShowForm(true);
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  className="underline"
                                  disabled={busy}
                                  onClick={() => void archive(e)}
                                >
                                  {e.archived ? "Undo archive" : "Archive"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
              {entries.length === 0 && (
                <p className="py-8">
                  No measurements yet. Start with a measurement from your
                  child’s health record.
                </p>
              )}
              <a
                className="block text-clay underline mt-6 text-sm"
                href="https://www.cdc.gov/growth-chart-training/hcp/computer-programs/sas-who.html"
                target="_blank"
                rel="noreferrer"
              >
                WHO reference data and calculation method, published by CDC ↗
              </a>
            </>
          )}
        </>
      )}
    </CareFrame>
  );
}
function GrowthChart({
  entries,
  born,
  settings,
  metric,
}: {
  entries: GrowthEntry[];
  born: string;
  settings: import("@/lib/family-care").CareSettings;
  metric: GrowthMetric;
}) {
  const points = entries
    .filter((e) => e[metric] !== null && ageDays(born, e.measured_on) >= 0)
    .map((e) => ({
      day: ageDays(born, e.measured_on),
      value: e[metric]!,
      method: e.method,
    }));
  const compare = settings.reference !== "unknown" && !settings.preterm;
  const maxDay = Math.max(180, ...points.map((p) => p.day));
  const curves = compare
    ? [-1.880793608, 0, 1.880793608].map((z) =>
        Array.from(
          { length: Math.floor(Math.min(730, maxDay) / 10) + 1 },
          (_, i) => ({
            day: i * 10,
            value: referenceValue(
              settings.reference as "boys" | "girls",
              i * 10,
              metric,
              z,
            )!,
          }),
        ),
      )
    : [];
  const vals = [
    ...points.map((p) => p.value),
    ...curves.flat().map((p) => p.value),
  ];
  if (!vals.length)
    return (
      <div className="border rounded-2xl px-6 py-12 text-center text-slate-500">
        Your chart will appear after a measurement or reference choice.
      </div>
    );
  const lo = Math.max(0, Math.min(...vals) * 0.9),
    hi = Math.max(...vals) * 1.1;
  const x = (d: number) => 55 + (d / maxDay) * 680,
    y = (v: number) => 260 - ((v - lo) / (hi - lo)) * 220;
  const path = (p: { day: number; value: number }[]) =>
    p.map((v, i) => `${i ? "L" : "M"}${x(v.day)},${y(v.value)}`).join(" ");
  return (
    <figure className="bg-paper-deep rounded-2xl p-3 sm:p-6">
      <svg
        viewBox="0 0 780 310"
        role="img"
        aria-label={`${metrics[metric].name} over age; values are also listed in the record table`}
        className="w-full"
      >
        <title>{metrics[metric].name} over time</title>
        {[0, 1, 2, 3, 4].map((i) => {
          const v = lo + ((hi - lo) * i) / 4;
          return (
            <g key={i}>
              <line x1="55" x2="735" y1={y(v)} y2={y(v)} stroke="#d8d0c5" />
              <text
                x="48"
                y={y(v) + 4}
                textAnchor="end"
                fontSize="12"
                fill="#574b42"
              >
                {v.toFixed(1)}
              </text>
            </g>
          );
        })}
        {curves.map((p, i) => (
          <path
            key={i}
            d={path(p)}
            fill="none"
            stroke={i === 1 ? "#698064" : "#9da993"}
            strokeWidth={i === 1 ? 2 : 1}
            strokeDasharray={i === 1 ? undefined : "5 5"}
          />
        ))}
        <path d={path(points)} fill="none" stroke="#aa553c" strokeWidth="2" />
        {points.map((p, i) => (
          <circle key={i} cx={x(p.day)} cy={y(p.value)} r="5" fill="#aa553c">
            <title>
              {p.day} days · {p.value} {metrics[metric].unit}
              {metric === "length_cm" ? ` · ${p.method}` : ""}
            </title>
          </circle>
        ))}
        {[0, 1, 2, 3, 4].map((i) => (
          <text
            key={i}
            x={x((maxDay * i) / 4)}
            y="285"
            textAnchor="middle"
            fontSize="12"
            fill="#574b42"
          >
            {((maxDay * i) / 4 / 30.4375).toFixed(1)}m
          </text>
        ))}
      </svg>
      <figcaption className="text-xs text-slate-600">
        Clay dots: your records
        {compare ? ' · Green: WHO reference through two years (lower: 3rd, middle: 50th, upper: 97th)' : ' · Reference comparison is off'}
        {metric === "length_cm"
          ? " (lying length only; standing measurements are not comparable)"
          : ""}
        . Age in months on the horizontal axis.
      </figcaption>
    </figure>
  );
}
function GrowthForm({
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
    [method, setMethod] = useState(entry?.method ?? "lying"),
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
          head_cm: head ? Number(head) : null,
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
            ["Head circumference (cm)", head, setHead, 15, 80],
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
