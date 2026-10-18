# Phase 5: expert capacity and consultation delivery

Approved scope: preserve the existing application and data, strengthen expert capacity, overdue requests and delivery operations; test and deploy.

## Design

Extend the current concierge workflow and database permissions. A separate CRM would duplicate family records; automatic matching and calendar integration require operational inputs not yet supplied. Keep human assignment and contact, with database-enforced workload limits and visible follow-through.

- Experts: accepting-new-work switch independent of account access, maximum open assignments (default 10), daily session limit (default 4), booking buffer (default 15 minutes). Days use Asia/Kolkata, consistent with the queue. Limits are editable. Existing bookings are preserved; changed limits apply to new assignments/bookings, not ordinary notes or completion.
- Requests: explicit next follow-up time. New and contacted requests default to 24 elapsed hours from receipt/last workflow transition until the team chooses a date. A scheduled session becomes overdue after its end, not its start. Closed requests are excluded. Queue filters: overdue, unassigned, operations alerts needing attention; urgent-source flags remain visible. Deadlines are internal coordination targets, not a promise of emergency response.
- Contact log: phone/email/WhatsApp/manual coordination, reached/no answer/message left/contact failed/session missed, note and required next follow-up for open work. Records are immutable events with actor, timestamp and version. Contact does not imply a message was sent by Kahiye. A reached parent advances new to contacted; failed contact never does. Therapists stay restricted to their assigned requests and cannot alter assignment/schedule.
- Operations alerts: each newly submitted request atomically creates a durable alert entry. Initial send is attempted after the parent response; missing configuration and failures are visible. Operations may retry from the request. The email contains only a request reference and protected admin link. Provider acceptance is labelled accepted, not delivered. No parent email, phone or concern is included. Leases prevent parallel sends; a stable provider idempotency key protects retries. Maximum five attempts; after 23 hours from the first attempt, uncertain sends require manual provider reconciliation instead of blind retry. No scheduled background sending is introduced; pending/failed alerts remain in the team queue until retried. Existing requests are not backfilled or emailed.
- All mutations retain MFA, current membership, request scope, consent, optimistic version checks and privacy-safe audit. Erasure cascades to alert records. Parent-visible request status excludes internal contact notes and alert diagnostics.

## Verification and release

Local verification passed on 18 October 2026:
- `npm run check`: lint, TypeScript, 23 unit and 12 server cases.
- `npm run test:security:db`: all existing security/admin/intake/memory/guidance suites plus capacity, accepting-new restrictions, unchanged bookings, buffer conflicts, India-local daily caps, overdue queues, contact receipt replay/conflicts, consent, alert privacy, leases, frozen retry payload, retry cutoff/attempt limits, and erasure.
- Two concurrent races with six requests: exactly one open assignment and one daily booking admitted when one slot remained. Synthetic fixtures removed afterwards; auth table returns to zero rows.
- 32 local HTTP checks: authentication, origin restrictions and protected routes.
- Browser through real Next routes and local PostgreSQL/RLS: create reviewed expert with limits; record no answer without advancing status; record reached parent and advance; reject past booking while preserving draft; save future booking and use its end time for next action; retry unconfigured alert visibly blocked with zero attempts. No real messages or model calls.
- Desktop 1440 x 1000 and mobile 390 x 844 inspected; no document horizontal overflow. Screenshots: `docs/evidence/consultation-delivery-desktop.jpg`, `consultation-delivery-mobile.jpg` (synthetic data only).
- `npm run build` passed. React review: labelled controls, stable event IDs, explicit loading/error states, cancellation/deadlines and refreshed workload after assignment.

Deployed 18 October 2026. Code `ccaf08df47cf025d3c14aff67684cb87d8c79320` is on `main`. [CI run 39093731445](https://github.com/niddhishp/budding/actions/runs/39093731445) passed for that exact commit, including a fresh migration bootstrap. Vercel production `dpl_DpnR8UnSMs1BkFW5oA4UBaHzDCAc` is Ready at https://budding-1wihl1f4e-reactic.vercel.app, with `www.kahiye.app` and `kahiye.app` assigned. The Vercel commit SHA matches the verified code.

Migration `015_consultation_delivery.sql` applied at 2026-10-18 03:30:49 UTC and was recorded in the migration ledger. Every baseline count and fingerprint below matched after the migration, excluding only the new columns. Zero alerts were backfilled. No family records were rewritten or deleted.

Live read-only checks: home, quiz, help and login return 200; anonymous overview/consultation APIs return 401 with private/no-store; admin redirects anonymous users to login. The signed-in owner dashboard loads the new counts; overdue and operations-alert filters return the expected empty state; the expert editor exposes all capacity controls. No production records or messages were submitted. No error-level runtime logs were returned during verification. Production environment names checked: `RESEND_API_KEY` and `EXPERT_NOTIFY_EMAIL` are absent. Queue/coordination features work; actual operations email remains unconfigured. No delivery was claimed or sent during testing.

Preservation baseline (counts/hashes only): children 1 / `a8e9567548f0cbac357ed90261ace83c`; consents 1 / `d211210a2f01b6af351e3e2350f55658`; admin_memberships 1 / `8b21e39da0c5b4db8c5f527208f752cc`; experts, expert_requests, memories and decodes each 0 / `a2e4822a98337283e39f7b60acf85ec9`.

Rollback: keep additive migration 015 and stored history. The previous application can run against it, but stops exposing delivery controls and uses its older email payload path. Prefer repair forward or disable alert sending through provider configuration while repairing. Never delete requests, events or alert receipts to roll back a screen.

Provider idempotency reference: https://resend.com/docs/dashboard/emails/idempotency-keys (24-hour retention; implementation uses a conservative 23-hour retry window).

## Team operating guide

1. In Experts, add the real roster and review credentials. Set open-request capacity, daily sessions and the gap needed between sessions. Turn off Accept new requests for temporary capacity pauses; use roster pause only when access should also stop.
2. At the beginning of each shift, open Overview and review overdue requests, safety-related requests, unassigned work and operations alerts needing attention. Refresh the queue during the shift. This workspace does not provide emergency monitoring or timed on-call notifications.
3. Contact the parent using the team's approved channel, then record what actually happened and the next follow-up. Do not put clinical transcripts or diagnosis in coordination notes. Confirm a booking with both people before saving it.
4. After a scheduled session, record completion with a short coordination note. If it was missed, record that outcome, choose the next follow-up and move back to In conversation when arranging a replacement time.
5. For email setup needed, configure a verified sender, `RESEND_API_KEY` and the real operations recipient `EXPERT_NOTIFY_EMAIL`; redeploy, then retry a selected pending alert. Existing requests without an alert are intentionally not backfilled.
6. For provider history needs manual review, inspect the provider reference/idempotency key `consultation-request/<request-id>` in Resend. Do not delete the receipt or reset its attempts. The app intentionally has no blind resend button after the safe retry window. Coordinate from the admin queue while a verified recovery is prepared.

Operational limitations: no automated matching, calendar sync, provider delivery/bounce webhooks, scheduled retry worker or parent message sending in this phase. SMTP, WhatsApp, billing reconciliation and launch activation remain phase 6. Provider acceptance alone never proves delivery or that anyone contacted the parent.

Security advisor comparison: unchanged. Two existing [extensions in the public schema](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public), [leaked-password protection disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), and five intentionally server-only [RLS tables without client policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy). Migration 015 introduced no new findings.
