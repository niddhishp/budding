# Parent outcome metrics

The investor deck and market research describe the loops Kahiye has to prove: activation, 14-day repeat use, feedback rate and share rate. Until now nothing measured them. `/admin/outcomes` shows them in aggregate, alongside Handbook use, chat/practice use and Plus conversion.

Status: implemented on branch `claude/outcome-metrics`. Not pushed, not deployed, and migration 027 is not applied to production.

## Access

- **Page:** `/admin/outcomes`, listed in the team navigation as "Parent outcomes". Only owner and operations roles see the page or the nav entry, and only with a verified authenticator session (AAL2). Therapists and content reviewers get the standard "not available for your role" page.
- **API:** `GET /api/admin/outcomes` runs `requireAdminAccess({ roles: ['owner','operations'] })`, which requires AAL2. It then calls the database function with the service-role client. Responses are `private, no-store`.
- **Database:** `public.parent_outcome_metrics()` is `STABLE` and `SECURITY INVOKER`, with a fixed empty `search_path`. EXECUTE is revoked from `public`, `anon` and `authenticated` and granted only to `service_role`. This is the same pattern `shop_demand()` uses (migration 021). Because the function is `STABLE` it cannot write.

## Privacy rules

These rules are required by DPDP and are not open to change. There is no profiling of children.

- **Aggregates only.** The function returns counts and ratios. Per-family flags are computed inside the function and never returned. No row-level data leaves the database: no identifiers, names, scenario text, answer text or child data.
- **No drill-down.** Nothing on the page links further, and no API returns families behind a number.
- **Small-cell suppression.** Any cell based on fewer than **five families** is returned by the database as the string `"<5"`, never as a number. The UI shows it as `<5`. Suppression happens in SQL, so small numbers never reach the application. Zero counts as fewer than five.
  - A count is suppressed if fewer than five distinct families contributed to it.
  - A ratio is suppressed if either its numerator or its denominator rests on fewer than five families.
  - `—` means there is nothing to divide by yet.
- **Consent scope.** Only families with current consent (`consents.policy_version = '2026-10-05'`) are counted. When a family withdraws consent, it drops out of every metric, past periods included, the next time the page loads. Erased accounts cascade away.

## Definitions

**Basic terms**

- **Ask record:** a row in `public.decodes`.
- **Ordinary guidance answer:** a decode where `safety_category = 'none'` and `analysis->'conversation'` is null. This leaves out chat, practice and every safety-routed answer. It includes refined answers and continuations of saved situations, from both the app and WhatsApp.
- **Ordinary guidance request:** an ordinary guidance answer with `refines is null`. A refinement of an earlier answer is not a new request, which matches how the conversation allowance counts.
- **First guidance (`first_at`):** a family's earliest ordinary guidance request. A chat or practice conversation never sets it, even if it happened earlier.
- **Registration time:** the family's earliest `accepted` consent receipt in `consent_events`, falling back to `consents.agreed_at`.

**Metrics**

| Metric | Definition |
|---|---|
| Registered families | Parents with current consent. In a period, counted by registration time. |
| Families with first guidance | Families whose first guidance falls in the period. |
| Had 14 days / Had 30 days | Of those, families whose first guidance is at least 14 / 30 days before now. These are the bases for the windowed rates. |
| Activated | Recorded an outcome (`worked`, `partly` or `did_not_work`) on any ordinary guidance answer, with `outcome_at` between `first_at` and `first_at + 14 days`, both ends inclusive. Chat and practice can't be rated (a migration 024 trigger blocks it). Safety answers don't count even when they are rated. Outcomes with no `outcome_at` don't count. |
| Activation rate | Activated families who have had 14 days, divided by families who have had 14 days. |
| Second-moment rate | Families who have had 14 days and made at least two ordinary guidance requests in `[first_at, first_at + 14 days]`, both ends inclusive, divided by families who have had 14 days. |
| 30-day return | Families who have had 30 days and have any Ask record of any kind (guidance, refinement, chat/practice or a safety answer) created in `[first_at + 1 day, first_at + 30 days]`, divided by families who have had 30 days. |
| Feedback rate | Ordinary guidance answers created in the period that have an outcome, divided by all ordinary guidance answers created in the period. An outcome counts whenever it was recorded. |
| Outcome mix | Worked, partly and didn't work as shares of rated ordinary answers created in the period. |
| Caregiver shares per activated family | Completed shares (`guidance_requests` with `kind='share'` and `state='complete'`, at any time) made by the cohort's activated families, divided by the cohort's activated families. |
| Handbook conversations tried | Handbook cards with `status = 'tried'` in `child_care_state.value->'handbook'`. In a period, a card is counted by its `updatedOn` date (India time). This is a count only, with no rate and no per-card breakdown. |
| Chat and practice conversations | Decodes with `analysis->'conversation'` present and no `continuation_of` (conversation starts), counted by start time. |
| Messages per conversation | Total records in each conversation's `continuation_of` chain (the start plus every reply), divided by the number of conversations. |
| Plus subscribers (now) | Registered families whose subscription status is in `active`, `pending`, `halted`, `cancelled` or `completed` and whose `paid_through` is later than now. This is the same paid-access rule `reserve_guidance` uses. |
| Free to paid | Registered families in the period who have ever had a captured charge (`paid_through is not null`), divided by registered families in the period. |

