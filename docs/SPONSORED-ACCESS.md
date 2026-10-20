# Sponsored access: Kahiye for schools, employers and clinics

21 October 2026. Checkout is closed, so no family can pay for Plus yet. Sponsored access lets an organisation pay for Kahiye Plus for its families under a written agreement, invoiced outside the app. The owner can run business-to-business pilots now, without Razorpay.

## What a family gets

- **Plus limits while the sponsorship runs:**
  - 10 Ask turns a rolling day, instead of 10 a week
  - weekly reports
  - stories in every language, narration and caregiver messages in other languages with no 30-day limit
- **Where to enter a code:** the plan sheet ("Have a code from your school, employer or clinic?") and You ("Kahiye Plus through your school, employer or clinic").
- **After redeeming,** the family sees "Kahiye Plus, sponsored by {organisation} until {date}" and "{organisation} sees only total numbers, never your family's details."
- **When the term ends,** or the team ends the contract, the family returns to Free limits. Nothing is deleted. A sponsored family is never asked to pay, and there is nothing to cancel.

## How it works

**Migration `033_sponsored_access.sql`.**

| Table | Holds | Who can read it |
|---|---|---|
| `organisations` | Name, kind, contact, agreement date, seats, term (`starts_on`–`ends_on`), status (`draft`, `active`, `ended`), notes, revision | Service role only |
| `sponsor_codes` | 10-character code, organisation, maximum and current redemptions, optional expiry, on/off | Service role only |
| `sponsored_access` | One row per family per sponsor: organisation name, code, redeemed time, `access_until` | The parent, their own row only (RLS); service role |
| `sponsor_code_attempts` | Time of each refused attempt, for a rate limit | Service role only |

- **Kinds:** `school`, `employer`, `clinic`, `community` and `diaspora_community`. The last is the "Kahiye Abroad" placeholder; see below.
- **Codes:** 10 characters from `23456789ABCDEFGHJKMNPQRSTUVWXYZ`. There is no 0, 1, I, L or O, so codes survive being read aloud or printed. That gives about 49 bits each, generated from a cryptographic source without modulo bias (`src/lib/sponsor.ts`). They are shown as `ABCDE-23456`. Parents can type lower case, spaces or a hyphen.
- **Redemption:** `redeem_sponsor_code(code)` runs as the parent, through a security-definer function. In order:
  1. It requires consent policy `2026-10-05`.
  2. It takes a per-family lock.
  3. It refuses after 10 refused attempts in an hour.
  4. It locks the code row, then the organisation row, so seat and redemption counts are exact under concurrency.
  5. **Idempotent:** entering any code from the sponsor already running returns that sponsorship unchanged.
  6. **One running sponsorship:** a family sponsored by one organisation cannot redeem another's code until the first ends.
  7. **Refusals:** `invalid` (unknown or malformed), `inactive` (draft organisation, code switched off, or term not started), `expired` (code expiry or term ended), `full` (code limit or organisation seats reached).
- **Access ends** at midnight after `ends_on`, India time.
- **Seats** are the number of families who have redeemed for the organisation. Each family counts once, and the count does not change with re-redeeming. An erased account frees its seat.
- **Contract changes follow through.** Saving an organisation updates every family's `access_until`:
  - **active:** the end of `ends_on`, so a renewal or extension needs no new codes
  - **ended or draft:** now, so access stops immediately

  Switching a code off stops new redemptions only. Families who already redeemed keep their term.
- **Team writes:** `save_organisation`, `create_sponsor_code` and `set_sponsor_code_active` are service-role only.
  - **Database re-check:** each one checks again that the actor is an active owner or operations member with a live AAL2 session (`private.shop_staff`).
  - **Audit:** each writes an `admin_audit_events` row. Audit rows show only the last three characters of a code.

**Entitlement: Plus means paid or sponsored, in both places that decide it.**
- **SQL:** `reserve_guidance` is patched with the guarded text replacement (as in 017, 018, 025 and 029). It aborts unless the live definition contains exactly the 018 paid-access check and no earlier sponsorship clause. It is then `exists(paid subscription) or exists(sponsored_access where access_until > now())`. Every Plus limit in that function follows: Ask, stories, weekly reports, caregiver shares and the daily processing ceiling.
- **Application:** `getEntitlement` (`src/lib/billing.ts`) reads the parent's running sponsorship under RLS. It returns `plan: 'plus'` and `sponsor: { name, until }`.
  - `renewsAt` and `cancelAtPeriodEnd` describe only a paid subscription.
  - Every route that checks `plan === 'plus'` follows automatically: the caregiver-message 30-day allowance in `/api/share` (unlimited on Plus), report, stories and narration.
  - `/api/billing/subscribe` tells a sponsored family there is nothing to pay.

