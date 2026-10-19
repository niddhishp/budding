# Profile-driven puberty guidance

The parent requested Boy/Girl in the child profile and clarified that there must be no second guide choice. Add/Edit child now provides an optional Boy/Girl field. The profile displays the saved value. Puberty automatically chooses the corresponding content; the separate girls/boys guide buttons and save action are removed.

`children.gender` is nullable, constrained to `boy`/`girl`, and parent-supplied. Migration 023 is additive and leaves all existing rows unset. A legacy reading preference is preserved as a fallback, never converted into a gender. New profile values take precedence and also update the compatibility reading-preference field. Unrelated edits omit the new field; explicitly clearing it also clears the legacy fallback. The value does not change growth-chart references, medical measurements, shopping preferences or AI prompts.

The owner has already identified Advika as his daughter and explicitly wants automatic guidance without choosing again. After deployment, save Girl on that existing profile through the authenticated UI, then verify that girls' content opens and persists after reload. This is the requested real profile update, not a production test fixture. Other existing profiles remain unchanged.

Validation includes automatic girls/boys filtering, precedence over conflicting legacy choices, legacy preservation without identity inference, mapper round trips, omission versus explicit clearing, SQL constraints, owner access, consent and anonymous/cross-family denial. Existing shop, family-plan, private-photo and provider contracts remain in the regression suite.

Deployed 2026-10-19, application commit `1cae1f26db5c6ab92990a10ff8901806b7446c1d`. Vercel `dpl_Fc4ETHS27D5w4bmYEryHpPwypMMu` is Ready on `www.kahiye.app` and `kahiye.app`. Exact-commit branch CI `39206339187` and main CI `39206612490` both passed.

Local validation passed: lint, TypeScript, 85 unit/server tests, fresh SQL bootstrap and security tests, provider signature/concurrency tests, actual family/shop/photo handlers against disposable SQL, and production build. The production migration wrapper was additionally tested with an existing profile and legacy guide: no gender was inferred, and existing fingerprints were unchanged.

Migration 023 applied with before/after fingerprints of all existing application/auth/storage-object rows, excluding the new null field and migration ledger. All matched. Advisors match the prior release's existing notices; no new policies, grants, indexes or tables. See [previous advisor details and remediation links](PERSONALIZED-FAMILY-NAVIGATION.md).

The owner's requested real update was completed through the signed-in UI: Advika is Girl. The girls' 11–13 guide appeared immediately, and persisted after a full reload. No guide-selection buttons remain. Child displays “Girl” beside her age. A second fingerprint check confirmed every other child-profile field stayed unchanged, excluding the requested gender/compatibility preference and ordinary profile-save timestamp.

Desktop and phone 390×844 verified: matching guide, direct Menu navigation, no horizontal overflow or Kahiye console errors. Public home/articles return 200; anonymous stories/care APIs return 401. No production test records, provider sends, payments or other family-data changes. Disposable test container removed; temporary browser tab closed and viewport restored; user's original tab untouched.

Evidence: `C:/Users/Admin/.codex/visualizations/2026/10/17/01a14a81-9a08-7f22-ab03-d2a79055ac2f/automatic-girls-guide.png` and `automatic-girls-guide-mobile.png` in that folder.

Rollback can retain the nullable column and compatibility preference; do not remove parent data. Clinical review of the underlying educational content remains pending, as already disclosed.
