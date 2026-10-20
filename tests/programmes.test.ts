import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PROGRAMMES, RATING_LABELS } from "../src/data/programmes";
import { HANDBOOK_SOURCES } from "../src/data/handbook";
import { ARTICLES } from "../src/data/articles";
import { doneCount, enrolmentSchema, nextStep, programmesForChild, questionFor, ratingChange, todayProgramme, type Enrolment } from "../src/lib/programmes";
import type { Child } from "../src/types";

const today = "2026-10-21";
const child = (dob: string | null, gender: Child["gender"] = null) => ({ dateOfBirth: dob, dueDate: null, gender, pubertyGuide: null }) as Child;
const text = (value: unknown): string[] => typeof value === "string" ? [value] : Array.isArray(value) ? value.flatMap(text) : value && typeof value === "object" ? Object.values(value).flatMap(text) : [];

test("programme ids are unique, short and accepted by the database pattern", () => {
  assert.equal(new Set(PROGRAMMES.map(p => p.id)).size, PROGRAMMES.length);
  const sql = readFileSync("supabase/031_guided_programmes.sql", "utf8");
  const pattern = /programme_id ~ '([^']+)'/.exec(sql)?.[1];
  assert(pattern, "migration declares the programme id pattern");
  for (const p of PROGRAMMES) assert.match(p.id, new RegExp(pattern), `${p.id} would be refused by the database`);
  for (const id of ["potty-training", "screen-off", "first-period", "body-talk-young", "body-talk-preteen"]) assert(PROGRAMMES.some(p => p.id === id), `${id} exists`);
});

test("age ranges are valid and every step is complete", () => {
  for (const p of PROGRAMMES) {
    assert(Number.isInteger(p.minMonths) && Number.isInteger(p.maxMonths) && p.minMonths >= 0 && p.minMonths < p.maxMonths && p.maxMonths < 216, `${p.id} age range`);
    // The database bounds progress to days 1-14.
    assert(p.steps.length >= 3 && p.steps.length <= 14, `${p.id} has 3-14 steps`);
    assert(["free", "plus"].includes(p.included));
    assert(p.title && p.summary && p.why.length > 80 && p.before.length > 40, `${p.id} has a why and a before-you-start`);
    assert(p.question.includes("{name}") && /hard/i.test(p.question), `${p.id} asks a 1 (easy) to 5 (very hard) question`);
    assert.equal(new Set(p.steps.map(s => s.title)).size, p.steps.length, `${p.id} step titles are distinct`);
    for (const s of p.steps) {
      assert(s.words.length > 15 && s.activity.length > 40 && s.avoid.length > 15, `${p.id} / ${s.title} has words, activity and avoid`);
      assert(s.film === null || s.film.startsWith("https://"), `${p.id} / ${s.title} film is empty or https`);
      if (s.practice) assert(/^Help me practise /.test(s.practice), `${p.id} / ${s.title} practice opens a practice request`);
    }
  }
  // Early access: everything free, and the programmes the brief names are present with the right windows.
  assert(PROGRAMMES.every(p => p.included === "free"));
  const range = (id: string) => { const p = PROGRAMMES.find(x => x.id === id)!; return [p.minMonths, p.maxMonths, p.steps.length]; };
  assert.deepEqual(range("potty-training"), [24, 47, 7]);
  assert.deepEqual(range("screen-off"), [36, 107, 7]);
  assert.deepEqual(range("first-period"), [108, 167, 7]);
  assert.deepEqual(range("body-talk-young"), [36, 95, 7]);
  assert.deepEqual(range("body-talk-preteen"), [96, 155, 7]);
  assert.equal(PROGRAMMES.find(p => p.id === "first-period")!.unit, "session");
  assert.equal(RATING_LABELS.length, 5);
});

test("medical and safety programmes say when to get help", () => {
  const help = (id: string) => PROGRAMMES.find(p => p.id === id)!.seekHelp ?? "";
  assert.match(help("potty-training"), /doctor/i);
  assert.match(help("potty-training"), /hurts|holds in/i);
  assert.match(help("first-period"), /doctor/i);
  assert.match(help("first-period"), /heavy|pain/i);
  for (const id of ["body-talk-young", "body-talk-preteen"]) assert.match(help(id), /1098/);
  const potty = text(PROGRAMMES.find(p => p.id === "potty-training")).join(" ");
  assert.match(potty, /Indian-style toilet/);
  assert.match(potty, /night/i);
  const period = text(PROGRAMMES.find(p => p.id === "first-period")).join(" ");
  assert.match(period, /father/i);
  assert.match(period, /school/i);
});

