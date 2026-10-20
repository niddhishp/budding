# Guided programmes

A guided programme is a short plan a parent runs with one child for a bigger stage, such as potty training or a first period. Each step gives the parent:
- words to say
- one short activity with the child
- an optional "Practise this first" prompt, which opens Ask in fictional practice mode
- what to leave out
- an optional film slot

Each programme starts and ends with the same 1–5 question ("How hard is potty time with {name} this week?"), so the parent can see their own before and after.

Status: built, not deployed. Migration 031 must be applied before release. Clinical review is pending, as it is for all content.

## Programmes (editorial version 2026-10-21)

| id | Title | Ages (months) | Length | Shown to |
|---|---|---|---|---|
| `potty-training` | Potty training, together | 24–47 | 7 days | all |
| `screen-off` | Screen-off without tears | 36–107 | 7 days | all |
| `first-period` | Getting ready for the first period | 108–167 | 7 sessions | everyone except profiles marked Boy |
| `body-talk-young` | The body talk: early years | 36–95 | 7 days | all |
| `body-talk-preteen` | The body talk: growing up | 96–155 | 7 days | all |

"The body talk" ships as two programmes, one per age band. That keeps each programme a flat list of steps.

The first-period programme is hidden only when the profile says Boy. It is not hidden when gender is unset, because Kahiye never infers gender. Fathers are addressed in the "why", the "before you start" note and session 6.

Every source URL is already used in `src/data/handbook.ts` or `src/data/articles.ts`; a test enforces this. Films are `null` for now, and the slot is hidden until a URL is set.

## Where things live

- **Content:** `src/data/programmes.ts`, typed and version-controlled. `included: 'free' | 'plus'` is on every programme. All are `free` during early access and no paywall is shown. To charge later, change the field and add the gate in `ProgrammePage`.
- **Rules:** `src/lib/programmes.ts` covers age and profile matching (DOB only, through `handbookAge`), the next step, the Today pick and the rating comparison.
- **Data access:** `src/components/care/useProgrammes.ts` reads under RLS and writes only through the RPCs below. There is no new API route.
- **UI:**
  - Handbook list: a "Guided programmes" section for the child's age, plus a "Coming up in the next year" preview (`ProgrammeShelf`).
  - Detail page: `src/views/ProgrammePage.tsx`, page id `programme`, opened with `openProgramme(id)`. Navigation highlights Handbook.
  - Today: at most one "Day N of …" card, for the active programme touched most recently (`ProgrammeToday`).
- **Database:** `supabase/031_guided_programmes.sql`.
- **Admin:** `/admin/outcomes` has a "Programmes" table. The route calls `programme_metrics` alongside the existing two RPCs.

## Database (migration 031)

`public.programme_enrolments` has one row per run of a programme for a child.
- `progress` is `{ "day": "India date ticked" }`, with keys 1–14 and at most 14 entries. A check constraint enforces this through `private.programme_progress_ok`.
- `baseline` and `final` are smallints from 1 to 5. `final` is set exactly when the status is `completed`.
- `status` is `active`, `completed` or `stopped`.
- `programme_id` must match `^[a-z][a-z0-9-]{2,39}$`. The content file is the list of real programmes.
- A partial unique index allows only one active enrolment per child per programme.

Parents can only read (RLS "own read"). Every write is a security-definer function that checks consent `2026-10-05` and child ownership.

| Function | Behaviour |
|---|---|
| `start_programme(target, receipt, programme, rating)` | A retried receipt returns its row. If the programme is already active, returns `status: 'active'` with the existing row. Capped at 100 enrolments per child. |
| `mark_programme_day(enrolment, day, done, expected)` | Ticks or unticks a day. A retry whose change already holds returns `saved` without a new revision. A stale `expected` returns `conflict` with the current row. |
| `finish_programme(enrolment, rating, expected)` | Moves to `completed` with the final rating. A second finish keeps the first rating. A stopped programme cannot be finished. |
| `stop_programme(enrolment)` | Idempotent. A completed programme stays completed. |

`public.programme_metrics()` is service-role only and returns, per programme:
- families
- enrolments
- active, completed and stopped counts
- `completion_rate`: completed enrolments as a share of those started at least 14 days ago
- `improved_rate`: the share of completed enrolments whose final rating is below the baseline

Every cell uses `private.outcome_count` or `private.outcome_ratio`, so any figure built from fewer than five families shows as "<5". Only parents with current consent are counted.

## Export and erasure

Account erasure removes `programme_enrolments` (it cascades from `auth.users` and `children`). The table is in `FAMILY_EXPORT_TABLES` and is exported per child as `programmes`, without `revision` or `user_id`. Programme ticks and ratings never become AI memory.

## Tests

- `tests/programmes.test.ts` checks:
  - ids are unique and match the SQL pattern
  - age ranges and step counts are valid
  - every step has words, an activity and something to avoid
  - doctor and helpline lines are present
  - sources resolve to existing URLs
  - banned phrases ("good girl", "bad boy", "naughty", "lazy", guarantees, diagnosis, smacking) are absent
  - matching follows age and the Boy/Girl profile
  - progress helpers work
- `tests/server/family-export.cases.ts` checks that programmes are exported without internal fields.
- `tests/sql/guided-programmes.sql` runs in `scripts/test-security-db.mjs` and covers:
  - consent
  - ownership
  - anonymous denial
  - idempotent start, tick and finish
  - revision conflicts
  - one active enrolment per programme
  - day and progress bounds
  - no direct writes
  - family isolation
  - service-only metrics
  - suppression below five families
- `scripts/test-family-plan-routes.mjs` whitelists the table for export reads and checks that another family's enrolment is not exported.
- `scripts/verify-handbook-render.tsx` renders:
  - the Handbook and potty programme for a 2-year-old
  - the Handbook and first-period programme for an 11-year-old girl
  - an 11-year-old boy, who is not offered the first-period programme

## Open questions

- **Films:** the founder supplies them. The slot plays a direct video URL with `<video>`. If the films are Vimeo or YouTube embeds, the slot needs an iframe instead.
- **Clinical review:** before the pilot, the first-period and body-talk programmes should go to the safeguarding and paediatric reviewers listed in [CLINICAL-REVIEW.md](CLINICAL-REVIEW.md).
- **Unset gender:** should the first-period programme be offered when gender is unset? It currently is.
- **Completion rate:** it counts an enrolment as finished only when the parent answers the closing question. Parents who tick every day but never finish count as not completed.