**Periods**

- **All time.**
- **Last 30 days.** Each metric uses the date that defines it:
  - registration time for registered families and conversion
  - first guidance for the cohort metrics (activation, second moment, return, shares)
  - answer creation for feedback and outcome mix
  - conversation start for chat and practice
  - card update date for the Handbook
- **Weekly cohorts.** The last eight weeks, India time, starting Monday and including the current partial week, newest first. Families are grouped by the week of their first guidance. Only the cohort metrics are shown.

Window rates use only families who have had the full window, so the rates for recent weeks and the last 30 days stay suppressed or empty until those windows close. The "Activated" count does include families whose window is still open.

## Verification

`tests/sql/parent-outcome-metrics.sql` uses synthetic fixtures: 43 parents in 9 groups, 5 of them without consent. It checks exact values for:

- registration, conversion and current Plus
- activation, including:
  - a rating at exactly `+14 days` counts, and one at `+14 days 1 hour` doesn't
  - a chat before first guidance doesn't move the window
  - a rated safety answer doesn't count
  - a family whose window is still open counts as activated but isn't in the rate's base
- second moment: a second request at exactly `+14 days` counts, and one at `+15 days` doesn't
- 30-day return: activity at `+23 hours`, `+2 hours` and `+31 days` doesn't count, and activity at `+10`, `+15` and `+20 days` does
- that chat can't be rated
- shares: failed shares and shares by non-activated families are left out
- the feedback rate and outcome mix
- conversation chains and the average number of messages
- Handbook counts by date
- eight weekly cohorts in order

It also checks that:

- a three-family week, an empty week and every rate built from fewer than five families come back as `"<5"`
- the output contains no UUIDs, emails, names or scenario text
- `anon` and `authenticated` get `42501`
- the function is `STABLE` and `SECURITY INVOKER`
- withdrawing consent removes a cohort

`scripts/test-security-db.mjs` runs the file and prints a PASS line. `tests/outcome-metrics.test.ts` checks that every metric has a label and a one-line definition, and that a `"<5"` cell is never formatted as a number. `scripts/test-http.mjs` now expects anonymous requests to get 307 from `/admin/outcomes` and 401 from `/api/admin/outcomes`.

To reproduce:

```powershell
docker run -d --rm --name kahiye-metrics-db -e POSTGRES_PASSWORD=disposable-test-only -e POSTGRES_DB=kahiye_security_test -p 55434:5432 pgvector/pgvector:pg17
$env:TEST_DATABASE_URL='postgres://postgres:disposable-test-only@localhost:55434/kahiye_security_test'
node scripts/test-security-db.mjs --bootstrap
docker stop kahiye-metrics-db
npm run check
npm run build
```

The SQL test refuses to run against a database that already holds consents or decodes. It needs the empty disposable database.

## Limits and open points

- **Complementary suppression is not applied.** A rate whose numerator and denominator both clear five can still let someone infer a small complement. For example, 95% of 100 families implies 5 did not. This is acceptable for aggregate operational review. It is not a formal disclosure-control guarantee.
- **Staff accounts with consent are counted** like any other family. Test accounts on production will inflate early numbers.
- **Outcome timing relies on `outcome_at`.** The parent rating RPC and WhatsApp feedback both set it. A rating with a null `outcome_at` counts for feedback but not for activation.
- **Handbook dates are coarse.** Handbook progress keeps only the latest status and `updatedOn` per card. A card marked tried, and later changed, stops counting, and re-marking moves its date.
- **Paid-conversion timing is approximate.** There is no first-charge timestamp. A period's conversion is the share of that period's registered families who have ever paid, and the Plus count is a snapshot of now, not a period total.
- **Shares** in a cohort count every completed share by the cohort's activated families, whenever it was made. The new `share_language` column from migration 026 is not used.
- **Performance.** The function scans consented families' decodes on every load. That is fine at current scale. Add materialisation only if the page becomes slow.
- **No exports or history.** Every load recomputes the figures. If investor reporting needs fixed snapshots, record them deliberately rather than adding exports of per-family data.