**Routes and screens.**
- **`POST /api/sponsor`:** the parent redeems a code. It requires same-origin, sign-in and consent. Refusals return a plain message and a `code`, with no model call.
- **`/admin/sponsors`** (`GET` and `POST /api/admin/sponsors`): owner and operations only, at AAL2. Here the team:
  - creates and edits organisations
  - issues up to 50 codes at a time
  - switches codes on and off
  - copies a share link (`https://www.kahiye.app/app?sponsor=CODE`, which opens You with the code filled in; nothing is redeemed until the parent presses "Use code")
  - sees seats used and the sponsor summary
  - copies that summary as plain text

**Family export and erasure.** `sponsored_access` is exported under `account.sponsorships`: organisation name, code, redeemed time and end. `sponsor_code_attempts` is listed as excluded, with its reason. Both are erased with the account through `ON DELETE CASCADE`. Organisations and codes are not family records and are not erased.

## What the organisation sees

Only `sponsor_report(organisation)`. Organisations have no login, no API and no access to any table. The team sends the summary by email.

| Figure | Definition |
|---|---|
| Families joined | Families with current consent who redeemed a code for this organisation |
| Families active in the last 30 days | Joined families who used Ask, or did the evening check-in, since joining and within 30 days |
| Ask turns in the last 30 days | Counted as the allowance counts them. Safety-related turns are never counted. |
| Families who checked in in the last 30 days | Joined families who did the optional evening check-in |
| Handbook cards saved or tried | Total saved Handbook progress across joined families |

Any figure built from fewer than five families shows as "<5", using the same rule and helpers as `/admin/outcomes`. The summary also carries the contract's own terms: seats, start and end. It never contains a family, child, name, question, answer, date of activity or identifier. That includes safety events, check-in answers and individual usage.

**Seat usage in the team view.** The team workspace shows the exact number of seats used, because seats are what the sponsor pays for and the owner needs the number to invoice. The figure carries no family identifier or activity. Do not forward a seat count below five to the sponsor; send the summary instead, which suppresses it.

## Running a pilot

1. **Agree terms first.** Use the checklist below. Record the agreement date, seats and term.
2. **Create the organisation** in `/admin/sponsors` → New organisation:
   - Choose the kind, places (seats), starts on and ends on.
   - Leave it as **draft** while you check the details. Codes for a draft organisation are refused with "not active yet".
   - Set it to **active** on the start date.
3. **Issue codes.** Pick a pattern:
   - **One shared code** for a school newsletter, with "families per code" set to the seat count.
   - **One code per family** (families per code = 1), for a clinic that hands codes out at appointments.
   - **An expiry date** to close a sign-up window. The term itself still ends on `ends_on`.
4. **Share.** Send the code or the copied link.
   - **For a QR code:** encode the link (`https://www.kahiye.app/app?sponsor=ABCDE23456`) with any QR generator. The parent signs in, lands on You with the code filled in, and presses "Use code".
   - **Suggested wording:** "{Organisation} has arranged Kahiye Plus for your family until {date}. Open Kahiye, go to You, and enter code ABCDE-23456. {Organisation} sees only total numbers, never your family's details."
5. **Report.** At an agreed interval, usually monthly, open `/admin/sponsors`, press "Copy summary for {organisation}" and email it to the named contact. Do not add anything about any family.
6. **Renew or end.**
   - **Renewal:** change "ends on". Every joined family's access moves with it, with no new codes.
   - **End early:** set status to **ended**. Access stops now.
   - **Retire a code:** switch it off. Families who joined keep their term.

## Pricing guidance (the owner decides)

- **Suggested range:** ₹300–1,000 per family per year, invoiced to the organisation outside the app.
- **Comparison:** the listed consumer price is ₹1,999 a year. The founding plan under discussion is ₹999 a year.
- **The low end** suits large schools and community partners, with many seats and lower expected use.
- **The high end** suits employers and clinics, where Kahiye supports staff wellbeing or a care pathway.
- **Pilot:** 3 months at a reduced or nil rate, with conversion to an annual term priced on the summary figures.
- **Cost check:** the 20 October sample put an Ask at about ₹2. A sponsored family at Plus limits could, in the extreme, use far more than the seat price. The daily processing ceiling (100 attempts on Plus) and the two-concurrent limit still apply. Watch active families and Ask turns in the summary during a pilot before quoting a large term.
- **Payment:** set the price per seat and term in the agreement, not in code. No payment runs through Kahiye.

## Institutional agreement checklist

**Data and privacy**
- Aggregate-only reporting: the sponsor receives only the summary above, with figures below five families suppressed. No family, child, question, answer, safety event or individual usage is ever shared. That includes on request, and includes "just this one family".
- No family data to the sponsor, and none from it: Kahiye does not take staff or student lists. Families join themselves with a code.
- Joining is voluntary. The organisation must not require families to prove they joined, or ask them for anything they wrote in Kahiye.
- **DPDP roles:**
  - **Kahiye:** the Data Fiduciary for each family's personal data. Each parent consents to Kahiye directly (policy `2026-10-05`).
  - **The sponsor:** neither a fiduciary nor a processor of family data. It is a customer receiving anonymous statistics.
  - **Children's data:** stays under Kahiye's verifiable parental consent and children's-data obligations. The sponsor has no role in it.
