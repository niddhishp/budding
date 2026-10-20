// Pure SSR of real components with in-memory synthetic profiles. No effects or provider/DB calls.
import React from "react";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { useAppStore } from "../src/stores/appStore";
import { childFromRow } from "../src/lib/mappers";
import { todayDate } from "../src/lib/family-care";
import { HandbookPage } from "../src/views/HandbookPage";
import { DashboardPage } from "../src/views/DashboardPage";
import { AskPage } from "../src/views/AskPage";
import { SafetyBanner } from "../src/views/AskAIPage";
import { BottomNav } from "../src/components/BottomNav";
import { ChildProfilePage } from "../src/views/ChildProfilePage";
Object.assign(globalThis, { React });
const initial = useAppStore.getInitialState(), original = { ...initial }, today = todayDate();
const profile = (years: number) => childFromRow({
  id: `synthetic-${years}`, name: `Sample ${years}`, dob: `${Number(today.slice(0, 4)) - years}${today.slice(4)}`, due_date: null,
  curiosity: 50, persistence: 50, sensitivity: 80, sociability: 50, emotional_intensity: 50, flexibility: 50, gender: "girl",
});
try {
  const medical = renderToStaticMarkup(<SafetyBanner notice={{ level: "low", category: "medical", tier: 2, message: "Contact your clinician or pharmacist.", steps: [], helplines: [] }} onExpert={() => {}} />);
  assert(medical.includes("Contact your clinician or pharmacist."));
  assert(!medical.includes("Request a call from a child psychologist"), "Medical questions must not be redirected to a psychology callback.");
  const wellbeing = renderToStaticMarkup(<SafetyBanner notice={{ level: "elevated", category: "wellbeing_concern", tier: 2, message: "Get individual support.", steps: [], helplines: [] }} onExpert={() => {}} />);
  assert(wellbeing.includes("Request a call from a child psychologist"));
  for (const years of [1, 4, 11, 16]) {
    const child = profile(years);
    Object.assign(initial, { children: [child], selectedChildId: child.id, handbookCardId: null, currentPage: "handbook", askIntent: null });
    const html = renderToStaticMarkup(<HandbookPage />);
    assert(html.includes(`${child.name}’s handbook`));
    assert(!html.includes("Conversation age"));
    assert.equal(html.includes("Before the first phone or game chat"), years === 11);
    assert.equal(html.includes("AI can sound sure and still be wrong"), years === 16);
    assert.equal(html.includes("Sharing can start with taking turns"), years === 4);
    const nav = renderToStaticMarkup(<BottomNav />);
    assert.equal((nav.match(/<button/g) ?? []).length, 5);
    for (const label of ["Today", "Ask", "Handbook", "Child", "You"]) assert(nav.includes(label));
    Object.assign(initial, { currentPage: "dashboard" });
    const dashboard = renderToStaticMarkup(<DashboardPage />);
    assert(dashboard.includes("Need to find the words?"));
    assert(!dashboard.includes("takes in more than most children"));
    assert(!dashboard.includes("A deep feeler"));
    if (years >= 3) {
      Object.assign(initial, { currentPage: "handbook", handbookCardId: years === 4 ? "money-choose" : years === 11 ? "money-wants" : "money-account" });
      const card = renderToStaticMarkup(<HandbookPage />);
      assert(card.includes("Practise the conversation"));
      assert(card.includes("Keep for later"));
      assert(card.includes("Clinical and safeguarding review pending"));
    }
    Object.assign(initial, { currentPage: "ask-ai", askIntent: { mode: "talk", prompt: "" } });
    const talk = renderToStaticMarkup(<AskPage />);
    assert(talk.includes("Talk with Kahiye"));
    assert(talk.includes("AI support, not a human conversation"));
    Object.assign(initial, { askIntent: { mode: "rehearse", prompt: "" } });
    const practice = renderToStaticMarkup(<AskPage />);
    assert(practice.includes("A fictional practice conversation"));
    const childPage = renderToStaticMarkup(<ChildProfilePage />);
    for (const label of ["Shop for Kids", "Gifts &amp; rewards", "Photo timeline", "Family plan"]) assert(childPage.includes(label));
  }
  console.log("PASS: real Handbook/Today/Ask/Child components for ages 1, 4, 11 and 16; exactly five mobile destinations, age relevance, fiction/AI labels, preserved family tools and no fixed temperament claims.");
} finally { Object.assign(initial, original); }
