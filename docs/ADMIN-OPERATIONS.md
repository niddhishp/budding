# Admin operations

Approved scope: operational overview, expert management, consultation fulfilment, existing team access; preserve all Kahiye work/data and deploy after verification.

## Design and implementation sequence

1. Add expert profiles and consultation workflow to the existing database. No destructive migration. Preserve requests, identities, children, consent and access controls.
2. Database-enforced permissions: owner/operations manage profiles and all requests; therapists see only their assigned requests through an active linked profile and current MFA session; content reviewers have no consultation access. Only owners manage team membership.
3. Build Overview, Consultations, Experts and Team access within the existing warm-paper design. Overview reports real queue counts; searchable, paginated requests lead to a dedicated detail page. Empty states explain the next action. No fabricated experts or requests.
4. Experts have qualifications, registration reference, specialties, languages, ages (plus pregnancy support), biography, contact details, availability, fees, session length, credential review and pause/restore. An optional verified therapist account links the profile to restricted case access. No destructive delete.
5. Request states: new → contacted → scheduled → completed; cancellation from any open state. Return scheduled to contacted if arrangements fall through. Assigned therapists may complete scheduled requests and add coordination notes. Scheduling requires a reviewed active expert, a future time, and no overlapping session. All times stored in UTC, shown with timezone. Assignment/schedule/status edits use version checks and atomic audit events. Closed requests cannot silently reopen.
6. Keep family history private: request details expose only supplied concern/contact preferences and the linked child's name/age, not AI conversations or other family records. Coordination notes belong to the request and are erased with it. Generic admin audit contains identifiers/actions, not concern/phone/note text. Parent sees request status and booked time. No automatic communication or payment collection is introduced.
7. Test clean migration, role boundaries, revocation, direct API bypass, validation, conflicts, schedule overlap, lifecycle, parent privacy and erasure with synthetic rolled-back fixtures. Test production build, HTTP guards, and browser layout/workflow. Apply the additive migration only after tests; deploy the exact tested commit, verify live routes and record rollback target.

Chosen approach: extend the existing Postgres/Next architecture with narrowly scoped database RPCs. A separate CRM would duplicate sensitive records and permissions; a service-role-only API would weaken database enforcement. Existing team access/MFA remains authoritative.

## Operating boundaries

Credential review is a recorded human check, not automated accreditation. Availability is a coordination note, not calendar integration. Booking and contact with parents remain human tasks; saving a schedule does not send an invitation. This is a concierge workflow, not an emergency response service or clinical records system.

## Release verification

**Live:** release `c427be57abc98fa022d7c830dc1af06d6a41ddeb`, deployed from `main` on 17 October 2026 at 23:35 IST. Vercel deployment `dpl_3jRTtBYMsM6rNzP4GyNxpy3rDZZ6` is READY at https://budding-3kssdfmht-reactic.vercel.app with `www.kahiye.app` and `kahiye.app` aliases. Build: 33 seconds. [GitHub CI](https://github.com/niddhishp/budding/actions/runs/39056363082) passed all checks before pushing production. The release branch is `codex/admin-operations`.

All 22 live HTTP checks passed: public pages, protected-page redirects, all admin API authentication, parent request status authentication, same-origin/foreign-origin enforcement and response security headers. The available in-app browser remained on the owner's email-link sign-in screen; no authenticated production UI session was available to the agent. The full create/assign/schedule/complete browser flow was tested locally as described below. No production expert, request, message or payment was created during verification.

17 October 2026: migration 011 applied to production with atomic preservation fingerprints. Existing account, child, consent and owner membership preserved; no live experts/requests or synthetic identities added. The migration is recorded in both Supabase history and `_budding_migrations`.

Passed locally: lint, strict types, 5 unit tests, production build, 19 HTTP security/header checks, clean migrations 001–011, original security suite and the new operations SQL suite. The latter covers anonymous/parent/reviewer/MFA denial, direct-write tampering, assigned therapist isolation, paused membership, stale versions, invalid therapist linking, schedule conflicts/past times, workflow transitions, withdrawal and erasure. All fixtures rolled back.

Browser integration: synthetic auth adapter bound to localhost, real Next routes and disposable PostgreSQL functions/grants/RLS. Created an expert through the UI, reviewed credentials, assigned a request, moved new → contacted → scheduled, reloaded to verify persistence/timezone, then completed with a note and observed history. Desktop and 390px mobile checked; no horizontal page overflow or browser console errors. Local dev font fetching used fallback fonts because of network restrictions; the production build downloaded and bundled the actual fonts successfully. This test does not emulate or prove the Supabase Auth service; MFA/session enforcement is covered separately by SQL security tests and live release access checks.

The optional production rolled-back suite was attempted twice but the connector returned `Invalid or expired requestState`; it is not recorded as passed. Read-only production verification confirmed original record counts and no test identities. The advisor scan reported only the pre-existing extension-placement and leaked-password-protection warnings documented in SECURITY-FOUNDATION.md, plus the intentionally private tables with no client policies.

Release target: `reactic/budding` (`prj_mYJypMtEldIrFB9K8Tx3H4cSQwVR`), `www.kahiye.app`. Pre-release rollback deployment: `dpl_3aDexvQVMVxsnGLx5FkfGYPUjf1a`, https://budding-mxgu8a88g-reactic.vercel.app. Migration 011 is additive and compatible with that previous application; retain schema/data on application rollback.

Reproduce browser testing with an empty disposable database initialized using `test:security:bootstrap`. Run `scripts/test-admin-browser.mjs` with its documented local-only `TEST_DATABASE_URL`, then start Next dev with the synthetic URL/key printed by the harness. Use port 3011 in the browser. Stop both processes afterwards; closing the database connection rolls back all browser fixtures. Never run this adapter for a deployed environment.
