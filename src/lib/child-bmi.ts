import reference from "@/data/cdc-bmi-lms.json";
import { ageDays, type GrowthEntry, type CareSettings } from "./family-care";
import { normalCDF } from "./growth-reference";

export function bmiBandFromZ(z: number): 'below' | 'healthy' | 'above' | 'review' {
  if (!Number.isFinite(z) || z < -3 || z >= 1.644853627) return 'review';
  if (z < -1.644853627) return 'below';
  if (z < 1.036433389) return 'healthy';
  return 'above';
}
export const bmiGuidance = {
  healthy: {
    title: 'Within the healthy-weight range for this reference',
    text: 'This measurement is at or above the 5th percentile and below the 85th for age and chart reference. It does not establish overall health. Keep supporting regular meals, enjoyable movement, sleep and routine check-ups; there is no need to aim for the middle of the chart.',
  },
  below: {
    title: 'Below the healthy-weight reference range',
    text: 'Check the height, weight and date, then discuss the result and growth over time with your paediatrician. They can consider appetite, wellbeing and medical history. Avoid setting a weight target or adding supplements based on this number alone.',
  },
  above: {
    title: 'Above the healthy-weight reference range',
    text: 'Check the measurements and discuss the growth pattern with your paediatrician. Support regular meals, enjoyable movement and sleep for the whole family. Avoid weight-loss targets, restrictive diets or comments that shame your child’s body.',
  },
  review: {
    title: 'A growth review would be helpful',
    text: 'This measurement is outside the comparison range supported here. Recheck it and arrange a paediatric review rather than interpreting this number alone. Your clinician can use the appropriate chart and consider your child’s growth history. Do not change food intake or treatment based on this card.',
  },
};
type BMIResult = { value: number | null; percentile: number | null; reason: string; guidance?: (typeof bmiGuidance)[keyof typeof bmiGuidance] };

export function ageAtDate(birth: string, date: string) {
  const b = new Date(birth + "T00:00:00Z"),
    d = new Date(date + "T00:00:00Z");
  return (
    d.getUTCFullYear() -
    b.getUTCFullYear() -
    Number(
      d.getUTCMonth() < b.getUTCMonth() ||
        (d.getUTCMonth() === b.getUTCMonth() &&
          d.getUTCDate() < b.getUTCDate()),
    )
  );
}
export function childBMI(
  entry: GrowthEntry | undefined,
  birth: string,
  settings: CareSettings,
): BMIResult {
  const unavailable = (reason: string) => ({
    value: null,
    percentile: null,
    reason,
  });
  if (!entry || entry.archived || !entry.weight_kg || !entry.length_cm)
    return unavailable(
      "Add height and weight together in one dated measurement.",
    );
  const years = ageAtDate(birth, entry.measured_on);
  if (years < 2 || years >= 20)
    return unavailable("BMI comparison is available from age 2 to 19.");
  if (entry.method !== "standing")
    return unavailable(
      "BMI needs standing height measured with weight on the same date.",
    );
  const raw = entry.weight_kg / (entry.length_cm / 100) ** 2;
  const value = Math.round(raw * 10) / 10;
  if (!Number.isFinite(raw))
    return unavailable("Check the height and weight entries.");
  if (settings.reference === "unknown" || settings.preterm)
    return {
      value,
      percentile: null,
      reason:
        "Choose the reference used by your clinician to see an age comparison. If a different reference is advised, comparison stays off.",
    };
  const months = ageDays(birth, entry.measured_on) / 30.4375;
  const bin = Math.max(24, Math.floor(months)) + 0.5;
  const row = reference[settings.reference].find((r) => r[0] === bin);
  if (!row)
    return {
      value,
      percentile: null,
      reason: "An age comparison is not available for this date.",
    };
  const [, l, m, s] = row;
  const z = l === 0 ? Math.log(raw / m) / s : ((raw / m) ** l - 1) / (l * s);
  const guidance = bmiGuidance[bmiBandFromZ(z)];
  if (!Number.isFinite(z) || z < -3 || z > 1.644853627)
    return {
      value,
      percentile: null,
      guidance,
      reason:
        "Check these measurements with your clinician; this comparison needs a different assessment.",
    };
  return {
    value,
    percentile: Math.round(normalCDF(z) * 1000) / 10,
    guidance,
    reason:
      "Compared with children of the same age and chart reference. This is not a health score or diagnosis.",
  };
}