test("sources resolve to URLs already used by the Handbook or articles", () => {
  const known = new Set([...Object.values(HANDBOOK_SOURCES).map(s => s.url), ...ARTICLES.flatMap(a => a.sources.map(s => s.url))]);
  for (const p of PROGRAMMES) {
    assert(p.sources.length >= 2, `${p.id} cites sources`);
    for (const s of p.sources) assert(known.has(s.url), `${p.id} cites an unverified URL: ${s.url}`);
  }
});

test("no labels, shame, punishment advice, diagnosis or guarantees in programme text", () => {
  const banned = /good girl|good boy|bad girl|bad boy|naughty|\blazy\b|stupid|shameful|guarantee|diagnos|\bsmack|\bslap|\bbeat (?:them|him|her)|\bspank/i;
  for (const p of PROGRAMMES) for (const line of text(p)) assert(!banned.test(line), `${p.id}: "${line}"`);
  // No invented people: placeholders only, never a made-up child's name.
  for (const p of PROGRAMMES) for (const line of text(p.steps)) assert(!/\{name\}/.test(line), `${p.id}: step text should speak to the parent, not use a placeholder`);
});

test("programmes follow the child's age and the profile's Boy/Girl detail, never an inferred one", () => {
  const ids = (c: Child) => { const { current, comingUp } = programmesForChild(c, today); return { current: current.map(p => p.id), comingUp: comingUp.map(p => p.id) }; };
  assert.deepEqual(ids(child("2024-10-21")).current, ["potty-training"]);
  assert(ids(child("2024-10-21")).comingUp.includes("screen-off"));
  const four = ids(child("2022-10-21")).current;
  assert(four.includes("potty-training") === false && four.includes("screen-off") && four.includes("body-talk-young"));
  const elevenGirl = ids(child("2015-10-21", "girl")).current, elevenBoy = ids(child("2015-10-21", "boy")).current, elevenUnknown = ids(child("2015-10-21")).current;
  assert(elevenGirl.includes("first-period") && elevenGirl.includes("body-talk-preteen"));
  assert(!elevenBoy.includes("first-period") && elevenBoy.includes("body-talk-preteen"));
  assert(elevenUnknown.includes("first-period"), "an unset profile is not assumed to be a boy");
  assert(ids(child("2018-01-21", "girl")).comingUp.includes("first-period"));
  for (const dob of [null, "bad", "2027-01-01"]) assert.deepEqual(ids(child(dob)), { current: [], comingUp: [] });
  assert.deepEqual(programmesForChild({ dateOfBirth: null, dueDate: "2027-02-01", gender: null, pubertyGuide: null }, today), { current: [], comingUp: [] });
});

test("progress helpers find the next step, finish state and one Today card", () => {
  const potty = PROGRAMMES.find(p => p.id === "potty-training")!;
  const row = (over: Partial<Enrolment>): Enrolment => ({ id: "e1", child_id: "c1", programme_id: "potty-training", started_on: today, progress: {}, baseline: 4, final: null, status: "active", created_at: `${today}T00:00:00Z`, updated_at: `${today}T00:00:00Z`, revision: 0, ...over });
  assert.equal(nextStep(row({}), potty), 1);
  assert.equal(nextStep(row({ progress: { 1: today, 3: today } }), potty), 2);
  const all = Object.fromEntries(potty.steps.map((_, i) => [String(i + 1), today]));
  assert.equal(nextStep(row({ progress: all }), potty), null);
  assert.equal(doneCount(row({ progress: all }), potty), 7);
  const pick = todayProgramme([
    row({ id: "old", programme_id: "screen-off", updated_at: "2026-10-01T00:00:00Z" }),
    row({ id: "new", updated_at: "2026-10-20T00:00:00Z", progress: { 1: today } }),
    row({ id: "done", status: "completed", final: 2, updated_at: "2026-10-21T00:00:00Z" }),
    row({ id: "unknown", programme_id: "retired-programme", updated_at: "2026-10-21T00:00:00Z" }),
  ]);
  assert.equal(pick?.enrolment.id, "new");
  assert.equal(pick?.step, 2);
  assert.equal(todayProgramme([row({ status: "stopped" })]), null);
  assert.equal(questionFor(potty, "Asha"), "How hard is potty time with Asha this week?");
  assert.equal(ratingChange(4, 2), "easier");
  assert.equal(ratingChange(2, 4), "harder");
  assert.equal(ratingChange(3, 3), "same");
  assert.equal(enrolmentSchema.safeParse(row({})).success, true);
  assert.equal(enrolmentSchema.safeParse({ ...row({}), baseline: 6 }).success, false);
});
