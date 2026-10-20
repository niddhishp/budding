import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import {
  blankValue,
  familyEntrySchema,
  monthsUntil,
  nextBirthday,
  savingsProjection,
} from "../src/lib/family-planner";
import { prepareFamilyPhoto, photoPath } from "../src/lib/family-photo";
test("monthly contributions respect anniversaries, leap dates and expired goals", () => {
  assert.equal(monthsUntil("2027-01-18", "2026-10-18"), 3);
  assert.equal(monthsUntil("2027-01-17", "2026-10-18"), 2);
  assert.equal(monthsUntil("2026-02-28", "2026-01-31"), 1);
  assert.equal(monthsUntil("2025-02-28", "2024-02-29"), 12);
  assert.equal(monthsUntil("2026-10-17", "2026-10-18"), 0);
  assert.equal(nextBirthday("2020-02-29", "2026-01-01"), "2026-02-28");
  assert.equal(nextBirthday("2010-10-18", "2026-10-18"), "2026-10-18");
});
test("savings scenarios separate contributions and growth and handle losses/zero periods", () => {
  const v = {
    ...blankValue(),
    date: "2027-10-18",
    cost: 120000,
    saved: 12000,
    monthly: 4000,
  };
  const zero = savingsProjection(v, "2026-10-18");
  assert.equal(zero.months, 12);
  assert.equal(zero.projected, 60000);
  assert.equal(zero.requiredMonthly, 9000);
  assert.equal(zero.gap, 60000);
  const rate = 1.12 ** (1 / 12) - 1;
  let manual = 12000;
  for (let i = 0; i < 12; i++) manual = manual * (1 + rate) + 4000;
  const growth = savingsProjection(
    { ...v, annualReturn: 12, inflation: 6 },
    "2026-10-18",
  );
  assert(Math.abs(manual - growth.projected) < 0.00001);
  assert(growth.target > 120000);
  assert(growth.growth > 0);
  assert(
    savingsProjection({ ...v, annualReturn: -10 }, "2026-10-18").growth < 0,
  );
  const soon = savingsProjection({ ...v, date: "2026-10-20" }, "2026-10-18");
  assert.equal(soon.months, 0);
  assert.equal(soon.requiredMonthly, null);
  assert.equal(soon.projected, 12000);
});
test("family entry validation rejects cross-kind data, invalid dates and unreasonable amounts", () => {
  const e = {
    id: "a0000000-0000-4000-8000-000000000001",
    child_id: null,
    kind: "goal",
    revision: 0,
    value: { ...blankValue(), title: "Education", cost: 1000 },
  };
  assert(familyEntrySchema.safeParse(e).success);
  for (const patch of [
    { cost: -1 },
    { saved: Infinity },
    { monthly: 1e10 },
    { date: "2026-02-30" },
    { annualReturn: 25 },
  ])
    assert(
      !familyEntrySchema.safeParse({ ...e, value: { ...e.value, ...patch } })
        .success,
    );
  assert(!familyEntrySchema.safeParse({ ...e, kind: "memory" }).success);
  assert(!familyEntrySchema.safeParse({ ...e, kind: "event" }).success);
});
test("photo processing strips metadata, bounds resolution and rejects unsafe formats", async () => {
  const original = await sharp({
    create: { width: 2000, height: 1200, channels: 3, background: "#ac634d" },
  })
    .jpeg()
    .withMetadata()
    .toBuffer();
  const processed = await prepareFamilyPhoto(original),
    meta = await sharp(processed.photo).metadata();
  assert.equal(meta.width, 1600);
  assert.equal(meta.exif, undefined);
  assert.equal(meta.icc, undefined);
  assert.equal(meta.format, "jpeg");
  assert.equal((await prepareFamilyPhoto(original)).hash, processed.hash);
  await assert.rejects(
    prepareFamilyPhoto(
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>',
      ),
    ),
  );
  await assert.rejects(prepareFamilyPhoto(Buffer.alloc(3 * 1024 * 1024 + 1)));
  assert.equal(
    photoPath("owner", "entry", processed.hash),
    `owner/entry-${processed.hash}.jpg`,
  );
});
test("photo memories are per child, ordered oldest first and labelled with the child's age then", async () => {
  const { memoriesFor, ageAtPhoto } = await import("../src/lib/family-planner");
  const memory = (id: string, child: string, date: string, archived = false) =>
    ({ id, child_id: child, kind: "memory", revision: 1, photo_ready: true, value: { title: id, date, note: "", archived } }) as never;
  const entries = [memory("b", "c1", "2024-05-01"), memory("a", "c1", "2024-05-01"), memory("z", "c1", "2023-01-01"),
    memory("x", "c2", "2022-01-01"), memory("old", "c1", "2020-01-01", true),
    { id: "e", child_id: "c1", kind: "event", revision: 1, value: { title: "e", date: "2021-01-01" } } as never];
  assert.deepEqual(memoriesFor(entries, "c1").map(e => e.id), ["z", "a", "b"]);
  assert.deepEqual(memoriesFor(entries, "c1", true).map(e => e.id), ["old"]);
  assert.equal(ageAtPhoto("2020-03-15", "2020-03-20"), "Newborn");
  assert.equal(ageAtPhoto("2020-03-15", "2021-01-14"), "9 mo");
  assert.equal(ageAtPhoto("2020-03-15", "2022-03-15"), "2 yrs");
  assert.equal(ageAtPhoto("2020-03-15", "2024-07-20"), "4 yrs 4 mo");
  assert.equal(ageAtPhoto("2020-03-15", "2019-01-01"), null);
  assert.equal(ageAtPhoto(null, "2024-01-01"), null);
});
test("memory thumbnails are small private copies with stable owner-scoped names", async () => {
  const sharp = (await import("sharp")).default;
  const { makeThumbnail, thumbPath, photoPath, THUMB_WIDTH } = await import("../src/lib/family-photo");
  const photo = await sharp({ create: { width: 1600, height: 1200, channels: 3, background: "#c96" } }).jpeg().toBuffer();
  const { thumb, width, height } = await makeThumbnail(photo);
  assert.equal(width, THUMB_WIDTH);
  assert.equal(height, 480);
  assert.equal((await sharp(thumb).metadata()).format, "webp");
  assert(thumb.length < photo.length);
  assert.equal(thumbPath("u", "i", "h"), "u/i-h-thumb.webp");
  assert.equal(photoPath("u", "i", "h"), "u/i-h.jpg");
});
