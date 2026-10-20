# Safety and Play follow the selected child's profile

20 October 2026.

Safety now uses the child's date of birth for its conversation band, as Puberty already does. The conversation-age selector is removed. Missing, invalid or future dates lead back to the child profile instead of guessing an age; older profiles retain the articles route and immediate-support information.

Play now always filters activities by the selected child's birth date. The age override is removed; the energy filter and saved activities remain. The same India-calendar date hook used by the guides refreshes age when the tab stays open overnight or regains focus. Existing favourites remain stored, including activities the child has outgrown. The empty state explains the active filters and preserves a path to correcting the profile.

Only two view components changed. No migration, data backfill, production record modification, provider call or content removal was required. The user's newly supplied Parenting Research directory is retained and excluded from release staging.

## Verification

- `npm run check`: lint, TypeScript and all 85 unit/server tests passed.
- `npm run build`: production build passed, including all 84 static pages.
- In-memory rendering of the actual Safety and Play components verified switching between synthetic 1-year and 11-year profiles, missing/invalid/future dates, appropriate guide/activity content and absence of age controls. React effects did not run; no network or database writes occurred.
- An initial overlapping typecheck/build attempt collided over generated `.next/types` files. Running these checks sequentially resolved it; both final runs passed.
- Release CI, exact deployed revision and live desktop/mobile evidence will be recorded after deployment.

## Separate product review

The owner also requested a research-led creative/technical assessment and a Brag feature video. Wider changes to Today, evidence governance, model evaluation, caregiver coordination and follow-up remain proposals until agreement. Do not interpret this small release as approval to implement that larger roadmap.
