# Relevant everyday guidance

18 October 2026. User requested age-relevant observations for an 11-year-old, a parent wellbeing space instead of unconditional pregnancy content, and daily interest activities and health reminders. Confirmed delivery preference: Today now; email/WhatsApp after provider activation.

## Scope and decisions

- Keep the existing infant/preschool milestone tool within its supported 0–60 month window. From 61 months, show plain-language conversation invitations for 5–8, 9–11, 12–14 and 15+ years. These are editorial parenting prompts, not an extended clinical checklist or achievement deadlines. Earlier saved observations remain accessible behind an explicit history choice.
- Reuse the private, revision-checked care observations field with distinct `growing-*` keys. No database migration, replacement of old records or bulk updates. Age selection uses date of birth; reminders respect the existing optional in-app setting.
- Discover shows a general parent space and only shows the pregnancy destination for an expecting profile. Parent space offers a brief reset, rest/support choices and a practical shared-responsibility conversation, including a solo-parent variation. Choices are session-only and clearly labelled. The expecting action opens existing add-child onboarding preselected to Expecting; it never converts an existing child. Existing pregnancy records remain available.
- Saved interests feed a deterministic, date-based activity in Today and the interest profile. Three invitations per area rotate across all selected interests; the parent can try another. Activities use current age, no scores or streaks, and never infer ability. No free-text notes are automatically submitted to AI. An open tab updates its India-calendar date on focus and every minute.
- Today shows recorded care dates due within seven days and past planned dates; completed/archived/not-applicable records without a new review date do not produce reminders. Ongoing medication records expose verbatim instructions and condition/care notes in a disclosure, with support for contacting the prescriber when needed. No invented dose schedule, treatment changes, diagnoses or missed-dose claims.
- Reuse one notebook load for both daily interests and health. Read failures are visible with retry; no data means no assumed interests or health needs. Navigation remounts the selected child’s content.
- Email/WhatsApp daily delivery is deferred until provider activation, channel opt-in, approved templates and owned-destination tests. No daily send job is enabled by this change. Sensitive medication/condition text must not be put into notification previews by default. The shared pure daily composer can supply a later delivery worker after those checks.

## References and content boundaries

- [CDC parenting resources by age](https://www.cdc.gov/child-development/positive-parenting-tips/index.html), checked 18 October 2026. Older-child prompts are Kahiye editorial invitations, not CDC milestone criteria.
- [CDC archived 9–11 parent resource](https://stacks.cdc.gov/view/cdc/155269), explicitly historical; supports the stage distinction, not a clinical instrument.
- [UNICEF parent self-care](https://www.unicef.org/parenting/mental-health/parent-self-care-tips), checked 18 October 2026, informs rest, asking for support and making space for parents. No efficacy or treatment claims.

## Verification plan

Test age boundaries/no gaps, preservation of old observation keys, pregnancy visibility, stable daily rotation/multiple interests/empty selections, and health date/status filtering without mutating records. Run lint/typecheck/full tests/build, actual route persistence checks against disposable SQL and CI. Verify live desktop/mobile views and unsaved expecting flow without creating production health or child records. Document exact release evidence below.

## Verification evidence

- `npm run check` passed lint, TypeScript and all 58 tests (37 unit, 21 server). New fixtures cover the 60/61-month transition, every older-child month through age 20, the actual 11-year-old case, expecting-only pregnancy visibility, stable date-based interest rotation and health dates/status exclusions.
- Production build passed. Rebuilt with process-local synthetic Supabase public variables for compiled-route tests because Next inlines those variables at build time. The first route run against the ordinary build correctly failed authentication; the synthetic rebuild passed. The script now refuses all non-local network destinations, preventing accidental use of an ordinary build. No credentials or `.env.local` values were changed.
- Actual compiled Next handlers and a disposable SQL adapter passed save/reload for new and old observation keys, retained pregnancy notes, stale-revision rejection and sibling isolation, plus the existing notebook/growth security and failure checks. No local Next UI server was started: the prior automatic-review restriction was respected. These checks are handler/database integration, not a local browser write-flow claim.
- Disposable adapter stopped and rollback verified with zero test auth users. Disposable Docker container stopped. No production database migration or bulk mutation is needed for this release.
- React review: reuse one notebook read for Today’s interests/health, child-keyed content, abortable loads, visible load errors, bounded records, plain-text rendering of care notes, no automatic external transmission, accessible pressed states/labels and semantic disclosures. Date listeners clean up on unmount. Narrow-screen long titles wrap.

## Production release

- Code `65f51db7211f737bba1eb2df888b8d5d08176b6b`. [CI 39103220260](https://github.com/niddhishp/budding/actions/runs/39103220260) succeeded for this exact SHA, including clean SQL bootstrap, security/provider tests and production build. Main was fast-forwarded only after success.
- Vercel `dpl_8BQery2EpqtJxuPeB2f9jaqsEdCt` is Ready, target production, exact SHA, at https://budding-7g9r5aman-reactic.vercel.app. Both www.kahiye.app and kahiye.app aliases verified.
- Signed-in production checks: the 11-year-old profile opens the 9–11-year conversation prompts; early-years history is optional; Discover has parent space instead of a pregnancy destination; Today displays an activity from saved interests; Try another idea changes it and revisiting restores the stable daily choice. Existing user-entered growth and interest data rendered successfully.
- Parent reset selection, shared-task choice and solo-parent variation changed their displayed guidance correctly. Expecting action opened blank new-child onboarding with Expecting selected and a due-date field. Closed without saving; the existing child stayed selected and unchanged.
- Desktop default 1280×720 and mobile 390×844 inspected. Parent space and Today had document width 390 and main scroll width 382, with no horizontal overflow. Screenshot evidence saved as `kahiye-age-relevant-live.png` and `kahiye-daily-activity-mobile-live.png` in the task visualization folder. Temporary viewport override reset; agent verification tab closed, original user tab untouched.
- Live privacy returned 200 and includes the new Today usage disclosure. No production child, health, interest or observation records were created/modified by the agent. Medication/date fixtures were tested synthetically; no claim of live medication reminders with real populated records.
- No schema migration or provider activation. App rollback to the prior deployment leaves all family records and new `growing-*` observations intact. Real email/WhatsApp daily delivery remains deferred under the explicit preference above; do not represent it as active or as automatically enabled by adding provider keys.
