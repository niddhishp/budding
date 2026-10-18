# Phase 6: family resources and launch foundations

User authorization: complete the next phase, add the supplied 20 article topics, growth tracking with percentiles, milestone alerts, a play centre and a fuller pregnancy section. Preserve existing work/data and retain the pregnancy-to-18 vision.

## Design and implementation order

1. Public, searchable article library at /articles and individual article pages. All 20 requested subjects, original practical writing, source links, category, age context, calculated reading time and visible editorial status. No invented clinician names or claim of clinical review. Indexable metadata and sitemap entries. Retain the current paper/clay typography.
2. Add a Discover navigation destination linking the article library, growth, milestones, play and pregnancy tools. Preserve the primary Decode loop. Load these tools only when visited.
3. Additive parent-owned storage: dated growth entries (kg/cm, measurement method, archive/undo, revision checks) and per-child care settings (explicit chart reference, preterm caveat, optional milestone reminders, saved observations, pregnancy checklist/notes, favourite play). Auth, current consent, cross-child ownership, bounded payloads and erasure cascades enforced at the database and API. New data never enters AI context automatically.
4. Growth: actual measurements plus WHO reference curves for birth to two years from the CDC-published daily LMS dataset. Preserve the downloaded source and checksum. Calculate by exact age in days; compare recumbent length only; suppress percentiles outside supported age/method, when reference is unknown or preterm is selected. Older children can retain measurements without unsupported percentiles. No diagnosis, targets or growth scores; include an accessible data table.
5. Milestones: age-based examples through five years with links to full CDC checklists. Optional in-app reminders for the current/next checklist, dismissible and saved per child. Observations are parent-reported, never an exam or completion score. No push/email notification permission is requested and no outside messages are sent. Developmental concerns or lost skills point to a clinician, not an AI conclusion.
6. Play: age/context filters, specific low-preparation activities, materials, short steps, supervision and stop cues; saved favourites. Pregnancy: gestational dates, trimester guidance, preparation checklist, private questions/notes for appointments, support planning, clear urgent-care guidance and a profile-edit path after birth. Keep the existing optional weekly guide.
7. Launch foundations: billing duplicate/out-of-order webhook handling and paid-period expiry; truthful disabled checkout/WhatsApp state until production providers are activated; owner/operations launch-readiness view with configuration checks and explicit manual gates. Do not pretend SMTP, verified WhatsApp, KYC, legal identity or clinical review can be supplied by code.

## Alternatives and boundaries

A CMS-first rollout would delay the useful family tools; a large automatic health dashboard would imply clinical capability and add notification infrastructure. Use authored version-controlled articles and deterministic reference tools now, with existing role permissions ready for later editorial operations. No percentile extrapolation, automatic diagnosis, inferred sex/reference, automated medical reminders, fabricated experts or paid-provider activation.

## Verification

Unit tests for reference values, age boundaries, suppression, reminder dates and content integrity; SQL ownership, consent, revision and erasure tests; billing replay/order tests; HTTP guards; desktop/mobile browser save/reload/error workflows; CI/build; production migration fingerprints and read-only live checks. No real payments, messages or production test families.

Release evidence will be appended as checks finish.

## Implemented and locally verified, 18 October 2026

- Discover is now the fifth parent navigation destination. Existing Decode, Stories, profiles, memories and consultation work are preserved. The mobile support link was moved away from the navigation controls; section changes reset the content scroll position.
- Twenty original editorial guides cover every requested title, with search, category filters, individual public routes, sources, real calculated reading times, metadata and sitemap entries. Articles are version-controlled content, not an admin CMS. No clinician approval is implied.
- Growth records support date, kg/cm units, three measurements, lying/standing method, corrections, archive/undo and optimistic revisions. The downloaded WHO source is retained byte-for-byte with checksum and provenance. Reference comparisons are deliberately limited to full-term infants, exact ages 0–730 days; older children retain raw measurements. Unknown reference, premature birth, standing height and extreme values suppress the relevant percentile.
- Optional in-app milestone notices use the child's recorded birth date, current/next CDC age checklist through five years, per-child dismissal and private observations. No email, push or clinical monitoring is implied.
- Twelve play invitations have age/energy filters, materials, steps, supervision/stop cues and saved favourites. Pregnancy adds gestational dates, trimester context, appointment questions, six preparation reminders, private notes with explicit save, urgent-care guidance and the existing profile edit/birth path.
- New care data never enters the AI memory/context loaders. Migration 016 adds parent-only tables and consent/ownership/revision-enforcing functions. Account/child deletion cascades to these records.
- Migration 017 records signed billing events transactionally, deduplicates receipts, applies event ordering with conservative same-second ties, and grants access only to a captured subscription charge's bounded paid period. Old subscription events never replace a newer subscription using event notes. Checkout creation is reserved once per parent; an uncertain provider outcome blocks another creation until reconciled. Cancellation remains available for renewable plans even if paid access expired.
- Paid checkout is closed by default and requires explicit live configuration. WhatsApp remains disabled: verified sender onboarding and durable delivery are still outstanding, not silently treated as complete. The owner/operations launch-readiness page makes operational dependencies visible.

