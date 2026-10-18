"use client";
import { useState } from "react";
import type { Child } from "@/types";
import type { GrowthEntry, CareSettings } from "@/lib/family-care";
import { ageMonths } from "@/lib/family-care";
import { childBMI } from "@/lib/child-bmi";
export function HeightRuler({ height }: { height: number | null }) {
  const top = Math.max(120, Math.ceil((height ?? 100) / 20) * 20 + 20),
    y = (n: number) => 270 - (n / top) * 240;
  return (
    <svg
      viewBox="0 0 240 300"
      role="img"
      aria-label={
        height
          ? `Height ruler: ${height} centimetres`
          : "Illustrated height ruler; no measurement yet"
      }
      className="w-full max-w-[220px] mx-auto"
    >
      <rect x="155" y="20" width="56" height="252" rx="10" fill="#e9ddc8" />
      {Array.from({ length: Math.floor(top / 10) + 1 }, (_, i) => i * 10).map(
        (n) => (
          <g key={n}>
            <line
              x1="155"
              x2={n % 20 === 0 ? 176 : 165}
              y1={y(n)}
              y2={y(n)}
              stroke="#786d5e"
            />
            {n % 20 === 0 && (
              <text x="182" y={y(n) + 4} fontSize="10" fill="#574b42">
                {n}
              </text>
            )}
          </g>
        ),
      )}
      <text x="176" y="292" fontSize="11" fill="#574b42">
        cm
      </text>
      <g
        transform={`translate(15 ${y(height ?? 90)}) scale(1 ${(((height ?? 90) / top) * 240) / 210})`}
        opacity={height ? 1 : 0.5}
      >
        <circle cx="68" cy="25" r="24" fill="#c58c66" />
        <path d="M44 22 Q44 -9 72 1 Q97 3 92 25 Q76 10 44 22" fill="#493c32" />
        <path
          d="M44 53 Q68 43 92 53 L107 115 L84 120 L87 141 L49 141 L52 120 L29 115 Z"
          fill="#a9543f"
        />
        <path
          d="M50 138 L68 138 L65 199 L48 199 Z M70 138 L87 138 L90 199 L73 199 Z"
          fill="#596c61"
        />
        <path
          d="M48 196 L64 196 L65 208 L36 208 Q35 200 48 196 M74 196 L90 196 L102 208 L74 208 Z"
          fill="#493c32"
        />
      </g>
      {height !== null && (
        <>
          <line
            x1="24"
            x2="155"
            y1={y(height)}
            y2={y(height)}
            stroke="#a9543f"
            strokeDasharray="4 4"
          />
          <circle cx="155" cy={y(height)} r="4" fill="#a9543f" />
        </>
      )}
      <line x1="25" x2="211" y1="273" y2="273" stroke="#bcb09c" />
    </svg>
  );
}
export function GrowthVisual({
  child,
  entries,
  settings,
  compact = false,
}: {
  child: Child;
  entries: GrowthEntry[];
  settings: CareSettings;
  compact?: boolean;
}) {
  const records = entries
    .filter((e) => !e.archived)
    .sort(
      (a, b) =>
        a.measured_on.localeCompare(b.measured_on) || a.id.localeCompare(b.id),
    );
  const [selected, setSelected] = useState<string | null>(null);
  const index = Math.max(
      0,
      selected
        ? records.findIndex((e) => e.id === selected)
        : records.length - 1,
    ),
    record = records[index];
  const bmi = child.dateOfBirth
    ? childBMI(record, child.dateOfBirth, settings)
    : null;
  const months =
    record && child.dateOfBirth
      ? ageMonths(child.dateOfBirth, record.measured_on)
      : null;
  const earlier = records
    .slice(0, index)
    .reverse()
    .find(
      (e) =>
        e.length_cm !== null &&
        e.method === record?.method &&
        e.measured_on !== record?.measured_on,
    );
  const delta =
    record?.length_cm && earlier?.length_cm
      ? Math.round((record.length_cm - earlier.length_cm) * 100) / 100
      : null;
  return (
    <section
      aria-label="Visual growth record"
      className="rounded-[1.75rem] bg-paper-deep p-5 sm:p-7 mb-5"
    >
      <div className="grid grid-cols-[100px_1fr] sm:grid-cols-[170px_1fr] gap-4 items-center">
        <HeightRuler height={record?.length_cm ?? null} />
        <div>
          <p className="text-sm text-clay mb-2">
            {record
              ? `${record.measured_on} · ${Math.floor((months ?? 0) / 12)}y ${(months ?? 0) % 12}m`
              : "Their story, one measurement at a time"}
          </p>
          <h2 className="font-heading text-2xl sm:text-3xl mb-4">
            {compact ? "Growing up" : `${child.name}, growing up`}
          </h2>
          <div className="flex flex-wrap gap-x-8 gap-y-4">
            <div>
              <p className="text-sm text-slate-600">
                {record?.method === "lying" ? "Length" : "Height"}
              </p>
              <p className="font-heading text-3xl">
                {record?.length_cm ?? "—"} <span className="text-sm">cm</span>
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Weight</p>
              <p className="font-heading text-3xl">
                {record?.weight_kg ?? "—"} <span className="text-sm">kg</span>
              </p>
            </div>
          </div>
          {delta !== null && (
            <p className="text-xs text-slate-600 mt-3">
              {delta > 0 ? "+" : ""}
              {delta} cm since {earlier!.measured_on}
            </p>
          )}
          {!record && (
            <p className="text-sm text-slate-600 mt-3">
              Start with a measurement from home or their health record.
            </p>
          )}
        </div>
      </div>
      {records.length > 1 && !compact && (
        <label className="block text-sm mt-3">
          Look back through {records.length} measurements
          <input
            aria-label="Measurement history"
            type="range"
            min={0}
            max={records.length - 1}
            value={index}
            onChange={(e) => setSelected(records[Number(e.target.value)].id)}
            className="block w-full my-4 accent-clay"
          />
          <span className="flex justify-between text-xs">
            <span>{records[0].measured_on}</span>
            <span>{records.at(-1)!.measured_on}</span>
          </span>
        </label>
      )}
      {
        <div className="border-t border-slate-300/60 mt-5 pt-5">
          <p className="text-sm font-medium">
            BMI for their age{" "}
            {bmi?.value !== null && bmi?.value !== undefined && (
              <span className="font-heading text-2xl ml-3">
                {bmi.value} <span className="font-sans text-xs">kg/m²</span>
              </span>
            )}
          </p>
          <p className="text-sm text-slate-600 mt-2">
            {bmi?.reason ?? "BMI begins after birth and is shown from age two."}
          </p>
          {bmi?.percentile !== null && bmi?.percentile !== undefined && (
            <div className="mt-4">
              <div
                className="relative h-2 rounded-full bg-slate-300"
                aria-hidden="true"
              >
                <span
                  className="absolute h-4 w-4 rounded-full bg-clay -top-1"
                  style={{ left: `calc(${bmi.percentile}% - 8px)` }}
                />
              </div>
              <p className="text-xs mt-3">
                About the {bmi.percentile}th percentile · CDC BMI-for-age
                reference
              </p>
            </div>
          )}
          <p className="text-xs text-slate-500 mt-3">
            BMI uses height and weight from this one record. Adult BMI ranges do
            not apply.
          </p>
          {bmi?.guidance && <div className="mt-5 border-t border-slate-300/60 pt-4">
            <h3 className="font-medium text-sm">{bmi.guidance.title}</h3>
            <p className="text-sm text-slate-600 leading-relaxed mt-2">{bmi.guidance.text}</p>
            <a className="text-xs text-clay underline inline-block mt-3" href="https://www.cdc.gov/bmi/child-teen-calculator/bmi-categories.html" target="_blank" rel="noreferrer">How child BMI ranges are interpreted ↗</a>
          </div>}
        </div>
      }
    </section>
  );
}
