# Kahiye: phases 0 and 1

Implementation record: 17 October 2026. Scope approved by the founder: preserve Kahiye work and data, retire legacy application data, establish security and admin access. The pregnancy-to-18 vision, existing agents-v2 work and child profile experience remain intact. A focused everyday-parenting launch, playful optional onboarding and the expert directory/consultation workflow remain subsequent phases.

## Release boundary

**Database and application changes are live.** On 17 October 2026, after explicit deployment approval, release commit `bdc62e3bbc75e5bf2238bc2ebd1bc1d8e4a66292` was pushed to `main` and deployed to `https://www.kahiye.app`. The release branch remains `codex/security-foundation`.

Production deployment: `dpl_3aDexvQVMVxsnGLx5FkfGYPUjf1a`, `https://budding-mxgu8a88g-reactic.vercel.app`, Vercel status READY, build duration 33 seconds. The existing aliases `www.kahiye.app` and `kahiye.app` point to this deployment. Rollback target: `dpl_69cMf3Na4FNQx8KuzZHp4BQ8626H` (`https://budding-jwhy6sbup-reactic.vercel.app`).

[GitHub verification run](https://github.com/niddhishp/budding/actions/runs/39053051872) passed before the production push: clean install, lint/types/unit checks, clean-database migrations/security tests and production build. Twelve live HTTP checks passed after deployment: public pages, admin/privacy redirects, unauthenticated API rejection, foreign-origin rejection and security headers. Browser verification reached the real admin sign-in screen. The new deployment's error-log scan returned zero records in the checked release window. Authenticated owner enrollment still requires the owner; no sign-in email, AI generation, payment or WhatsApp message was triggered by release verification.

Baseline source HEAD: `efa278724811951eb978cd4b9f6d2cde8a806ea3`. All 199 tracked/non-ignored source files, including uncommitted agents-v2 work, were copied with SHA-256 hashes to:

`C:\Users\Admin\.codex\visualizations\2026\10\17\01a14a81-9a08-7f22-ab03-d2a79055ac2f\kahiye-baseline-20261017`

No environment secrets, dependency directories or generated build files were included. No original source file was deleted. The pre-existing Kahiye work was preserved and included in the release commit alongside the security foundation.

## Database retirement and preservation

Project: `udqvdkuiwmzhlrqxvvks` (Kahiye).

| Item | Result |
|---|---|
| Legacy `public.users` | Removed 3 records and table |
| Legacy `public.sessions` | Removed 10 records and table |
| Legacy `public.mindmaps` | Removed 7 records and table |
| Legacy enums and timestamp trigger function | Removed with dependency-restricting drops |
| `auth.users`, identities and sessions | Preserved; these belong to Kahiye |
| Kahiye data | Preserved, including 1 child and 1 existing consent |
| Storage buckets/objects | Preserved; private `story-audio` bucket retained |

Migration 007 first removed public/anonymous/authenticated privileges and enabled RLS on legacy tables. Migration 008 then removed only the named legacy objects, without CASCADE. It locked and fingerprinted every nonlegacy public table plus auth users/identities/sessions and storage buckets/objects, comparing the contents before commit. A mismatch would have rolled back deletion. Both migration applications succeeded. No copy of legacy data was exported; provider-managed historical backups remain subject to provider retention.

Migration 006 was already present structurally but absent from `_budding_migrations`. Its idempotent statements were reapplied and recorded. Migrations 007–010 are recorded in both the repository ledger and Supabase's tool-managed migration history. Do not replay them manually on production.

## Access model

```mermaid
flowchart LR
  Parent[Parent request] --> Identity[Verified sign-in]
  Identity --> Consent[Current consent]
  Consent --> Ownership[Owned child and records]
  Ownership --> Process[Guidance or write]
  Staff[Staff request] --> Session[Live auth session]
  Session --> Membership[Active database membership]
  Membership --> MFA[JWT and current session both at AAL2]
  MFA --> Owner[Owner-only team management]
  Owner --> Audit[Atomic access-change audit]
```

- Parent APIs use `requireParentAccess` before AI processing or new sensitive writes. It fails closed on authentication or consent lookup errors. Signed Twilio processing checks the linked parent's consent explicitly because the webhook uses the service role.
- Restrictive RLS consent policies cover writes to children, logs, decodes, memories, reports, stories and expert requests. Client-side SDK calls cannot bypass them. Existing ownership policies still apply.
- Expert requests cannot reference another parent's child. Memory sources and decode refinements must belong to the same parent and child.
- Consent timestamps come from PostgreSQL. Every acceptance/update/withdrawal produces a receipt that the parent can read but cannot alter. Existing consent is preserved without inventing a new historical receipt.
- The current policy version remains `2026-10-05`. A future material policy change requires a forward database migration updating the consent functions and a coordinated change to `src/lib/consent.ts`; never silently change only one side.
- `/app/privacy` provides withdrawal, renewal cancellation, account erasure and sign-out even when the main app consent gate is visible. Withdrawal does not delete existing records, cancel billing, or abort processing already underway.
- Cookie-authenticated API writes require a same-origin request. Signed provider webhooks retain their separate signature checks. Protected responses use private/no-store caching. Missing auth configuration yields 503 instead of allowing access.
- Admin authorization does not trust user-editable metadata, email-domain checks or a hidden navigation link. Every check reads active membership and verifies the session still exists. Both the verified JWT and current database session must be at AAL2 for privileged access.
- Roles are `owner`, `operations`, `therapist`, `content_reviewer`. Only an MFA-verified owner can manage memberships and read access history. Other roles currently get the protected team landing page; **none of these memberships grants access to family records**. Assigned-case permissions and expert administration belong to the later expert-workflow phase.
- Membership changes and audit insertion are one database transaction. Clients cannot insert/update memberships or forge audit rows directly. Last-owner protection also applies to service-role writes and account deletion. Active owners must transfer responsibility and pause their owner membership before erasure.
- Privileged functions live in an unexposed `private` schema with fixed search paths. Public RPC wrappers are security invokers and explicitly deny anonymous execution. A database operator/service-role holder remains a privileged break-glass authority; this is not a claim of tamper resistance against the database owner.

## Owner onboarding and recovery

The existing confirmed `niddhishp@gmail.com` identity, verified against the documented founder account, is the first owner. No new identity or invitation was created; no email or WhatsApp message was sent.

After deploying the application:

1. Sign in with the existing owner account and open `/admin`.
2. Enroll an authenticator at `/admin/verify`, then verify a six-digit code. The authenticator secret is only held in component state during setup.
3. Have a teammate sign in to Kahiye with their email. An owner can then add/change their role or pause/restore access. The UI clearly states that this does not send an invitation.
4. Verify a second owner independently before relying on them for continuity. A second owner can pause a compromised membership immediately.

For a lost authenticator, an authorized infrastructure operator must verify the person's identity out of band, review the affected Supabase Auth factors/sessions, revoke affected sessions and reset the affected factor through Supabase's supported admin controls. Never add an MFA-bypass route. Verify re-enrollment and record the recovery action in the operating log. The first owner must complete enrollment personally; that step has not been performed by the agent.

## Verification and repeatable checks

`npm run check` runs ESLint, TypeScript and the access-policy tests. `npm run build` builds the production bundle. The lint script now works with Next 15. CI runs those checks plus a clean PostgreSQL migration/security test, using synthetic data and no production secrets.

Disposable database setup (PowerShell):

```powershell
docker run --detach --rm --name kahiye-security-test --publish 127.0.0.1:55432:5432 --env POSTGRES_PASSWORD=disposable-test-only --env POSTGRES_DB=kahiye_security_test pgvector/pgvector:pg17
$env:TEST_DATABASE_URL='postgres://postgres:disposable-test-only@127.0.0.1:55432/kahiye_security_test'
npm run test:security:bootstrap
npm run test:security:db
docker stop kahiye-security-test
```

Wait until PostgreSQL is ready before bootstrap. Bootstrap requires an empty database and never resets existing data. The test runner refuses remote hosts and the production project identifier, and never loads `.env.local`. Its minimal auth/storage scaffold exercises real PostgreSQL grants/RLS; it is not a full Supabase Auth emulator. Tests were also run against the actual Supabase schema in a single rolled-back transaction. That live SQL test is a deliberate operator action, not an automated CI step.

Verified cases include anonymous denial, missing/withdrawn consent, cross-parent read/update/delete, cross-parent expert/memory/refinement links, valid own-child writes, editable metadata spoofing, direct membership/audit forgery, non-owner escalation, owner MFA, stale MFA after session downgrade, revoked sessions, paused memberships, role-change audit, last-owner protection in the disposable database, and erasure of non-owner staff/consent receipts. Synthetic identities were confirmed absent after live testing.

Browser/API checks verified the signed-out admin redirect, 401 responses for protected APIs, foreign-origin 403 responses, valid-origin requests reaching authentication, and 503 on missing configuration. **Authenticated owner enrollment and staff editing have not yet been exercised in a browser**, because the owner's personal sign-in/authenticator belongs to the owner. No live AI generation, paid billing or WhatsApp delivery was triggered.

The final production build passed. Nine request-level checks against that build also passed, including account-deletion CSRF rejection and security headers. Reproduce them by starting `node node_modules/next/dist/bin/next start -p 3010 -H 127.0.0.1` after a build and running `npm run test:http` in another terminal. The local test container was disposable; no test identities remain in production. A separate empty-database test confirmed `scripts/migrate.mjs --check` creates no tables and excludes the old manual installer.

The migration runner now excludes `ALL_IN_ONE.sql`, uses a read-only transaction for `--check`, serializes migrations, and verifies TLS on remote database connections. If the provider requires a custom root certificate, set `SUPABASE_DB_CA_PATH` to the trusted certificate file; do not disable certificate verification.

## Release checklist and known limits

- Review the complete working tree against the source snapshot, including the pre-existing agents-v2 changes, before committing. Do not mistake that older work for changes introduced by this phase.
- Configure the preview deployment's required server credentials without copying production secrets into source or CI. A public publishable Supabase key was added only to ignored local `.env.local`; local service-role and AI credentials remain unconfigured.
- The branch build, GitHub CI and production deployment succeeded. Complete owner sign-in/MFA and authenticated role-management acceptance on the live admin screen; the agent did not enroll the owner's personal authenticator.
- Confirm current custom SMTP, sender verification, live payments and WhatsApp configuration before market launch. The older handoff's infrastructure claims are historical until checked against the provider dashboards.
- Supabase's security advisor reports no public table with RLS disabled. Its three no-policy notices are intentional service-only tables: migration ledger, safety events and WhatsApp link codes.
- Remaining advisor warnings: [extensions in the public schema](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public) (`vector`, `pg_trgm`) and [leaked-password protection disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). The UI uses email links, but the provider setting should still be reviewed before launch. No paid provider plan/configuration was changed.
- Existing build notices: stale Browserslist data and missing Next-specific ESLint plugin. Core lint, types and build pass; these notices are not evidence of a complete launch/security certification.
- No public content/medical-safety claims were strengthened. Clinical escalation, model evaluations, consent-purpose/legal review, rate/cost controls, billing/webhook idempotency, expert fulfillment, and market-readiness gates remain later work.

## Rollback

Preserve the source snapshot and review individual file diffs to restore an application change; never run a blanket reset of the user's working tree. Prefer a forward fix for access-control problems. Database RLS and owner safeguards should remain enabled if the frontend is rolled back; the existing consent flow is compatible with server-stamped timestamps and current version checks.

The legacy deletion is intentional and is not reversed by an app rollback. Do not restore retired tables into the exposed public schema. Any exceptional recovery from provider backups must be into an isolated environment after a separate decision. The source snapshot is not a database backup.
