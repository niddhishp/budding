import reference from "@/data/who-infant-lms.json";
import { ageDays, type CareSettings, type GrowthEntry } from "./family-care";
export type GrowthMetric = "weight_kg" | "length_cm" | "head_cm";
const offset = { weight_kg: 0, length_cm: 3, head_cm: 6 };
export function lms(sex: "boys" | "girls", day: number, metric: GrowthMetric) {
  const row = reference[sex][day];
  return row && Number.isInteger(day)
    ? row.slice(offset[metric], offset[metric] + 3)
    : null;
}
export function referenceValue(
  sex: "boys" | "girls",
  day: number,
  metric: GrowthMetric,
  z: number,
) {
  const p = lms(sex, day, metric);
  if (!p) return null;
  const [l, m, s] = p;
  return l === 0 ? m * Math.exp(s * z) : m * Math.pow(1 + l * s * z, 1 / l);
}
// Abramowitz-Stegun normal CDF approximation, max absolute error about 7.5e-8.
export function normalCDF(z: number) {
  const x = Math.abs(z),
    t = 1 / (1 + 0.2316419 * x);
  const d = 0.3989422804014327 * Math.exp((-x * x) / 2);
  const p =
    1 -
    d *
      t *
      (0.31938153 +
        t *
          (-0.356563782 +
            t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z < 0 ? 1 - p : p;
}
export function percentile(
  entry: GrowthEntry,
  birth: string,
  settings: CareSettings,
  metric: GrowthMetric,
): number | null {
  const day = ageDays(birth, entry.measured_on),
    value = entry[metric];
  if (
    settings.reference === "unknown" ||
    settings.preterm ||
    day < 0 ||
    day > 730 ||
    value === null ||
    (metric === "length_cm" && entry.method !== "lying")
  )
    return null;
  const p = lms(settings.reference, day, metric);
  if (!p) return null;
  const [l, m, s] = p;
  const z =
    l === 0 ? Math.log(value / m) / s : (Math.pow(value / m, l) - 1) / (l * s);
  // Extreme values require measurement/clinical review, not a precise-looking percentile.
  if (!Number.isFinite(z) || Math.abs(z) > 3) return null;
  return Math.round(normalCDF(z) * 1000) / 10;
}
