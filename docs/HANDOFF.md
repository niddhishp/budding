# Kahiye — engineering handoff (living document)

Read this first when resuming work. Update it at the end of every working session.
Last updated: 2026-10-17.

**Current execution record:** [Phases 0 and 1 — security foundation](SECURITY-FOUNDATION.md). Database migrations 006–010 are applied and recorded. Legacy public users/sessions/mindmaps and their 20 records were removed with preservation checks; Kahiye identities/data remain intact. Local branch `codex/security-foundation` adds consent enforcement, privacy controls, owner/MFA/admin access, audit and repeatable security tests. Existing agents-v2 changes are preserved. No app push/deployment has occurred. Treat the older infrastructure/work notes below as historical where they differ from that record.

## 1. What this is

**Kahiye** (कहिए, "please, say it") — India-first AI parenting app, pregnancy → 18. Core promise: *the words to say, when it matters.*
Formerly "Budding"; internal names (repo `niddhishp/budding`, Vercel project `budding`, localStorage keys `budding.*`, env vars `BUDDING_*`) intentionally unchanged.

- Live: https://www.kahiye.app (apex redirects to www). Also https://budding-dun.vercel.app (same deployment).
- Repo: github.com/niddhishp/budding, branch `main` → auto-deploys to Vercel (team `reactic`, project `budding`).
- Owner: Niddhish (niddhishp@gmail.com). Acts as founder; Claude acts as CTO and is authorised to make calls.

## 2. Stack

Next.js 15 App Router · Tailwind v3 (OKLCH tokens in `src/index.css`) · Supabase (auth, Postgres, storage) · Anthropic SDK (Claude) · Razorpay subscriptions · Twilio WhatsApp · Remotion (video in `video/`).