- A family can export or erase its data at any time. Erasure frees the seat.
- **Confidentiality:** the sponsor keeps codes within its community. The team switches off a leaked code.

**Commercial**
- **Seats:** the number of families, and what happens when the seats are used up. Families are refused with "All the places have been taken" until seats are added.
- **Term:** start and end dates. Access ends at midnight after the end date, India time.
- **Price:** per family per year, or a fixed fee. Invoicing, tax and payment terms.
- **Renewal:** notice period. Renewal extends every joined family's access automatically. Not renewing returns families to Free with nothing deleted.
- **Ending early:** who can end the contract, and with what notice to families.

**Content and safety**
- Kahiye's guidance is general parenting support, not diagnosis, therapy or emergency care. Safety support is never paywalled.
- Clinical review of the content is pending. Say so in any pilot proposal until it is published.
- **Clinics:** Kahiye does not replace the clinic's own care, and no clinical information flows between them.

**Communication**
- Agree the wording families receive, including the privacy line.
- Name one contact for summary reports.

## Kahiye Abroad (placeholder only)

`diaspora_community` exists so that a diaspora organisation abroad, such as an Indian community association, could sponsor families now on the same terms. There are no international payments, currencies or prices, and nothing about Kahiye Abroad is advertised. The privacy notice, consent and data residency are unchanged, so check with counsel before sponsoring families outside India. Cross-border transfer and local law have not been reviewed.

## Verification

- **`npm run check`:** lint, TypeScript, and 142 unit and server tests pass (81 unit, 61 server).
  - **Code generation and validation:** the alphabet matches the database constraint, there is no modulo bias, 2,000 codes are all valid and unique, and normalisation is bounded.
  - **Sponsorship expiry.**
  - **The export of `sponsorships`,** without the internal organisation ID.
- **Disposable database** (`test-security-db.mjs --bootstrap`, pgvector/pg17, through 033): every existing suite passes unchanged, plus `tests/sql/sponsored-access.sql`. That suite covers:
  - AAL1 and parent actors refused
  - audited setup, with no full code in the audit log
  - stale revisions and unknown kinds refused
  - consent required
  - malformed and unknown codes
  - typing tolerance
  - access running to the end of the last day, India time
  - idempotent re-redeem, also with another code from the same sponsor
  - one running sponsorship
  - draft, switched-off, expired and finished-term refusals
  - single-use codes and organisation seat limits
  - the attempt limit
  - RLS isolation, with no parent access to organisations, codes, attempts, reports or writes, and no anonymous redemption
  - exact counts
  - `reserve_guidance` granting Plus limits to a sponsored family:
    - 10 a day while 10 answers from two days ago block a Free family
    - weekly reports
    - the Plus daily limit flagged as Plus
  - Free limits again when the contract ends or the row expires, and renewal restoring access
  - joining a new sponsor after expiry
  - sponsor reports with every family figure suppressed below five, safety turns and pre-sponsorship activity excluded, and no identifiers
  - the team overview carrying no family identifiers
  - erasure releasing the seat

  The suite **fails without the `reserve_guidance` patch**. This was checked by reverting the patch in a transaction: "Sponsored family did not get the Plus daily allowance".
- **Concurrency** (`scripts/test-sponsor-db.mjs`): 8 families redeeming at once for 3 seats admit exactly 3. Repeating the race moves no seat.
- **Route handlers against SQL** (`test-family-plan-routes.mjs`): all suites pass, plus a new sponsored-access suite. It covers:
  - the team-only admin route (validation, stale revision, parent refused)
  - issued codes redeemed through `/api/sponsor` with a typed lower-case, hyphenated code
  - `/api/me` before and after
  - entitlement `plus`, `day`, `10`, sponsor name and India-time end
  - an idempotent second code
  - no model calls
  - a Hindi caregiver message allowed while sponsored beyond the Free 30-day allowance (also proving the SQL share limit)
  - the team view without family identifiers, and the suppressed summary
  - the export
  - Free limits and the 402 after the sponsorship ends

  The fake PostgREST now accepts only `sponsored_access` reads, the `access_until=gt.` filter and the five sponsor RPCs.
- **Also passing:** providers, the render check and the build.

## Release

1. **Apply migration 033 to production first.** `getEntitlement` reads `sponsored_access`, so code deployed without the table would fail every allowance lookup with 503.
2. After applying, verify that the `reserve_guidance` definition contains `sponsored_access`, still contains the 018 `paused` clause and the 029 `detailUnavailable` clause, and that execution is still limited to `service_role`. Record the ledger row.

## Rollback

- **Application:** revert the commit. The tables can stay, and nothing reads them.
- **Database:** to remove sponsored Plus from the allowance, reverse the text replacement with the same guarded pattern. Set every organisation to `ended` first, so no family is left with a sponsorship the app no longer shows.
