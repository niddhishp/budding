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
- Production build passed. Existing Browserslist freshness and Next ESLint-plugin warnings remain non-blocking.
- No real family write, AI provider call, consultation or external message was used for browser verification.

## Deployment and rollback

Apply migration 013 after CI verification and before deploying this code. Record it in `_budding_migrations`. Compare the child fingerprint before/after, excluding the new nullable column after migration. Preserve all data; do not backfill guessed answers.

Prefer a forward fix if needed: old app versions do not understand unanswered metadata and may treat compatibility numeric defaults as actual observations. Do not delete the column or family records to roll back.

Production deployment pending; the release entry below will identify the exact commit, CI and live checks.
