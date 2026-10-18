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
