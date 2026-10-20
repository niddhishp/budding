# Content for ages 3–8, and Handbook card sharing

20 October 2026. Branch `claude/content-3-8`. Clinical status: **unreviewed**. Every item here is an editorial draft. The existing "Clinical and safeguarding review pending" labels stay in place, and nothing here claims a review (see [CLINICAL-REVIEW.md](CLINICAL-REVIEW.md)).

## What was added

### Handbook: 14 new cards (81 in total)

All 67 existing card IDs and texts are unchanged. Each new card has why, words, activity, resistance, response and an "avoid" line, and uses an existing `HANDBOOK_SOURCES` key.

| ID | Title | Months | Track | Source key |
|---|---|---|---|---|
| `potty-together` | "Your body tells you, and we'll go together" | 24–47 | health | communication |
| `potty-accidents` | Accidents and saying no to the potty | 36–71 | health | communication |
| `bedwetting-nights` | Wet nights are no one's fault | 60–107 | health | communication |
| `eating-pressure` | "Khana nahi khata": the plate without the pressure | 24–71 | health | parenting |
| `tantrum-shop` | A meltdown in the shop | 36–71 | feelings | parenting |
| `hitting-biting` | When they hit or bite | 36–71 | feelings | parenting |
| `truth-safe` | Telling me the truth is safe | 48–95 | family | communication |
| `siblings-fight` | When brothers and sisters fight | 36–107 | family | parenting |
| `new-baby-home` | After the new baby comes home | 24–83 | family | communication |
| `bedtime-stalling` | One more water, one more story | 36–83 | health | sleep |
| `dark-fears` | Scared of the dark, and bad dreams | 36–83 | feelings | feelings |
| `morning-rush` | Mornings when they don't listen | 36–83 | independence | communication |
| `screen-off` | When the screen goes off | 36–83 | digital | digital |
| `grief-death` | When a grandparent or a pet dies | 36–107 | feelings | feelings |

- **Doctor lines.** `potty-accidents` and `bedwetting-nights` include a plain "Talk to your doctor if…" line. `eating-pressure` (weight or growth), `dark-fears` and `grief-death` also say when to see a doctor.
- **Safeguards.** No card names a method or framework, and none diagnoses or makes promises. Smacking and shaming appear only as things to leave out. `new-baby-home` includes "leaving a young child alone with the baby" in its avoid line.

### Public articles: 6 new (26 authored, plus 12 guides)

Each article uses the existing shape. It also has an optional `handbook` list of card IDs. The article page shows these at the end of the article as "In the Kahiye Handbook", with a link into the app. The existing "Facing this with your child?" Ask call to action is unchanged.

| Slug | Handbook cards | Sources |
|---|---|---|
| `potty-training-in-india` | potty-together, potty-accidents | AAP potty training; NHS constipation in children |
| `tantrums-ages-3-to-5` | tantrum-shop, hitting-biting, feelings-name | NHS temper tantrums; WHO parenting guidance (existing) |
| `picky-eating-mealtime-pressure` | eating-pressure | AAP picky eaters; WHO parenting guidance (existing) |
| `screen-time-by-age` | screen-off, digital-together, digital-stop | WHO under-5 guidelines; UNICEF online safety (existing) |
| `bedwetting-in-children` | bedwetting-nights | NHS bedwetting; NHS constipation in children |
| `starting-school-drop-off` | school-goodbye, morning-rush | NHS separation anxiety (existing); UNICEF communication (existing) |

**New source URLs.** On 20 October each of these was fetched and confirmed to load and to match its title:
- WHO: https://www.who.int/publications/i/item/9789241550536
- NHS bedwetting: https://www.nhs.uk/conditions/bedwetting/
- NHS constipation in children: https://www.nhs.uk/baby/health/constipation-in-children/
- NHS temper tantrums: https://www.nhs.uk/baby/babys-development/behaviour/temper-tantrums/
- AAP potty training: https://www.healthychildren.org/English/ages-stages/toddler/toilet-training/Pages/default.aspx
- AAP picky eaters: https://www.healthychildren.org/English/ages-stages/toddler/nutrition/Pages/Picky-Eaters.aspx

**WHO figures.** The WHO landing page does not show the screen-time figures. The article's figures come from the guideline itself: under 2, no sedentary screen time; ages 2–4, no more than 1 hour a day, and less is better. The clinical reviewer should check them.

### Growing up: new 3–5 band

`growing-changes.ts` has a new band, `3-5`, for 36–60 months. It is labelled "Big feelings, big imagination · 3–5 years" and has four prompts: potty, preschool, "no!" and pretend play.

