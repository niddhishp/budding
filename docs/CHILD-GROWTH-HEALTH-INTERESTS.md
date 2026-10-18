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
