# Phase 3: everyday moments

Approved direction: retain pregnancy-to-18 coverage, make onboarding optional and conversational, preserve existing profiles and deploy after verification.

## Experience
- A nickname and birth/due date are enough to start. Four optional, age-matched scenes offer a gentler introduction.
- One scene at a time; choose, pause, go back, skip or finish early. No correct answers, scores, fixed types or completion rewards.
- Results repeat what the parent chose and offer small ideas to try, without claiming to explain the child.
- New result links contain no name. Sharing choices is explicit. Existing six-digit result links remain readable.
- Profile edits preserve unanswered values and household context. Skipped new answers remain unknown to guidance.

## Implementation order and dependencies
1. Add nullable answered-key metadata to children, with constraints and existing ownership policies. No backfill or deletion.
2. Shared age-specific scenes, validated local handoff and anonymous versioned share format.
3. Public quiz, optional onboarding, honest profile display and prompt context using only known current answers.
4. Unit and SQL ownership/constraint tests; synthetic browser checks for navigation, skip, save failure, profile preservation, pregnancy and mobile.
5. Type/lint checks, production build and CI; additive migration, deployment, production public-flow smoke test and handoff.

## Compatibility
`intake_answered = null` identifies legacy profiles; an empty array means no observations supplied. Numeric legacy fields stay in place for compatibility. Age-stale observations are retained but excluded from current guidance. The quiz is an informal reflection, not a validated psychological assessment.

## Release verification
Implemented: shared scenes for all five age bands, optional basic profile path, explicit public-quiz handoff, partial retakes, reflection and share links, honest profile observations, and known-only observations in decode/story/report context and dashboard cards. The profile no longer presents static milestones as completed personal achievements.

- `npm run check`: lint, TypeScript, 19 general/unit tests and 6 server safety tests pass.
- Disposable PostgreSQL: all migrations 001–013, security/admin/consent/tenant checks, optional-intake constraints, guidance idempotency and concurrent quotas pass. Fixtures roll back.
- Browser with synthetic auth and disposable database: forward/back choice retention; explicit skip of a selected final answer; anonymous shared reflection; basic profile -> help; failed-save draft retention and retry; one-answer legacy update with unchanged remaining values/household/language/notes; empty retake with identical persisted profile; pregnancy -> dashboard; all four skipped -> neutral result; native keyboard radio navigation; 390px mobile layout without horizontal overflow.
- Test adapter now supports PATCH preflight and object responses on writes. Browser date controls were exercised using native keyboard segments, because automation fill did not dispatch the date change event.
- `npm run test:http`: all 24 protected-route and origin checks passed against the local production build. Existing six-digit shared results also rendered in that build.
- Production build passed. Existing Browserslist freshness and Next ESLint-plugin warnings remain non-blocking.
- No real family write, AI provider call, consultation or external message was used for browser verification.

## Deployment and rollback

Apply migration 013 after CI verification and before deploying this code. Record it in `_budding_migrations`. Compare the child fingerprint before/after, excluding the new nullable column after migration. Preserve all data; do not backfill guessed answers.

Prefer a forward fix if needed: old app versions do not understand unanswered metadata and may treat compatibility numeric defaults as actual observations. Do not delete the column or family records to roll back.

Status: deployed and live-verified. The release entry below identifies the exact commit, CI and live checks.


## Production verification — 18 October 2026

- Migration 013 applied successfully and recorded. Existing child fingerprint before and after (excluding the new nullable column): `840702198c741b3ebc14c0c5d731079c`; one child, with its metadata marker still NULL. No backfill, deletion or replacement.
- Counts unchanged: children 1, consents 1, staff 1; decodes, stories, experts and consultations 0.
- Initial release `7814e0d3e81db64fe06938a40d44322561f8eb13` passed [CI](https://github.com/niddhishp/budding/actions/runs/39064179014) and deployed as `dpl_8sLhV6cS2AoACiiTfcFBaL65m753`, Ready in 33 seconds with both Kahiye domains assigned.
- Live browser: age selection, scene selection/feedback and shared anonymous reflection passed; no browser console errors. Mobile evidence: [live screenshot](evidence/playful-quiz-mobile.jpg). Production checks did not finish a test quiz into the user's browser storage or write a family record.
- Live HTTP: quiz, new result, legacy result, help and login 200; signed-out app/admin 307; account/admin APIs 401.
- Initial production runtime error scan: zero records in the deployment's release window. This is a point-in-time smoke check, not a continuous monitoring claim.
- Supabase advisor reports no error-level findings. Existing warnings remain: [extensions in public](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public) and [leaked-password protection disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Server-only tables intentionally use RLS without client policies.
- Disposable browser adapter, local server and test database were stopped after verification.

Final copy clarification: shared results do not promise to import someone else's choices; the legacy result invitation now points to the new four-moment experience. Final code commit `05d5a7a520bb26145b9b421c5484388ea22bf53e`; [CI passed](https://github.com/niddhishp/budding/actions/runs/39064454236). Released through main as `dpl_DXYPfDsW7g7qoRMSQuP2zfPNRtum`, [deployment](https://budding-a9imuubvj-reactic.vercel.app), Ready in 31 seconds and assigned to both Kahiye domains. The final shared-result wording was verified in the production browser; the final deployment error scan returned zero records. The signed-in production app loaded the existing family profile successfully without any family write.
