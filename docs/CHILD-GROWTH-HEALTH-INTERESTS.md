# Child profile: growth, health and interests

Approved scope, 18 October 2026: implement the previously proposed visual growth record in Today and Child; add vaccination, medication/check-up tracking and a playful interests exploration. Preserve every existing record and deploy after verification. Photo timelines/videos are not part of this release.

## Design and order

1. Reuse existing growth entries, revisions and archive/undo. A warm illustrated ruler, measurement-date selector, height/weight summary and simple trend make the parent's own records primary. Keep reference detail optional. BMI uses a single dated standing-height/weight pair, age at measurement, explicit boys/girls reference and CDC 2000 monthly LMS data for ages 2 through 19; no adult cutoffs or diagnosis. Withhold unsupported/extreme comparisons. Infant WHO charts stay available separately. No inferred sex, combined dates or fabricated measurements.
2. Child has Growth, Health diary and Interests & talents destinations. Today shows growth and user-planned upcoming health items. Health diary stores vaccinations, medication instructions exactly as entered, appointments, completed dates and clinician-planned next dates. All records are editable and removable with undo before saving. An India routine-immunisation reference supports adding individual entries, including conditional JE and a 2026 HPV note. An empty record means unknown, never missed. Annual vaccines/check-ups require a parent/clinician date; no blanket annual regimen, dosing advice or external notification.
3. Interests stores optional, multiple observations across art, movement/dance, music, patterns/maths, making/coding, words and nature/other. Three playful scenes vary by age, each allows multiple choices or skipping. Suggestions invite low-pressure practice and child choice, not talent diagnosis, intelligence scores, fixed labels or career prediction. A parent can directly add interests and notes without the quiz, revisit answers and clear them. Babies receive exploration ideas rather than an aptitude quiz.
4. New profile notebooks are separate from care settings so old clients cannot erase new fields. Owner-only reads, consent-checked revision writes, payload bounds, child/account deletion cascade, no AI ingestion. Failure keeps drafts; conflicts require explicit reload.

## Sources

- CDC LMS methodology and data: https://www.cdc.gov/growthcharts/cdc-data-files.htm ; downloaded source retained in data/reference/cdc-bmi-age.csv and reproducible JSON generation script. Month bins follow published half-month convention; age in months uses days / 30.4375, guarded by actual second/twentieth birthdays.
- India national schedule: https://www.mohfw.gov.in/sites/default/files/Final%20Printed%20English%20AR%202024-25.pdf (national schedule, p72). Use as a reference to reconcile with a vaccination card, not a complete individual/catch-up schedule.
- HPV 2026 update: https://www.pib.gov.in/PressReleasePage.aspx?PRID=2233906&lang=1&reg=3 ; conditional programme for 14-year-old girls, clinician confirmation, no sex inferred from profile or chart reference.

## Verification and release

Required: BMI reference fixtures and boundaries, same-record rules, invalid health payloads, interest skip/multi-select, date and revision guards; SQL ownership/consent/conflict/erasure; API integration; browser add/edit/reload/sibling isolation and mobile layout; build/CI. Snapshot existing production counts/fingerprints before additive migration and compare afterwards. Record actual release evidence below; never claim live provider messages or clinical review.

### Deployed 18 October 2026

- Code: `f577a0e975985c96d0196da5474891afa164ca58` (feature commit `5be6b7e`; follow-up preserves downloaded CDC CSV bytes as binary in Git).
- Migration: `019_child_profile_notebooks.sql`, applied to production with its migration ledger entry. Separate health/interests notebooks have owner-only reads, no direct authenticated writes, consent/ownership checks and revision guards.
- GitHub CI [39101539439](https://github.com/niddhishp/budding/actions/runs/39101539439) succeeded for the exact deployed SHA. Vercel deployment `dpl_GstdTjgeuBoTFKaBvriywEvWBvKb` is Ready at https://budding-4u46j6pvr-reactic.vercel.app, with www.kahiye.app and kahiye.app aliases.
- Before/after migration fingerprints matched for all ten existing tables checked: children, consents, admin memberships, child care state, growth entries, memories, decodes, subscriptions, experts and expert requests. No existing records were rewritten or deleted. The new notebooks table was empty immediately after migration; the owner subsequently saved real interests during live verification. Preserve them.

### Completed verification

- `npm run check`: lint, typecheck and all 53 tests (32 unit and 21 server) passed. BMI tests check source checksum, independent published percentile columns, age/reference/method boundaries and unsupported comparisons. Source SHA-256: `cbeea0e8d500ee15c652f3fdc45bcd02cb9c15d4d1e86f4d8048bbfea8d166e5`.
- Full clean SQL bootstrap through migration 019 passed, including a final release database. Notebook SQL checks cover ownership, consent, anonymous/direct-write denial, invalid dates/duplicate IDs, stale revisions, identical retry, independent sections, archive/restore and child deletion cascade. Existing security, concurrency and provider suites passed in CI.
- `scripts/test-profile-routes.mjs` exercised actual compiled Next route handlers with request/cookie stores and a disposable SQL adapter: authentication, invalid input, ownership, save/reload, stale/identical retry, sibling separation, persisted interests, growth save/edit and failed saves preserving stored data. These are handler/database integration tests, not browser persistence tests.
- Local Next server startup was rejected by automatic approval review. No local HTTP server or full local browser write workflow ran for this release. Compiled-handler checks supplied persistence coverage; do not describe them as full browser end-to-end tests.
- Production build passed locally and in CI. Live HTTP checks returned 401 for unauthenticated notebook GET and same-origin PUT, 403 for foreign-origin PUT, and 200 for privacy. A bounded production error-log check for 05:45:43–05:50:43 UTC returned no records; this is not ongoing monitoring.
- Signed-in production checks verified Today/Child growth cards, standing-height form and optional head measurement, health forms and vaccination reference through adolescence. Interests accepted multiple choices, skipping and matching suggestions without saving automatically. No agent-created production measurement or health/interests test records were saved.
- Desktop 1280×1000 and mobile 390×844 layouts were reviewed; Child and Health had no horizontal overflow at 390px. Temporary viewport changes were reset and the verification tab closed. Screenshots saved in the task visualization folder as `kahiye-growth-profile-live.png` and `kahiye-health-mobile-live.png`.
- Disposable adapter stopped; rollback left zero test users in its database. Disposable Docker container stopped. Local environment credentials unchanged.

### Boundaries and rollback

- BMI comparisons require the supported age/reference/method range, withhold unsupported extremes and never apply adult health categories. No clinical diagnosis or extended-BMI percentile implementation.
- Health is an editable diary with archive/restore. India references help reconcile a clinician's plan and vaccination card; they are not individual mandatory/catch-up prescriptions. Today dates are parent-entered. No external reminders, medication alarms, dose-adherence tracking, prescribing or interaction checks.
- Interests are revisitable observations and play ideas, not a validated aptitude assessment or proof of innate ability. Save is explicit. New notebook notes are not automatically sent into AI guidance.
- Application rollback must retain migration 019 and all notebook records. Never drop the new table or overwrite newer data to restore an older client.
- Supabase advisories unchanged: two [extensions in public](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public), [leaked-password protection disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), and ten informational [server-only tables without client RLS policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy). No new warning introduced.
- Real billing/email/WhatsApp verification and other commercial-launch inputs remain separate pending work. No messages or charges during this release. Photo timelines/video memories remain future scope.
