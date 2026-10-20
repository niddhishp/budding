import test from "node:test";
import assert from "node:assert/strict";
import { HANDBOOK, HANDBOOK_SOURCES, TRACKS } from "../src/data/handbook";
import { cardAgeLabel, cardsForChild, nextConversations, handbookProgressSchema, suggestedConversation, birthdayWithin } from "../src/lib/handbook";
import type { Child } from "../src/types";
const child = (dob: string | null, due: string | null = null) => ({ dateOfBirth: dob, dueDate: due }) as Child;
const today = "2026-10-20";

test("handbook covers every born month to 18 and never invents age or pregnancy", () => {
  assert.equal(HANDBOOK.length, 81);
  assert.equal(new Set(HANDBOOK.map(c => c.id)).size, HANDBOOK.length);
  for (let months = 0; months < 216; months++) {
    const date = new Date("2026-10-20T00:00:00Z"); date.setUTCMonth(date.getUTCMonth() - months);
    const cards = cardsForChild(child(date.toISOString().slice(0, 10)), today);
    assert(cards.length >= 2);
    assert(cards.every(c => months >= c.minMonths && months <= c.maxMonths));
    if (months >= 12) assert.equal(new Set(cards.map(c => c.track)).size, TRACKS.length);
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
  const state = { "money-wants": { status: "revisit" as const, followUp: today, updatedOn: today } };
  assert.equal(suggestedConversation(profile, state, today)?.id, "money-wants");
  const done = Object.fromEntries(cardsForChild(profile, today).map(c => [c.id, { status: "tried" as const, followUp: null, updatedOn: today }]));
  assert.equal(suggestedConversation(profile, done, today), undefined);
  assert.equal(handbookProgressSchema.safeParse(state).success, true);
  assert.equal(handbookProgressSchema.safeParse({ unknown: state["money-wants"] }).success, false);
  assert.equal(handbookProgressSchema.safeParse({ "money-wants": { ...state["money-wants"], followUp: "2026-02-30" } }).success, false);
  const postponed = Object.fromEntries(cardsForChild(profile, today).map(c => [c.id, { status: "revisit" as const, followUp: "2026-11-20", updatedOn: today }]));
  assert.equal(suggestedConversation(profile, postponed, today), undefined);
});
test("birthday preparation respects leap dates, year boundaries and missing DOB", () => {
  assert.equal(birthdayWithin(child("2015-01-02"), "2026-12-20"), "2027-01-02");
  assert.equal(birthdayWithin(child("2020-02-29"), "2027-02-01"), "2027-02-28");
  assert.equal(birthdayWithin(child(null), today), null);
  assert.equal(birthdayWithin(child("2015-04-01"), today), null);
});
test("narrower age layers separate early school years from preteens and keep something coming up", () => {
  const ids = (dob: string) => cardsForChild(child(dob), today).map(c => c.id);
  const six = ids("2020-10-20"), eleven = ids("2015-10-20"), fourteen = ids("2012-10-20"), seventeen = ids("2009-10-20");
  assert(six.includes("body-babies") && !six.includes("body-changes"));
  assert(eleven.includes("body-changes") && eleven.includes("friends-bullying") && !eleven.includes("body-babies"));
  assert(fourteen.includes("safety-image") && !fourteen.includes("family-eighteen"));
  assert(seventeen.includes("family-eighteen") && !seventeen.includes("money-scam"));
  for (const dob of ["2026-01-20", "2024-04-20", "2021-04-20", "2018-06-20", "2014-04-20", "2011-05-20"])
    assert(nextConversations(child(dob), today).length > 0, `nothing coming up for ${dob}`);
  assert.equal(cardAgeLabel(HANDBOOK.find(c => c.id === "baby-sing")!), "Under 1 year");
  assert.equal(cardAgeLabel(HANDBOOK.find(c => c.id === "toddler-stop")!), "1–2 years");
  assert.equal(cardAgeLabel(HANDBOOK.find(c => c.id === "body-babies")!), "6–8 years");
});
test("everyday moments for ages 2 to 8 reach the right children and keep every safeguard", () => {
  const ids = (dob: string) => cardsForChild(child(dob), today).map(c => c.id);
  const two = ids("2024-10-20"), four = ids("2022-10-20"), seven = ids("2019-10-20");
  assert(two.includes("potty-together") && two.includes("eating-pressure") && two.includes("new-baby-home"));
  assert(!two.includes("tantrum-shop") && !two.includes("potty-accidents"));
  for (const id of ["potty-accidents", "tantrum-shop", "hitting-biting", "siblings-fight", "bedtime-stalling", "dark-fears", "morning-rush", "screen-off", "grief-death"])
    assert(four.includes(id), `4-year-old should see ${id}`);
  assert(!four.includes("bedwetting-nights") && !four.includes("potty-together") && four.includes("truth-safe"));
  assert(ids("2023-04-20").includes("potty-together") && ids("2023-04-20").includes("potty-accidents"));
  assert(seven.includes("bedwetting-nights") && seven.includes("truth-safe") && seven.includes("siblings-fight") && !seven.includes("potty-together"));
  const added = HANDBOOK.slice(67);
  assert.equal(added.length, 14);
  for (const card of added) {
    assert(card.avoid.length > 10 && card.words.length > 10, card.id);
    assert(!/\b(NLP|diagnos\w*|guarantee\w*|smack them|naughty child)\b/i.test(Object.values(card).join(" ")), card.id);
  }
  for (const id of ["potty-accidents", "bedwetting-nights"])
    assert(/talk to your doctor if/i.test(HANDBOOK.find(c => c.id === id)!.activity), `${id} needs a doctor line`);
});
test("ages 3 to 8 articles link real Handbook cards and medical topics name when to see a doctor", async () => {
  const { ARTICLES } = await import("../src/data/articles");
  const slugs = ["potty-training-in-india", "tantrums-ages-3-to-5", "picky-eating-mealtime-pressure", "screen-time-by-age", "bedwetting-in-children", "starting-school-drop-off"];
  for (const slug of slugs) {
    const article = ARTICLES.find(a => a.slug === slug);
    assert(article, slug);
    assert(article.handbook?.length && article.handbook.every(id => HANDBOOK.some(c => c.id === id)), `${slug} links Handbook cards`);
    assert(article.sources.length >= 2 && article.sources.every(s => s.url.startsWith("https://")), slug);
  }
  for (const slug of ["potty-training-in-india", "bedwetting-in-children", "picky-eating-mealtime-pressure"])
    assert(/talk to your doctor if/i.test(ARTICLES.find(a => a.slug === slug)!.sections.map(s => s.body).join(" ")), `${slug} doctor line`);
  assert(ARTICLES.find(a => a.slug === "screen-time-by-age")!.sources.some(s => s.url.includes("who.int")));
});