Verification: lint, TypeScript and 42 unit/server tests passed. Full disposable PostgreSQL security suite passed, including new care ownership/consent, stale writes, retry, archive/undo, billing order/replay, checkout reservation and erasure checks, plus existing quota/capacity concurrency tests. Forty unauthenticated/origin/public-route HTTP checks passed. The authenticated disposable API test covered care persistence, bad dates/payloads, unknown children, stale revisions, service gates and signed malformed webhooks.

Browser verification used synthetic families and real application routes/SQL: measurement save, archive/restore, preterm percentile suppression, sibling isolation, milestone observation/dismissal, saved play filtering, pregnancy checklist/notes, save-failure draft retention and reload persistence. Public article search/detail and the MFA owner launch page were checked. Mobile layout was checked at 390×844; browser viewport restored afterwards. No production test families, payments or messages were created.

## Operational boundaries and rollback

Before enabling paid plans, finish provider test-mode reconciliation, successful/failed charges, cancellations, refund/dispute policy, merchant KYC and price verification. The existing test plans are not live products. A stale `billing_checkout_attempts` row requires checking the provider dashboard for an already-created subscription before the operator resolves it; do not blindly clear the reservation and retry. Unmatched webhooks return a retryable failure and need operator investigation. No raw payment payload is stored.

Resend recipient/sender configuration, authentication SMTP, verified WhatsApp delivery, the real expert roster, named clinical review and legal entity/grievance details remain operational release gates. Do not change article review labels until a real review has occurred. This delivery adds family tools and launch foundations; it does not claim the commercial-launch checklist is complete.

Migrations are additive. Roll back application code if needed and retain the new tables and user records. Never drop care records or reset existing family data as a rollback step. Reverting to old billing code would restore its incorrect access rules; keep checkout closed during any rollback.

## Production database verification

Migration 016 applied at 2026-10-18 04:13:21 UTC; 017 at 04:13:24 UTC, with matching `_budding_migrations` entries. Before/after counts and ordered JSON fingerprints matched exactly: children 1 (`34bf618b4fa232dfff3b05f44485e7c0`), consents 1 (`8c1e356407206a52b355b2e84ddd06fa`), admin memberships 1 (`788305158078c020993a553041b9f34e`). Experts, consultation requests, memories, decodes and subscriptions remained empty (`d751713988987e9331980363e24189ce`). No existing rows were rewritten. All four new tables have RLS; anonymous reads and authenticated direct inserts are denied.

Security advisor findings: no new warnings. Two new informational “RLS without policies” findings are intentional server-only billing tables with anonymous/authenticated privileges revoked. The existing [public extension warnings](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public) for vector/pg_trgm and [disabled leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) remain. Review these separately before commercial launch; do not move extensions blindly and break existing indexes/functions. [Server-only RLS information](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

GitHub CI [39096265823](https://github.com/niddhishp/budding/actions/runs/39096265823) passed every step for code commit `cea1e0117db2cbac97874eedc0e02cabc2f4e056`, including a clean database bootstrap through 017. Main was fast-forwarded from `ccaf08d` to that exact commit after CI success.

## Production release and final checks

Vercel deployment `dpl_6ch2V7NSFRz1z9jcLjAudqvz8sRy` is Ready, production target, exact code commit above. Deployment URL: https://budding-hd77tlb8p-reactic.vercel.app. Production aliases include https://www.kahiye.app and kahiye.app.

Live verification: article index and all twenty detail pages returned HTTP 200 with their source sections; the sitemap contains all twenty. `/api/availability` reports billing and WhatsApp false. Unauthenticated care requests return 401; private app and admin launch routes redirect to login. A short production error-log query at 04:16:27 UTC returned no records in its five-minute window; this is a bounded smoke check, not an ongoing monitoring claim.

The existing authenticated family session loaded the new Discover destination and growth screen successfully, including its empty measurement history and explicit reference choice. No real family data was changed. A public article-library screenshot was captured after deployment. Temporary test browser tabs, local application/test adapters and the disposable test database were stopped; the user's original app tab was preserved.
