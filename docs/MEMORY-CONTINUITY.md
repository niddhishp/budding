# Phase 4: memory controls and situation continuity

Approved scope: parents can review, correct, pause and stop using memories, and deliberately continue a saved parenting situation. Preserve existing family data, test and deploy.

## Design and implementation order

1. Add memory confirmation, expiry, correction timestamps and optimistic revision numbers; add a child-level memory switch and a same-child continuation link on saved decodes. Existing rows and content remain intact. Older unconfirmed memories wait for parent review.
2. Authenticated, consent-checked memory API. Add/edit/confirm, 30/90/365-day or no expiry, private-only entries, stop using and undo. Updates require the current revision and child identity. Stopping use keeps the entry available for undo; it does not claim permanent deletion of original situations.
3. Guidance uses only confirmed, unexpired, non-private, non-archived memories when enabled. Automatic raw-history/log injection stops, so excluded memories cannot return through another background context path. Profile details remain separately editable. New extraction creates suggestions, never approved facts. Pausing stops both memory use and new extraction; a commit-time check handles pause races.
4. Open saved guidance or explicitly continue it with a fresh update. Include at most four linked earlier moments, always scoped to the same parent and child. No automatic topic linking. Safety checks, usage reservations and reviewed output remain mandatory; a new continuation uses the normal allowance. Corrections in current memories take precedence over older observations. Original saved situations remain readable.
5. Verify constraints/ownership, confirmation/expiry/pause, corrections, revision conflicts, outcome re-rating, chain ownership and bounded context; browser save failure/retry, archive/undo, child switching and continuation; CI, migration preservation fingerprints and live smoke checks.

## Boundaries

No original situation, memory or family record is automatically deleted. Stop using is reversible. Historical situations enter new guidance only when the parent deliberately continues them. Pausing memory does not cancel a response already being generated. AI suggestions remain labelled as suggestions after confirmation; confirmation is not clinical validation.

## Verification and deployment

**Deployed 18 October 2026.** Code `1fd7a66e1ec7259ebc813fec20d3db40ace7c088` is on `main`. [CI run 39092281353](https://github.com/niddhishp/budding/actions/runs/39092281353) passed for that exact commit. Vercel production `dpl_5bnYh1qJmbiNcgvDp7sHMLEYxYWr` is Ready at https://budding-6pqdlvq35-reactic.vercel.app, with both `www.kahiye.app` and `kahiye.app` assigned.

Migration `014_memory_continuity.sql` applied at 2026-10-18 03:06 UTC and was recorded in the repository migration ledger. Post-migration record counts and fingerprints match every pre-migration value below after excluding only the added columns. No family data was deleted or rewritten.

Live verification: home, quiz, immediate support and login returned 200; anonymous memory API returned 401 with private/no-store; admin redirected to login. The existing signed-in family app loaded the memory settings and empty-memory state successfully, and the saved-situations screen appeared without an error. No production notes, decodes or settings were submitted. The new deployment returned no error-level runtime logs during the check.

Supabase security advisories unchanged: two existing public-schema extensions and disabled leaked-password protection remain warnings; five intentionally server-only RLS tables have no client policy. No new findings were introduced.

Local evidence (18 October 2026):
- `npm run check`: lint and TypeScript pass; 22 unit and 9 server cases pass.
- Disposable PostgreSQL: repository migrations through 014; security/admin/intake/guidance suites pass, including memory revision conflicts, cross-parent and cross-child continuity rejection, stopped/corrected outcome preservation, pause at extraction commit, and pending AI suggestions. Existing quota concurrency tests still pass.
- Local HTTP: 28 unauthenticated/origin/redirect checks passed. `node scripts/test-memory-http.mjs` verifies real-route creation retry idempotency, conflict rejection, explicit child scope and two-page retrieval (50 + remainder) against the disposable adapter.
- Real Next routes + local PostgreSQL/RLS + deterministic synthetic AI: add, correction, stop, undo, private entry, suggestion review, per-child pause, sibling isolation, save failure/draft preservation/retry, opening saved guidance, explicit continuation and allowance accounting verified through the browser.
- Inspected synthetic provider input: corrected note included; original correction, private/stopped/pending notes excluded; selected earlier moment included; fresh paused request excluded both saved memory and unselected history. No real model calls or production family writes were used.
- Mobile 390 x 844: no horizontal overflow in memory controls or continuity. Desktop and mobile screenshots in `docs/evidence/memory-controls-*.jpg` and `situation-continuity-mobile.jpg`.

Pre-migration production fingerprints (only hashes/counts inspected): children 1 / `c015d6eda7fb506be7ef65fe6260e41d`; memories 0 and decodes 0 / `a2e4822a98337283e39f7b60acf85ec9`; consents 1 / `d211210a2f01b6af351e3e2350f55658`. Post-migration comparisons exclude only newly added columns.

Rollback: keep additive migration 014 in place. Avoid rolling back to pre-phase-4 context loading after parents use the controls, because it does not honor confirmation, expiry or the pause switch. Repair forward, or temporarily withhold ordinary guidance using a separately verified patch. Never delete memory/history to roll back the UI.