Key paths:
- AI: `src/lib/ai/` — `decode.ts` (call helpers, decode, safety, share), `report.ts`, `story.ts`, `weekGuide.ts`; agents v2 work lives in `src/lib/ai/` (see §6).
- API routes: `src/app/api/*` (analyze = decode stream, report, stories, share, week-guide, expert, billing/*, whatsapp/*, account/delete, me, og).
- App shell: `src/PlatformApp.tsx`, views in `src/views/`, store `src/stores/appStore.ts`.
- Design context: `.impeccable.md`. Illustrations: `src/components/illustrations/`.
- Research: `docs/Kahiye_Intelligence_Blueprint.md` (synthesis) and `docs/metaprompt for research.txt` (1,023-section spec).

## 3. Infrastructure state

| System | State |
|---|---|
| Supabase | Project `udqvdkuiwmzhlrqxvvks`; legacy public tables removed on 2026-10-17. Kahiye auth/data preserved. Migrations 006–010 applied; admin and consent foundation live. See the security record for verification and remaining advisories. Historical SMTP/site settings below require provider verification before launch. |
| Vercel env | Set: NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_SUPABASE_URL/ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, BUDDING_FAST_MODEL=claude-haiku-4-5, RAZORPAY_* (test), TWILIO_* (sandbox numbers). |
| Razorpay | TEST mode on Lightseeker Films account. Plans `plan_TkKEoLEQwSKXEU` (₹299/mo), `plan_TkKFO3uEkbBZWm` (₹1,999/yr) — names still "Budding Plus" (recreate as "Kahiye Plus" in live mode). Webhook → `budding-dun.vercel.app/api/billing/webhook`, 10 subscription.* events. |
| Twilio | Sandbox only; webhook not yet pointed (needs user login). Production needs own number + Meta verification. |
| Email | Resend account exists (user). TODO: verify kahiye.app in Resend (DNS via Vercel), set Supabase SMTP, RESEND_API_KEY + EXPERT_NOTIFY_EMAIL in Vercel. Receiving mailbox (Zoho/Google) optional. |
| Local | `.env.local` holds existing billing settings and now a public Supabase publishable key. Server service-role/Anthropic credentials are still not configured locally. Do not print or commit environment values. |

## 4. Product decisions (do not relitigate without reason)

- Pricing: Free 3 decodes/week · Plus ₹299/mo or ₹1,999/yr · fair use 10/day · 1 free story · English share free, Indic languages Plus.
- Brand: warm paper, clay accent, Young Serif + Atkinson Hyperlegible Next + Mukta; cut-paper illustrations; no stock photos.
- Doctrine (from blueprint, adopted): never diagnose; safety never paywalled; no physical punishment; evidence labels; NLP excluded as a named framework (mechanisms kept as reappraisal / reflective listening / MI); temperament = current patterns, not labels; parent capability > dependency.
- Agent runtime shape (CTO call): fast router + doctrine modules composed into ONE streamed generation + critic; heavy agents (memory consolidation, reports, content, evals) run offline. Not 17 sequential LLM calls.
- Public quiz types kept for sharing, reframed as "this season's pattern", never identity.
- Evidence citations: only hand-verified evidence cards may be cited; blueprint citations are leads, not facts.

## 5. Open items for the owner

1. Resend + SMTP (see §3). 2. Twilio login to point sandbox. 3. Lock/drop Synaptix tables. 4. Legal placeholders in /privacy, /terms + Grievance Officer. 5. Trademark search "Kahiye". 6. Razorpay live mode (KYC, live plans named Kahiye Plus, live webhook to www.kahiye.app).

## 6. Agents v2 — build log

See §7 for status. Plan:
1. Safety constitution in code — safety before paywall, 3-tier crisis ladder, abuse-disclosure protocol, `safety_events` review queue, crisis turns don't consume quota.
2. Orchestrator v2 — router → doctrine modules + evidence cards → richer streamed answer (right-now, say-this, hypotheses, do/avoid/later, watch, seek-help, why-it-works with labels, optional clarifying question) → critic.
3. Child profile v2 — age-banded intake (dimensions + focus areas + household), retake for existing children, public quiz age-aware.
4. Memory v2 — typed memories with provenance/confidence; write gate; "What Kahiye remembers" (view/delete/add).
5. Eval harness — golden set + red-team suites in `scripts/eval/`; run with ANTHROPIC_API_KEY.

## 7. Status

**2026-10-06 — Agents v2 code-complete (steps 1–5). Not yet committed/pushed.** typecheck, eslint and `next build` pass.

**Deploy gate:** `supabase/006_agents_v2.sql` must be applied BEFORE pushing — the app now selects the new `children` columns and inserts `decodes.safety_category` / `refines`. Paste it into the Supabase SQL editor (project udqvdkuiwmzhlrqxvvks), then commit + push `main` (Vercel auto-deploys).

What landed:
- `src/lib/ai/` — `llm.ts`, `safety.ts`, `router.ts`, `critic.ts`, `memory.ts`, `doctrine/` (constitution, 20 modules, 7 stage bands, 34 evidence cards); `decode.ts` rewritten as one streamed, composed generation.
- `/api/analyze` — safety first, paywall only if no safety signal, router → decode → critic, `safety_events` + memory writes in `after()`; free refinements via `refines`. WhatsApp webhook mirrors it.
- `/api/decodes/[id]/outcome` — outcome → what-worked / what-didn't memory.
- Ask page — right-now line, hypotheses, watch-for / seek-help, "why this works" with evidence labels, clarify chips, tiered safety banner.
- Child profile v2 — `lib/temperament.ts` has 5 age-banded question banks (infant/toddler/preschool/middle/teen, same trait order so share links still decode), focus-area chips per stage, household, languages, notes. `GenomeOnboarding` handles add and **Update profile** (store `updateChild` / `editingChildId`). Child page shows "This season's patterns", flags answers given for a younger age, and lists profile details.
- Memory UI — `components/MemoryPanel.tsx` ("What Kahiye remembers": grouped by kind, provenance, delete, add a note).
- Public quiz — age step first, band-specific questions, "This season, X's pattern looks like…" copy (result page, OG image, share text).
- Eval harness — `scripts/eval/cases.ts` (29 cases: golden per stage, crisis, false alarms, diagnosis, discipline, pseudoscience, injection, Hindi) + `run.ts` (assertions + LLM judge, JSON report in `scripts/eval/results/`, non-zero exit on failure). `npm run eval` (flags: `--suite=`, `--only=`, `--safety-only`, `--no-judge`, `--concurrency=`). Needs `ANTHROPIC_API_KEY` in `.env.local` — not yet added, so evals have NOT been run.

Next:
1. Owner: apply 006 → then commit + push.
2. Owner: add `ANTHROPIC_API_KEY` to `.env.local` → `npm run eval`; fix failures (add a case for every real-world failure first).
3. Re-test the 11-year-old intake end to end on www.kahiye.app (Update profile on the existing child).
4. Then the §5 owner items; Resend once a mailbox/domain plan is chosen (Vercel domains have no mailboxes — see §3).
