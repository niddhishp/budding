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
- Exact application revision: `8d98698dbd01aeb69f1d34d415c8f847da2f2940`.
- Branch CI [39418450608](https://github.com/niddhishp/budding/actions/runs/39418450608) and main CI [39419003716](https://github.com/niddhishp/budding/actions/runs/39419003716) both succeeded. These include fresh database security/bootstrap checks, provider/concurrency tests, actual route-handler checks and build.
- Production `dpl_A4ToRYdKzYnrQKRcCCA9KoZHgaEk` is Ready on `www.kahiye.app` and `kahiye.app`, with the same application SHA.
- Live authenticated desktop: Safety shows the 11–13 band from the selected profile and zero age selectors; Play shows six matching activities with only the energy selector; Outdoor filters to one activity; saved-only shows an accurate empty state and clearing that filter restores the activity. Puberty still shows its matching girls' guide with no age selector. No Kahiye console errors or horizontal overflow were observed.
- Public homepage/articles returned HTTP 200; anonymous `/api/care` remained HTTP 401.
- Mobile limitation: the documented browser viewport override returned successfully but the observed viewport remained 1280×720, including after reload and a fresh tab. The override was reset and temporary tabs closed. Do not claim a fresh phone-sized visual verification for this release.
- Local evidence: `C:/Users/Admin/.codex/visualizations/2026/10/17/01a14a81-9a08-7f22-ab03-d2a79055ac2f/safety-profile-age-live.png` and `safety-play-desktop.png`. These contain the owner's selected profile and are private verification artifacts, not marketing assets.

## Separate product review

The owner also requested a research-led creative/technical assessment and a Brag feature video. Wider changes to Today, evidence governance, model evaluation, caregiver coordination and follow-up remain proposals until agreement. Do not interpret this small release as approval to implement that larger roadmap.

The detailed assessment is a local, standalone HTML artifact at `C:/Users/Admin/.codex/visualizations/2026/10/17/01a14a81-9a08-7f22-ab03-d2a79055ac2f/kahiye-product-review-2026-10-20.html`. It includes parent needs, current strengths and gaps, research corrections, evidence sources, prioritized dependencies and proposed acceptance criteria. HTML structure and internal navigation were checked; browser preview of the local file was blocked by URL policy, so no rendered report check is claimed.

The separate Brag/Hyperframes video package lives at `C:/Users/Admin/.codex/visualizations/2026/10/17/01a14a81-9a08-7f22-ab03-d2a79055ac2f/kahiye-brag-2026-10-20/`. It uses fictional family details and labels provider-dependent features awaiting activation. It does not publish the research, private customer screenshots or any family records.
