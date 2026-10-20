# Fair charging, a higher free allowance, and the evidence check-in

20 October 2026. The owner asked the CCTO to decide on four questions. These are the decisions and what shipped.

## Decisions

1. **Charging when the explanation is missing.** An Ask answer counts once a parent has received what they came for.
   - **Parent left after "Say this":** they got the words, so the turn still counts. Saved with `analysis.detailCancelled`.
   - **Kahiye could not write or check the explanation:** the turn does **not** count. Saved with `analysis.detailUnavailable`. The parent sees "More detail isn't available for this one. It did not use one of your Ask turns."
2. **"Talk to a professional if" moves into the first, checked stage.** `seekHelpIf` is now written and reviewed with "Say this", so safety information never depends on the second stage. The explanation stage is told not to contradict or soften it. It costs a few extra tokens in stage A.
3. **Free allowance goes from 3 to 10 Ask turns a week while paid plans are not open.** At 3 a week, with no way to pay, the free plan capped the very behaviour Kahiye needs to measure.
   - **Cost bounds:** the existing daily processing ceiling (20 attempts on Free) and the two-concurrent limit still apply.
   - **Cost estimate:** the 20 October live-model evaluation returned about USD 1.38 of usage across 70 scenario runs. That is roughly ₹2 per Ask. It is a small mixed sample, not a production measurement.
   - **Revisit when checkout opens.**
4. **A fortnightly outcome check-in.** This is the evidence the deck and research call for: whether evenings get easier, not just whether the app is used.

## What shipped

**Migration 029 (`029_fair_allowance.sql`).** It patches `reserve_guidance` with the same guarded text replacement used by 017, 018 and 025, and aborts if the live definition is unexpected.
- The usage count excludes `analysis->>'detailUnavailable'`.
- The decode limit is 10 for Free (Plus stays 10 a day).
- `getEntitlement` applies the same exclusion, so the "turns left" figure matches.

**Two-stage Ask (`src/lib/ai/decode.ts`).**
- `seekHelpIf` is now in the immediate stage.
- `combineStages` records which case applies: `failed` (not counted) or `cancelled` (counted). It decides from whether the request signal was aborted.
- The UI shows "Talk to a professional if" as soon as the first stage arrives.

**Migration 030 (`030_family_checkins.sql`).**
- **The `family_checkins` table** holds one row per check-in: the child, a band of hard evenings in the last 7 days (`0`, `1-2`, `3-4`, `5+`) and parent confidence (1–5).
  - **Who can read it:** parents read their own rows only, under row-level security.
  - **How it is written:** only through `record_family_checkin`. That function requires consent and child ownership, makes retries return the saved row, and allows one check-in per child per 10 days.
- **`parent_checkin_metrics()`** is service-role only. It compares each child's first check-in with their latest one at least 28 days later, and reports:
  - families who checked in
  - families with a follow-up
  - the share with fewer hard evenings
  - the share with more hard evenings
  - the share of parents who feel more confident

  It returns aggregates only, with the same small-number rule: any figure built from fewer than 5 families shows "<5".

**Today.** The "How have evenings been with {name}?" card appears for children aged 2 and up when no check-in has been made in the last 14 days. It has two tap-to-answer questions and "Not now", which hides it for 3 days in that browser. It is labelled optional and private and is never a score for the child. After saving, the parent sees their own comparison with the previous check-in.

**Admin.** `/admin/outcomes` gains an "Are evenings getting easier?" section, fed by `parent_checkin_metrics()`.

**Family export.** Check-ins are exported under each child. The export guard test requires every erasable table to be exported or excluded, and it passes.

## Founding pilot: ready to switch on, deliberately not open

The research and all eight persona reviews agree: do not charge before the clinical review is published. Opening checkout also needs live Razorpay plans in the owner's account. The runbook, for the day the review passes:

1. **Razorpay (owner):** with live KYC complete, create two live plans named "Kahiye Founding Family":
   - ₹99 a month
   - ₹999 a year, with the price locked for 12 months

   Point the live webhook at `https://www.kahiye.app/api/billing/webhook` with the subscription events listed in `LAUNCH.md`.
2. **Vercel (owner):** set `RAZORPAY_KEY_ID` (`rzp_live_…`), `RAZORPAY_KEY_SECRET`, `RAZORPAY_PLAN_MONTHLY`, `RAZORPAY_PLAN_YEARLY`, `RAZORPAY_WEBHOOK_SECRET` and `BILLING_LIVE_ENABLED=true`. `launchStatus().billing` stays closed until every one is present.
3. **Code (CTO):** change `PRICES` in `src/lib/plans.ts` to the founding prices, and add "Founding family" copy. In the same release, decide the free cap for after the pilot.
4. **Gate before step 3:** the clinical review of the safeguarding cards and the top Handbook scripts is published with named reviewers, and cost per Ask is measured with a live run.
5. **Pass/fail (from the research's 90-day gate):**
   - at least 30 paying families who are not personal contacts by day 60
   - at least 25% activation (one Ask plus an outcome)
   - at least 30% return within 30 days

## Verification

- **`npm run check`:** lint, TypeScript, and 132 unit and server tests pass. New tests cover:
  - a cancelled answer is counted, while one that failed on Kahiye's side is not
  - "when to seek help" arrives with the first checked answer
- **Disposable database suite:** bootstraps through 030 and passes all 19 suites.
  - The allowance SQL test now proves the cap is 10, that an answer flagged `detailUnavailable` is not counted, and that one flagged `detailCancelled` is.
  - The concurrency test still shows that eight simultaneous requests for the last remaining turn reserve exactly one.
  - The new `family-checkins.sql` covers consent and ownership, idempotent retries, the 10-day spacing, invalid values, no direct writes, privacy between families, suppression below 5 families, the 28-day pairing, exact rates (6 of 7 = 0.857), and no identifiers in the output.
- **Route handlers against SQL:** all 7 suites pass.
  - The first-stage event now carries `seekHelpIf`.
  - A failed second stage leaves the parent's visible usage unchanged.
  - The family export includes check-ins.
- **Also passing:** provider races, the render check, the build, and the SEO check (47 pages).

## Limits

- The ₹2-per-Ask figure is a small evaluation sample.
- Check-in answers are self-reported by parents. They are evidence of perceived change, not clinical outcomes.
- The founding pilot is not open.
