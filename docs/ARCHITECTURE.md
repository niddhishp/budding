# Kahiye architecture

This is the two-page map for anyone joining the codebase. `HANDOFF.md` is the release log; this explains how the system fits together and which rules must never break.

## Stack

- **App:** Next.js 15 (App Router) on Vercel.
- **Data:** Supabase for Postgres, Auth and private Storage.
- **AI:** Anthropic models. The main answer uses `BUDDING_MODEL` and the narrow checks use `BUDDING_FAST_MODEL`; both are set in Vercel.
- **Payments and messaging:** Razorpay, Resend (email) and Twilio (WhatsApp). All three are switched off until `src/lib/launch.ts` sees every required live credential.

## Shape of the code

| Path | What lives there |
|---|---|
| `src/app/` | Public pages (homepage, articles, quiz, help-now, legal), `/app` (the signed-in shell) and `/admin` (team workspace, MFA). Route handlers live in `src/app/api/**`. |
| `src/PlatformApp.tsx` + `src/views/` | The signed-in single-page shell. The `currentPage` value in `src/stores/appStore.ts` picks the view. Five destinations: Today, Ask, Handbook, Child, You. |
| `src/components/` | Shared UI. `child/` holds the photo strip, `care/` the record hooks and cards, `ui/` the few kit primitives still used. |
| `src/lib/ai/` | Everything that talks to a model: safety triage, routing, two-stage answer generation, content checks, chat and practice, sharing, stories and reports. It never imports Supabase. |
| `src/lib/` (rest) | Domain rules (age, handbook, plans, family planner, BMI), access control (`access.ts`, `access-policy.ts`), and provider adapters. |
| `src/data/` | Editorial content as typed data: Handbook cards, articles, parent guides, milestones. It is version-controlled, not a CMS. |
| `supabase/NNN_*.sql` | Numbered, additive migrations, the single source of schema truth. They are applied in order by `scripts/migrate.mjs`, or through Supabase MCP with a row in `public._budding_migrations`. `schema.sql` is migration 001; `ALL_IN_ONE.sql` is a retired bundle. |
| `tests/` | Unit tests (`*.test.ts`), server tests (`server/*.cases.ts`) and SQL suites (`sql/*.sql`). |
| `scripts/` | Release checks: the disposable-database security suite, real route handlers against SQL, provider races, the render check, SEO and evals. |

## How an Ask request flows (`src/app/api/analyze/route.ts`)

1. Authenticate, check consent and child ownership, and validate the body (Zod).
2. **Safety triage first.** Regex emergencies route instantly. Otherwise `classifySafety` runs with the child's age band. Routing and context loading run in parallel, and their results are discarded off the ordinary path.
3. **Support paths** (urgent, elevated or unavailable) show help routes, log a safety event for review, generate no advice and are never charged.
4. **Reserve the allowance** with `reserve_guidance` in SQL. This handles idempotent receipts, leases and limits.
5. **Two checked stages** (`decodeStaged`).
   - **Stage A:** Right now, Say this, Do this, Leave out and Seek help if. It is linted and reviewed, then sent as the `first` event.
   - **Stage B:** the explanation. It gets Stage A as fixed input, and is linted and reviewed against the combined answer.
6. **Save** with `complete_guidance` in SQL, then send the `done` event. Memory extraction runs afterwards and needs parent confirmation before use.

## Invariants: never break these

- **Safety before advice.** No parenting text is generated before triage finishes. High-risk messages never reach the generator.
- **No unchecked text reaches a parent.** Nothing streams raw tokens. Every displayed field has passed `lintAnalysis` (English, Hindi and Hinglish) and the model review.
- **Never diagnose, and never suggest physical punishment.** These are enforced by the lint, the constitution (`src/lib/ai/doctrine/constitution.ts`) and the evals.
- **Safety is never paywalled.** Support paths don't use the allowance, and Kahiye's own failures (`detailUnavailable`) are not counted.
- **Children's data:**
  - **Parent-only access:** every family table uses RLS with "own read". Writes go through `security definer` functions that check consent (policy `2026-10-05`) and ownership.
  - **Not for AI:** photos are private and never used for guidance.
  - **Not exposed in aggregate:** admin metrics are aggregate only, and any figure built from fewer than 5 families is suppressed.
  - **Portable and erasable:** every erasable table is either exported or listed with a reason (`src/lib/family-export.ts`, with a test guard).
- **Additive migrations only.** Edits to existing functions use the guarded text replacement in 017, 018, 025 and 029, which aborts if the live definition is unexpected.

## Checks before every release

```
npm run check                              # lint, typecheck, unit + server tests
TEST_DATABASE_URL=… node scripts/test-security-db.mjs --bootstrap   # all migrations + SQL suites, fresh pgvector/pg17
TEST_DATABASE_URL=… npx tsx --conditions=react-server scripts/test-family-plan-routes.mjs
npm run test:providers
npx tsx scripts/verify-handbook-render.tsx
npm run build && node scripts/verify-seo-build.mjs
```

CI (`.github/workflows/verify.yml`) runs the same set on every push. A release follows these steps:
1. Push a branch and wait for green CI.
2. Apply new migrations to production first.
3. Fast-forward `main`, which Vercel deploys.
4. Check the live site.
5. Write a release record in `docs/` and add a line to `HANDOFF.md`.

## Known limits

- One author, so every change should go through a pull request (template in `.github/`), even when the reviewer is part-time.
- Clinical review of content is pending.
- Live-model latency and cost per Ask have only been sampled, not measured in production.
