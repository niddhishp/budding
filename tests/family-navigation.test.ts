import test from "node:test";
import assert from "node:assert/strict";
import {
  familyNavigation,
  pageAfterChildSwitch,
  activeNavigation,
} from "../src/lib/family-navigation";
import { navItemsForChild } from "../src/components/navItems";
import { guideBand, guidesForProfile } from "../src/data/parent-guides";
import { childFromRow, type ChildRow } from "../src/lib/mappers";

const today = "2026-10-19";
const child = (dob: string | null, path?: "girls" | "boys" | null) =>
  childFromRow({
    id: "test",
    name: "Test child",
    dob,
    due_date: dob ? null : "2027-01-01",
    curiosity: 3,
    persistence: 3,
    sensitivity: 3,
    sociability: 3,
    emotional_intensity: 3,
    flexibility: 3,
    ...(path !== undefined ? { puberty_guide: path } : {}),
  } satisfies ChildRow);

test("navigation uses birthdays: puberty preparation 8–17, Stories through 12", () => {
  for (const [dob, puberty, stories] of [
    ["2018-10-20", false, true],
    ["2018-10-19", true, true],
    ["2013-10-20", true, true],
    ["2013-10-19", true, false],
    ["2008-10-20", true, false],
    ["2008-10-19", false, false],
  ] as const)
    assert.deepEqual(familyNavigation(child(dob), today), {
      born: true,
      puberty,
      stories,
    });
  assert.deepEqual(familyNavigation(undefined, today), {
    born: false,
    puberty: false,
    stories: false,
  });
  assert.deepEqual(familyNavigation(child(null), today), {
    born: false,
    puberty: false,
    stories: false,
  });
  assert.equal(familyNavigation(child("2027-01-01"), today).born, false);
});

test("promoted spaces are direct destinations and pregnancy never inherits child-only navigation", () => {
  const items = navItemsForChild(child("2015-09-01"), today);
  for (const id of [
    "safety",
    "parent-space",
    "gifts",
    "play",
    "puberty",
    "stories",
  ])
    assert(items.some((i) => i.id === id));
  assert(items.find((i) => i.id === "puberty")?.highlight);
  assert(
    !navItemsForChild(child("2010-01-01"), today).some(
      (i) => i.id === "stories",
    ),
  );
  const expecting = navItemsForChild(child(null), today);
  assert(expecting.some((i) => i.id === "parent-space"));
  assert(
    !expecting.some((i) =>
      ["puberty", "stories", "play", "safety", "gifts"].includes(i.id),
    ),
  );
  for (const id of [
    "safety",
    "parent-space",
    "gifts",
    "play",
    "puberty",
  ] as const)
    assert.equal(activeNavigation(id), id);
  assert.equal(activeNavigation("health"), "child-profile");
  assert.equal(activeNavigation("shop"), "discover");
});

test("switching children leaves an inapplicable age-specific page, without removing the story library", () => {
  const expecting = child(null);
  for (const page of ["puberty", "stories", "safety", "gifts", "play"] as const)
    assert.equal(pageAfterChildSwitch(page, expecting), "dashboard");
  assert.equal(pageAfterChildSwitch("parent-space", expecting), "parent-space");
  assert.equal(
    pageAfterChildSwitch("child-profile", child("2000-01-01")),
    "child-profile",
  );
});

test("saved guide defaults never infer a path; girls and boys see only their guide and shared content", () => {
  assert.equal(child("2015-01-01").pubertyGuide, null);
  for (const path of ["girls", "boys"] as const) {
    assert.equal(child("2015-01-01", path).pubertyGuide, path);
    for (const months of [96, 131, 132, 167, 168, 215]) {
      const guides = guidesForProfile("puberty", guideBand(months), path);
      assert(guides.length > 0);
      assert(guides.every((g) => g.path === path || g.path === "all"));
    }
  }
  assert(
    guidesForProfile("puberty", guideBand(132), null).every(
      (g) => g.path === "all",
    ),
  );
  assert.deepEqual(
    guidesForProfile("safety", guideBand(132), "girls"),
    guidesForProfile("safety", guideBand(132), "boys"),
  );
  assert.deepEqual(guidesForProfile("puberty", null, "girls"), []);
});
