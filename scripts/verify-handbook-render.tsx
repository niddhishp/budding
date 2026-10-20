// Pure SSR of real components with in-memory synthetic profiles. No effects or provider/DB calls.
import React from "react";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { useAppStore } from "../src/stores/appStore";
import { childFromRow } from "../src/lib/mappers";
import { todayDate } from "../src/lib/family-care";
import { HandbookPage } from "../src/views/HandbookPage";
import { ShareSheet } from "../src/components/ShareSheet";
import { HANDBOOK } from "../src/data/handbook";
import { DashboardPage } from "../src/views/DashboardPage";
import { AskPage } from "../src/views/AskPage";
import { SafetyBanner } from "../src/views/AskAIPage";
import { MemoryStrip } from "../src/components/child/MemoryStrip";
import { BottomNav } from "../src/components/BottomNav";
import { ChildProfilePage } from "../src/views/ChildProfilePage";
import { ProgrammePage } from "../src/views/ProgrammePage";
import { PartnerOfferList, PartnerOffers } from "../src/components/partners/PartnerOffers";
import type { PartnerOffer } from "../src/lib/partner-services";
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
    assert.equal(html.includes("A meltdown in the shop"), years === 4);
    assert.equal(html.includes("When a grandparent or a pet dies"), years === 4);
    const nav = renderToStaticMarkup(<BottomNav />);
    assert.equal((nav.match(/<button/g) ?? []).length, 5);
    for (const label of ["Today", "Ask", "Handbook", "Child", "You"]) assert(nav.includes(label));
    Object.assign(initial, { currentPage: "dashboard" });
    const dashboard = renderToStaticMarkup(<DashboardPage />);
    assert(dashboard.includes("Need to find the words?"));
    assert(dashboard.includes("The words to say, when it matters."));
    assert(dashboard.includes(`More for ${child.name}`), "Secondary destinations are grouped in one quiet section");
    assert.equal((dashboard.match(/text-clay underline/g) ?? []).length <= 4, true, "Today keeps only a few emphasised links");
    assert(!dashboard.includes("takes in more than most children"));
    assert(!dashboard.includes("A deep feeler"));
    if (years >= 3) {
      Object.assign(initial, { currentPage: "handbook", handbookCardId: years === 4 ? "money-choose" : years === 11 ? "money-wants" : "money-account" });
      const card = renderToStaticMarkup(<HandbookPage />);
      assert(card.includes("Practise the conversation"));
      assert(card.includes("Keep for later"));
      assert(card.includes("Send to grandparents or caregivers"), "Every Handbook card can be shared with caregivers");
      const shared = HANDBOOK.find(c => c.id === "tantrum-shop")!;
      const sheet = renderToStaticMarkup(<ShareSheet card={shared} childId={child.id} childName={child.name} onClose={() => {}} />);
      assert(sheet.includes(shared.title) && sheet.includes("Write the message"));
      assert(sheet.includes("every 30 days") && !sheet.includes("a month"), "The allowance is described as rolling 30 days");
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
    for (const label of ["Useful finds", "Gifts &amp; rewards", "Photo memories", "Family plan &amp; savings", "Health diary", "This season’s patterns", "Growing up, together"]) assert(childPage.includes(label), `Child page keeps ${label}`);
    assert(!childPage.includes("Journey"));
    const emptyStrip = renderToStaticMarkup(<MemoryStrip child={child} entries={[]} loading={false} />);
    assert(emptyStrip.includes("Example") && emptyStrip.includes(`Add ${child.name}’s first memory`), "An empty photo strip shows labelled example prints");
    assert(!emptyStrip.includes("/api/family-photos/"), "Examples never request a real photo");
  }
  // Partner offers: labelled with provider, fee and terms when present; nothing at all when empty.
  const child = profile(11);
  const fixture: PartnerOffer = { id: "00000000-0000-4000-8000-0000000000aa", title: "Maths circle", summary: "Small-group problem solving.", category: "tuition", moment: "always", trigger_value: null, price_label: "From Rs 1,200 a month", cta: "enquiry", url: null, online: false, provider: "Synthetic Tutors", terms_url: "https://tutors.example.invalid/terms", grievance_contact: "care@tutors.example.invalid", fee_model: "listing_fee" };
  const link: PartnerOffer = { ...fixture, id: "00000000-0000-4000-8000-0000000000ab", title: "Online reading", cta: "link", url: "https://tutors.example.invalid/reading?ref=kahiye", online: true };
  const offersHtml = renderToStaticMarkup(<PartnerOfferList offers={[fixture, link]} child={child} ageBand="9–12 years" city="Pune" heading={`For ${child.name} now`} />);
  assert.equal(offersHtml.split("Partner offer · Kahiye may earn a fee · Synthetic Tutors provides this service under its own terms").length - 1, 2, "Every offer carries the full label");
  assert.equal(offersHtml.split('href="https://tutors.example.invalid/terms"').length - 1, 2, "Every offer links the provider's own terms");
  assert(offersHtml.includes("care@tutors.example.invalid") && offersHtml.includes('href="/privacy#grievance"'), "Provider and Kahiye grievance routes");
  assert(offersHtml.includes("Kahiye is paid a listing fee by Synthetic Tutors") && offersHtml.includes("never by fee"));
  assert(offersHtml.includes("Ask Synthetic Tutors to contact you") && offersHtml.includes('rel="noopener noreferrer sponsored"'));
  assert.equal(renderToStaticMarkup(<PartnerOfferList offers={[]} child={child} ageBand={null} city={null} heading="Empty" />), "", "No offers, no section");
  assert.equal(renderToStaticMarkup(<PartnerOffers child={child} placement="child" heading="For you" />), "", "Nothing renders before offers load");
  Object.assign(initial, { children: [child], selectedChildId: child.id, currentPage: "child-profile" });
  assert(!renderToStaticMarkup(<ChildProfilePage />).includes("Partner services"), "No partner section without active offers");
  console.log("PASS: partner offers show provider, fee label, terms and grievance routes on every offer, and render nothing when there are none.");
  console.log("PASS: real Handbook/Today/Ask/Child components for ages 1, 4, 11 and 16; exactly five mobile destinations, age relevance, fiction/AI labels, preserved family tools and no fixed temperament claims.");

  // Guided programmes: age-matched in the Handbook, with a readable detail page and no paywall.
  const show = (child: ReturnType<typeof profile>, page: "handbook" | "programme", programmeId: string | null = null) => {
    Object.assign(initial, { children: [child], selectedChildId: child.id, handbookCardId: null, currentPage: page, programmeId, askIntent: null });
    return renderToStaticMarkup(page === "handbook" ? <HandbookPage /> : <ProgrammePage />);
  };
  const toddler = profile(2), shelf = show(toddler, "handbook");
  assert(shelf.includes("Guided programmes") && shelf.includes("Potty training, together"), "A 2-year-old's Handbook offers potty training");
  assert(shelf.includes("Screen-off without tears") && shelf.includes("Coming up in the next year"), "Programmes starting within a year are previewed");
  assert(!shelf.includes("Getting ready for the first period"));
  const potty = show(toddler, "programme", "potty-training");
  for (const text of ["Potty training, together", "Why this matters", "Before you start", "What you’ll do", "Day 1", "Meet the potty or toilet", "Talk to a doctor or professional if", "Clinical review pending", "Free during early access", "Immediate support"])
    assert(potty.includes(text), `Potty programme shows ${text}`);
  assert(!/Upgrade|Kahiye Plus|₹/.test(potty), "Programmes show no paywall during early access");
  const girl = profile(11), preteen = show(girl, "handbook");
  assert(preteen.includes("Getting ready for the first period") && preteen.includes("The body talk: growing up"), "An 11-year-old girl's Handbook offers the first-period and body-talk programmes");
  assert(!preteen.includes("Potty training, together"));
  const period = show(girl, "programme", "first-period");
  for (const text of ["Getting ready for the first period", "Session 1", "A school plan", "fathers can help", "soaking a pad", "Clinical review pending"]) assert(period.includes(text), `First-period programme shows ${text}`);
  const boy = childFromRow({ id: "synthetic-boy", name: "Sample boy", dob: `${Number(today.slice(0, 4)) - 11}${today.slice(4)}`, due_date: null, curiosity: 50, persistence: 50, sensitivity: 50, sociability: 50, emotional_intensity: 50, flexibility: 50, gender: "boy" });
  const boyShelf = show(boy, "handbook");
  assert(!boyShelf.includes("Getting ready for the first period") && boyShelf.includes("The body talk: growing up"), "A Boy profile is not offered the first-period programme");
  console.log("PASS: guided programmes render for a 2-year-old (potty training) and an 11-year-old girl (first period), with age-matched lists, coming-up previews, doctor lines, review labels and no paywall.");
} finally { Object.assign(initial, original); }
