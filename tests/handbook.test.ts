import test from "node:test";
import assert from "node:assert/strict";
import { HANDBOOK, HANDBOOK_SOURCES, TRACKS } from "../src/data/handbook";
import { cardsForChild, nextConversations, handbookProgressSchema, suggestedConversation, birthdayWithin } from "../src/lib/handbook";
import type { Child } from "../src/types";
const child = (dob: string | null, due: string | null = null) => ({ dateOfBirth: dob, dueDate: due }) as Child;
const today = "2026-10-20";

test("handbook covers every born month to 18 and never invents age or pregnancy", () => {
  assert.equal(HANDBOOK.length, 34);
  assert.equal(new Set(HANDBOOK.map(c => c.id)).size, HANDBOOK.length);
  for (let months = 0; months < 216; months++) {
    const date = new Date("2026-10-20T00:00:00Z"); date.setUTCMonth(date.getUTCMonth() - months);
    const cards = cardsForChild(child(date.toISOString().slice(0, 10)), today);
    assert(cards.length >= 2);
    assert(cards.every(c => months >= c.minMonths && months <= c.maxMonths));
    if (months >= 36) assert.equal(new Set(cards.map(c => c.track)).size, TRACKS.length);
  }
  for (const dob of [null, "bad", "2026-02-30", "2027-01-01", "2008-10-20"])
    assert.deepEqual(cardsForChild(child(dob), today), []);
  assert.equal(cardsForChild(child(null, "2027-02-01"), today).length, 2);
  assert(HANDBOOK.every(c => HANDBOOK_SOURCES[c.source].url.startsWith("https://")));
});
test("birthday boundary selects the next conversation layer without an age selector", () => {
  const profile = child("2020-10-21");
  assert(cardsForChild(profile, today).some(c => c.id === "money-choose"));
  assert(cardsForChild(profile, "2026-10-21").some(c => c.id === "money-goal"));
  assert(nextConversations(profile, today).some(c => c.id === "money-goal"));
  assert(!cardsForChild(child("2023-10-20"), today).some(c => c.id === "body-consent"));
});
test("parent-chosen due dates take priority, tried cards do not become developmental scores", () => {
  const profile = child("2015-10-20");
  const state = { "money-goal": { status: "revisit" as const, followUp: today, updatedOn: today } };
  assert.equal(suggestedConversation(profile, state, today)?.id, "money-goal");
  const done = Object.fromEntries(cardsForChild(profile, today).map(c => [c.id, { status: "tried" as const, followUp: null, updatedOn: today }]));
  assert.equal(suggestedConversation(profile, done, today), undefined);
  assert.equal(handbookProgressSchema.safeParse(state).success, true);
  assert.equal(handbookProgressSchema.safeParse({ unknown: state["money-goal"] }).success, false);
  assert.equal(handbookProgressSchema.safeParse({ "money-goal": { ...state["money-goal"], followUp: "2026-02-30" } }).success, false);
  const postponed = Object.fromEntries(cardsForChild(profile, today).map(c => [c.id, { status: "revisit" as const, followUp: "2026-11-20", updatedOn: today }]));
  assert.equal(suggestedConversation(profile, postponed, today), undefined);
});
test("birthday preparation respects leap dates, year boundaries and missing DOB", () => {
  assert.equal(birthdayWithin(child("2015-01-02"), "2026-12-20"), "2027-01-02");
  assert.equal(birthdayWithin(child("2020-02-29"), "2027-02-01"), "2027-02-28");
  assert.equal(birthdayWithin(child(null), today), null);
  assert.equal(birthdayWithin(child("2015-04-01"), today), null);
});