**Behaviour change.** Ages 3–5 now open on these prompts on the Milestones page. Before, they opened on the CDC checklists.
- The checklists are still one tap away. For this band, the link reads "Open the milestone checklists".
- With reminders on, Today's notice for a 3–5-year-old now shows a band prompt. Before, it pointed to a CDC checklist.

### Sharing Handbook cards

- **Handbook card view.** Each card has a new "Send to grandparents or caregivers" action. It opens the existing `ShareSheet`.
- **`ShareSheet`.** It accepts either `{ decode }`, as before, or `{ card, childId }`. The existing Ask caller is unchanged.
- **`POST /api/share` body.** The body is now one of two strict objects:
  - `{ decodeId, language, audience }`
  - `{ cardId, childId, language, audience }`

  `cardId` must be an ID in `HANDBOOK`. A body that has both kinds of ID, or is missing `childId`, gets a 400.
- **Card path.**
  1. The route checks auth.
  2. It checks the same 30-day allowance for non-English messages.
  3. It checks that the child belongs to the parent, using the parent's own row-level security; anyone else's child gets a 404. `reserve_guidance` checks ownership again.
  4. It reserves `kind='share'` against the selected child.
  5. It records `share_language` for any non-English message.
  6. It calls `writeShareMessage`. The scenario is the card title. The plan is the card's words, its activity, a line pairing the resistance with the response, and its avoid line.
- **Decode path.** Unchanged.
- **Database.** No migration needed.

### Copy: the allowance is a rolling 30 days

`ShareSheet.tsx`, `api/share/route.ts` and `lib/plans.ts` now describe the allowance with "every 30 days" or "the last 30 days" instead of "this month" or "a month". For example: "5 messages every 30 days in other languages". Plus is described as having "no 30-day limit". The constant `FREE_TRANSLATED_SHARES_PER_MONTH` keeps its name.

## Verification

| Check | Result |
|---|---|
| `npm run check` | Lint and TypeScript pass. 117 tests pass (73 unit, 44 server). |
| `test-security-db.mjs --bootstrap` (disposable `pgvector/pgvector:pg17`) | Migrations through 027 apply; every suite passes. |
| `test-family-plan-routes.mjs` (disposable SQL) | All 6 suites pass, including the new card-share suite. |
| `verify-handbook-render.tsx` | Passes. |
| `npm run build` | Passes. |
| `verify-seo-build.mjs` | Passes: 47 public pages, up from 41. |

**New test coverage:**
- **Handbook (`tests/handbook.test.ts`).**
  - The card count is 81.
  - 2-year-olds see potty learning, eating and new-baby cards, and not the shop tantrum.
  - 3½-year-olds see both potty cards.
  - 4-year-olds see the potty-accident, tantrum, hitting, sibling, bedtime, fears, morning, screen and grief cards.
  - 7-year-olds see bedwetting and truth-telling cards.
  - The two medical cards include a doctor line.
  - The new articles link only to real cards, and the medical articles include a doctor line.
- **Growing-up bands (`tests/daily-family.test.ts`).** There is exactly one band for every month from 36 to 240.
- **Card sharing (`test-family-plan-routes.mjs`).**
  - A card shared in English succeeds through the simulated AI transport, and the model input contains the card's title, words, response and avoid line.
  - A share for another family's child gets a 404.
  - An unknown `cardId`, a missing `childId`, or a body with both kinds of ID gets a 400.
  - Rejected requests make no model call and create no reservation.
  - A Free family's Hindi card share returns `translatedLeft: 4` and records `share_language`.
- **Fake-server extensions (narrow).**
  - The fake LLM answers share-message schemas.
  - The fake PostgREST accepts a PATCH of `share_language` alone on `guidance_requests`.
- **Render check (`verify-handbook-render.tsx`).**
  - Card views show the share action.
  - A 4-year-old's Handbook lists the shop tantrum and grief cards.
  - `ShareSheet` renders with a card and uses the 30-day wording.

**Not verified:** a signed-in browser session, or a live model writing a card message.

## Open questions

- **Clinical review.** Add `bedwetting-nights`, `potty-accidents`, `eating-pressure`, `grief-death` and the six articles to the clinical-review packet.
- **Grief card age range.** `grief-death` covers 3–8 with one script. A reviewer may want separate versions for 3–5 and 6–8.
- **Today for 3–5.** Should Today's notice keep pointing 3–5-year-olds to the CDC checklists instead of the new band prompts?
- **Article links.** The Handbook link from an article opens `/app` without going to the matching card, because the app has no URL for a single card yet.
