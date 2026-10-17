# Phase 2: dependable guidance

Approved continuation, 18 October 2026. Preserve pregnancy-to-18 profiles and existing data; launch focus remains everyday parenting ages approximately 3–10.

Implementation order:

1. Safety is a hard boundary: urgent/elevated inputs receive existing fixed support content, classifier outages receive an explicit unavailable response, and ordinary advice is held until validation. No raw generation reaches the browser. Repair must pass validation again. Public immediate-help information does not require sign-in, consent, a child profile, or AI availability.
2. Apply the shared constitution and output checks to stories, reports and caregiver messages. Pregnancy guides require an explicit publication review instead of automatically publishing model output. Do not label automated checks as clinical review.
3. Bound provider calls and cancel abandoned requests. Key child-specific screens and guard asynchronous work, history, narration and sharing. Feedback shows saving/saved/failure and can be retried.
4. Enforce database-serialized usage reservations, request identity and bounded refinements; distinguish failed requests from successful usage. Durable follow-up work must be recoverable and privacy-scoped.
5. Verify with synthetic fixtures, interrupted/failed-provider cases, cross-child switching, concurrent requests, build and live protection checks before release.

Subsequent approved work: optional one-scene-at-a-time quiz and quick first help (phase 3); memory correction/expiry and situation continuity (phase 4); remaining expert capacity/overdue/delivery operations (phase 5); billing/webhook reconciliation, SMTP, WhatsApp delivery and launch gates (phase 6). Existing admin roster and consultation workflow are already live. Legal identity/contact details, clinician review and payment/provider activation require real operational inputs; they must not be invented.

## Implemented in this release

- Ordinary responses are complete, schema-validated and independently checked before exposure. Repair failures and unsafe repaired text are withheld; recursive lint covers nested generated fields. Router follow-up questions are included in the content review. Emergency/elevated and unavailable-classifier paths are terminal, with no generation reservation or charge.
- Stories, weekly reports and caregiver messages use the same content gate. Unreviewed pregnancy-guide records remain preserved but cannot be published automatically. A clinician/content-review workflow remains to be implemented before publishing those guides.
- Child changes remount scoped views and abort their pending requests. Responses verify the child identity. Stop/retry preserves the moment, and request receipts recover a committed result without creating it again. A disconnect can happen after a successful save; the UI does not promise that cancellation undoes an already committed result.
- Server-only reservation and completion functions serialize usage, including across app and WhatsApp. Output and receipt commit together. Free limits: 3 ordinary decodes per rolling week, 1 story lifetime, 5 caregiver messages per rolling day. Plus: 10 ordinary decodes, 3 stories, 20 messages per rolling day; one report per child per rolling day. At most two active provider generations per account. A request has three attempts; ordinary generation attempts across features are capped at 20/free or 100/Plus per rolling day. Fixed immediate support remains accessible.
- Refinements must refer to an owned, same-child root with an actual offered answer, within 30 minutes. No refinement chaining; at most two reservations per root. The UI offers one follow-up and does not create a new question chain.
- Feedback and its derived memory are atomic. WhatsApp feedback confirms persistence and stays tied to its last discussed child; reliable inbound/outbound delivery remains phase 6 work.
- Memory extraction has a durable job record, bounded leases and three attempts. Initial completion and subsequent `/api/me` visits attempt pending jobs. Consent and ownership are rechecked at processing/commit. Archived/sensitive memories are excluded from generation context. This is opportunistic recovery, not yet a scheduled queue with operations alerts.

## Verification

- `npm run check`: lint, TypeScript, 14 client/security tests and 6 server safety/provider-failure tests.
- `npm run test:security:bootstrap`: all repository migrations in disposable PostgreSQL, previous security/admin tests, new receipt/lease/consent/refinement/job/outcome privilege assertions. Eight real concurrent connections compete for one remaining allowance; exactly one is reserved.
- `npm run build`: optimized Next build passed. Existing Browserslist freshness and ESLint-plugin configuration warnings remain non-blocking.
- `npm run test:http`: 24 public/protected-route and origin checks pass against local Next.
- Local browser adapter: real Next routes and database/RLS with synthetic auth and deterministic AI. Verified ordinary checked/saved output, feedback saving/saved, classifier outage, emergency without AI, rejected output, explicit save failure/retry, late-response child separation, and story persistence. No real family records or messages used.
- Run `scripts/test-guidance-browser.mjs` only against the named local disposable database. Its synthetic provider is test infrastructure; these checks are not a live-model quality evaluation or clinician review.

## Production release evidence

- Code commit: `a1fb9bcfb67c93a30434cf6b5b9f7555746070ae`, released through `main`.
- [GitHub verification](https://github.com/niddhishp/budding/actions/runs/39061914769): all steps passed for that exact commit.
- Vercel production deployment: `dpl_FYMnMLXaG9dSiTw8xWHqk7yHF5s8`, [deployment URL](https://budding-ix0rml2ie-reactic.vercel.app), Ready and aliased to `www.kahiye.app` and `kahiye.app`.
- Migration applied and recorded in the application ledger. Initial connector request expired without applying anything; a read-only check confirmed absence before retry. The retry succeeded.
- Before/after preservation: one child, one consent, one staff membership; child-record fingerprint unchanged. Existing generated content, expert records and consultations were empty and remained empty. No real-parent generation or consultation test was submitted.
- Live `/help-now` and `/login` return 200; signed-out `/app` and `/admin` redirect to login; `/api/admin/overview` and `/api/me` return 401. Browser confirmed the public help page and no console errors.
- Production permissions verified: parent cannot call generation reservation RPC, read receipts, or directly insert generated decodes; service role can reserve and parent can submit feedback.
- Security advisor: no error-level finding. Intentional no-policy RLS tables are server-only. Existing warnings remain for [extensions in public](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public) and [disabled leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). These are not represented as resolved by this release.

## Release and rollback

Production migration: `012_guidance_reliability.sql`. Additive tables/columns and access restrictions; no existing Kahiye data is deleted. Apply only after disposable-database verification, record it in `_budding_migrations`, then deploy the matching server code. Existing counts are checked before and after migration.

Do not roll the app back to a release that inserts generated records directly without also planning the matching database permissions. Prefer a forward fix; keep reviewed migration history. Never drop family tables to roll back.

Status: deployed and live-verified on 18 October 2026. Engineering verification is not clinical validation or market readiness. Pending: live-model regression evaluation, clinician sign-off, publication review UI, scheduled job recovery/alerts, durable WhatsApp delivery, and the subsequent phases above.
