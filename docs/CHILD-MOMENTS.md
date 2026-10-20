# Child page and photo memories

20 October 2026. The owner asked for four things:
- the photo timeline inside the child's profile, made visually rich ("like Facebook or LinkedIn imagery", sideways scrolling, placeholder images to preview it)
- the persistent "Growing up" guides and the horoscope in a right-hand column
- an end to the never-ending scroll
- the eight persona reviews run first

The plan below is the consolidated result of those reviews (Jobs, Gates, Musk, Altman, Buffett, Karpathy, Uncle Bob and Nerdzão Elite). The 3–8 content work and the faster Ask answers are separate builds, recorded in CONTENT-3-8.md and FASTER-ASK.md once merged.

## Child page

**Header.** Compact and left-aligned: an initial, the name, then gender, age and stage, with "Update profile" on the right. "{name}'s Journey" is gone; "journey" is on the owner's banned-word list.

**Desktop layout.** Two columns from `xl` (1280px), because the app sidebar takes 256px. At `lg`, the rail would be too narrow.

The main column holds, in order:
1. Photo memories
2. Growth at a glance
3. This stage: description, themes, and "Things you may notice" (collapsed)
4. Weekly report
5. One grid of six links: Handbook, Health diary, Interests, Story library, Family plan & savings, Developmental observations

The sticky right rail holds:
1. Growing up, together
2. The horoscope: on by default, Hide respected
3. This season's patterns, with the profile facts
4. Gifts & finds, with the referral note: "Some retailer links earn Kahiye a small fee. It never changes what we suggest."

**Bottom of the page.** "What Kahiye remembers about {name}" is collapsed, so the AI memory is not confused with photo memories.

**Mobile.** One column in the same order. The scroll is shorter because the stage list is collapsed and the links share one grid.

**Removed.** Frosted-glass cards (an anti-reference in `.impeccable.md`), five hand-copied link tiles, and four repeated pregnancy checks. One `familyNavigation(...).born` check now covers all of them, and the page is keyed by child.

## Photo memories strip

**Layout.** A native sideways list with snap points. It runs oldest to newest, left to right, and opens scrolled to the newest. It shows the newest 24, with "See all (n)" for the rest.
- **Cards:** each is a 4:5 "print" on a paper mat with the brand's paper shadow. Cards tilt alternately by 0.6°, and straighten on hover or focus.
- **Captions:** each caption shows "14 Mar 2024 · 4 yrs 4 mo", the child's age on the photo date, from `ageAtPhoto`.

**Parallax.** CSS only, using `animation-timeline: view(inline)`; the image drifts within its frame. It is off under `prefers-reduced-motion`. There is no autoplay and no JavaScript scroll handling.

**Navigation.**
- **Desktop:** previous/next buttons for mouse users, and the scrollbar is hidden.
- **Keyboard:** arrow keys, Home and End move between cards.
- **Viewer:** opening a card shows a native `<dialog>` with the full photo, date, age and note, plus Earlier/Later and "Edit or archive in all memories". Escape closes it, and focus returns to the card.

**Empty state.**
- **First card:** "Add {name}'s first memory", with quick-start titles: First day of school, A birthday, An ordinary Tuesday.
- **Example prints:** after it come five cut-paper example prints in the brand's illustration style, each tagged "Example": First steps, A first birthday, Sunday with Dadi, First day of school, An ordinary Tuesday.
- **Rules for examples:** they never request a real photo and are never mixed with real photos. There are no stock photographs.

**Adding and editing.** "Add a photo" and the quick-start titles open the editor with the form ready. A new `photoIntent` in the store carries the title.

**Privacy.** Unchanged in principle: photos are signed-in only, owner-scoped, private-bucket and never used for guidance. The strip says so in one line.

## Fast private thumbnails (migration 028)

`GET /api/family-photos/{id}?size=thumb` returns a WebP thumbnail at most 640px wide.
- **Creation:** made from the private original on first request and stored beside it as `{user}/{id}-{hash}-thumb.webp`. Later requests reuse it.
- **Caching:** `Cache-Control: private, max-age=3600`, so it is cached briefly in this browser only. Full-size photos stay `private, no-store`.
- **Erasure:** account deletion already removes the whole owner folder. Migration 028 updates the deletion trigger so a deleted memory queues both the photo and its thumbnail, and it skips rows without a photo hash.

## "See all" page

The page is now keyed by child: the old version kept an open draft when the parent switched child. It is a grid of thumbnail cards, newest first, with plain dates and ages. The archive checkbox is replaced by an "Archived memories" toggle. Selection uses the tested `memoriesFor` helper.

## Link preview

`public/kahiye-social.webp` now reads "The words to say, when it matters. For parents of children aged 3 to 8."

## Verification

- **`npm run check`:** lint, TypeScript, and 117 unit and server tests pass. New tests cover:
  - per-child memory selection, ordering and archive state
  - age-at-photo labels
  - thumbnail size, format and private naming
- **Disposable database suite:** bootstraps through 028 and passes all 18 suites. The erasure test now also requires the thumbnail to be queued.
- **Route handlers against SQL:** all 5 suites pass. The thumbnail is WebP, at most 640px and cached privately, stored once in the owner's folder, reused on the next request, and refused to another family.
- **Render check:** the real Child page keeps every family tool and drops "Journey". An empty strip shows labelled examples and never requests a photo.
- **Build and SEO:** `npm run build` and the SEO check (41 pages) pass.
- **Visual check:** a temporary local-only preview route, not committed, rendered the real Child page at 1440px and 390px. The two-column rail, example prints, arrows, age labels and the mobile swipe with a peek all display correctly. It was not checked in a signed-in browser with real photos.

## Rollback

Revert the commit. Migration 028 can remain: queuing an extra thumbnail path is harmless with the old code.
