import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { childBMI } from "../src/lib/child-bmi";
import { DEFAULT_CARE, type GrowthEntry } from "../src/lib/family-care";
import {
  healthSchema,
  healthUpcoming,
  emptyInterests,
  interestsSchema,
  interestBand,
  type HealthEntry,
} from "../src/lib/profile-notebook";
import { interestAreas, scenes } from "../src/data/interest-exploration";
import reference from "../src/data/cdc-bmi-lms.json";
const record: GrowthEntry = {
  id: "a0000000-0000-4000-8000-000000000001",
  child_id: "a0000000-0000-4000-8000-000000000002",
  revision: 0,
  measured_on: "2026-01-01",
  weight_kg: 16.54777487,
  length_cm: 100,
  head_cm: null,
  method: "standing",
  note: "",
  archived: false,
};
test("CDC BMI source is pinned and independently published percentile columns match calculation", () => {
  const raw = readFileSync("data/reference/cdc-bmi-age.csv");
  assert.equal(
    createHash("sha256").update(raw).digest("hex"),
    readFileSync("data/reference/cdc-bmi-age.sha256", "utf8").split(" ")[0],
  );
  const rows = raw
    .toString()
    .trim()
    .split(/\r?\n/)
    .filter((r) => !r.startsWith("Sex,"))
    .map((r) => r.split(",").map(Number));
  for (const sex of ["boys", "girls"] as const) {
    assert.equal(reference[sex].length, 219);
    for (const month of [24.5, 60.5, 132.5, 216.5]) {
      const row = rows.find(
        (r) => r[0] === (sex === "boys" ? 1 : 2) && r[1] === month,
      )!;
      const date = new Date(
        Date.UTC(2000, 0, 1) + Math.round(month * 30.4375) * 86400000,
      )
        .toISOString()
        .slice(0, 10);
      for (const [column, pct] of [
        [6, 5],
        [9, 50],
        [11, 85],
      ])
        assert.ok(
          Math.abs(
            childBMI(
              { ...record, measured_on: date, weight_kg: row[column] },
              "2000-01-01",
              { ...DEFAULT_CARE, reference: sex },
            ).percentile! - pct,
          ) < 0.2,
        );
    }
  }
});
test("BMI requires supported age and a single complete standing measurement; reference is never inferred", () => {
  const settings = { ...DEFAULT_CARE, reference: "boys" as const };
  assert.equal(childBMI(record, "2024-01-01", settings).percentile, 50);
  assert.equal(childBMI(record, "2024-01-02", settings).value, null);
  assert.equal(childBMI(record, "2006-01-01", settings).value, null);
  assert.notEqual(childBMI(record, "2006-01-02", settings).value, null);
  for (const changed of [
    { weight_kg: null },
    { length_cm: null },
    { method: "lying" as const },
    { archived: true },
  ])
    assert.equal(
      childBMI({ ...record, ...changed }, "2024-01-01", settings).value,
      null,
    );
  assert.equal(childBMI(record, "2024-01-01", DEFAULT_CARE).percentile, null);
  assert.equal(
    childBMI(record, "2024-01-01", { ...settings, preterm: true }).percentile,
    null,
  );
  assert.equal(
    childBMI({ ...record, weight_kg: 100 }, "2024-01-01", settings).percentile,
    null,
  );
});
const health: HealthEntry = {
  id: record.id,
  kind: "vaccination",
  title: "Example",
  status: "planned",
  date: "2026-10-20",
  nextDate: null,
  instructions: "",
  note: "",
  referenceId: null,
  archived: false,
};
test("health dates and duplicates are validated; unknown is never turned into overdue", () => {
  assert.equal(healthSchema.safeParse({ entries: [health] }).success, true);
  for (const entries of [
    [health, health],
    [{ ...health, status: "done", date: null }],
    [{ ...health, status: "done", date: "2099-01-01" }],
    [{ ...health, date: "2026-02-30" }],
    [{ ...health, nextDate: "2026-10-01" }],
    [{ ...health, status: "ongoing" }],
  ])
    assert.equal(healthSchema.safeParse({ entries }).success, false);
  assert.deepEqual(
    healthUpcoming([{ ...health, date: null }], "2026-10-18"),
    [],
  );
  assert.equal(healthUpcoming([health], "2026-10-21")[0].overdue, true);
  assert.deepEqual(
    healthUpcoming([
      { ...health, archived: true },
      { ...health, status: "not_applicable" },
    ]),
    [],
  );
  assert.equal(
    healthUpcoming([
      { ...health, status: "done", date: "2026-01-01", nextDate: "2027-01-01" },
    ])[0].due,
    "2027-01-01",
  );
});
test("interest exploration allows skipping, multiple interests and all age bands without talent scores", () => {
  assert.equal(interestsSchema.safeParse(emptyInterests).success, true);
  assert.equal(
    interestsSchema.safeParse({
      ...emptyInterests,
      answers: [[], ["art", "music"], []],
    }).success,
    true,
  );
  assert.equal(
    interestsSchema.safeParse({ ...emptyInterests, selected: ["art", "art"] })
      .success,
    false,
  );
  assert.equal(
    interestsSchema.safeParse({ ...emptyInterests, answers: [["unknown"]] })
      .success,
    false,
  );
  assert.deepEqual([0, 3, 6, 12].map(interestBand), [
    "baby",
    "preschool",
    "school",
    "teen",
  ]);
  for (const area of interestAreas)
    for (const band of ["baby", "preschool", "school", "teen"] as const)
      assert.ok(area.ideas[band].length > 40);
  for (const prompts of Object.values(scenes)) assert.equal(prompts.length, 3);
});
