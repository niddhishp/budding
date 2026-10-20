# Faster Ask: checked answers in two stages

Branch `claude/faster-ask`. No migration. Not deployed. No live model run.

Ask now shows the checked immediate answer (Right now, Say this, Do this, Leave out) as soon as it passes the content check. The explanation follows in a second checked stage. No unchecked text reaches a parent at any point.

## Design

**1. Independent work runs alongside triage** (`src/app/api/analyze/route.ts`)
- In guidance mode, `loadDecodeContext` and then `routeMessage` start at the same moment as `classifySafety`.
- Routing is classification (which doctrine modules apply), not advice.
- On a support or unavailable path, the preparation is aborted and its result discarded.
- Reservation still happens after triage and before generation. Generation starts only after both.
- Chat and practice still load their context before triage, because triage needs their earlier turns.

**2. Two-stage checked emission** (`decodeStaged` in `src/lib/ai/decode.ts`)
- **Stage A** generates only `rightNow`, `sayThis`, up to three `doThis` steps and `avoid`. It runs through the existing `checkedCall`: deterministic lint, repair if needed, then the independent fast review.
- Only after that does the route send `{ type: 'first', analysis }`.
- **Stage B** receives Stage A's checked words inside `<already_shown>` as fixed input. It writes hypotheses, developmental context, need, skill, afterwards, watch for, seek help if, why it works and evidence.
- Lint and repair touch only Stage B's fields, so words already shown are never rewritten.
- The review sees the **combined** object, through the new `reviewAs` option in `checked-content.ts`, so contradictions between the two stages are still caught.
- The combined answer is then saved through `completeGuidance` and sent as `done`, as before.
- **If Stage B fails** (outage, review rejection, unrepairable lint, timeout or cancellation), Stage A alone is saved with `analysis.detailUnavailable = true`. It is charged once, because it is a valid, checked answer the parent has already seen. The UI says "More detail isn't available for this one."
- **WhatsApp** keeps the single-call `decodeBehavior`, because it cannot render a partial answer. `scripts/eval/run.ts --single-call` evaluates that path.

**3. Age-aware triage** (`src/lib/ai/safety.ts`)
- `classifySafety(message, signal, call, age)` adds `<child age="7 years 2 months" stage="Early school years (6–8 years)" />` to the triage turn. Only the age and stage band are sent, never the child's name or profile.
- `SAFETY_SYSTEM` gains five calibrated ordinary examples:
  - drop-off crying that settles within minutes
  - "I'll kill you!" in superhero play
  - a 7-year-old's spelling-test nerves
  - a tired parent saying "I'm going to lose it" (parent_distress, low)
  - "dying" in a video game
- It also gains an explicit rule that genuine risks are never downgraded because the child is young.
- The model-free emergency patterns still run first and bypass the model.
- WhatsApp triages before choosing a child, so it sends no age.

**4. Handbook fallback instead of a dead end** (`src/lib/ask-fallback.ts`)
- When Stage A is withheld, the route sends a terminal `{ type: 'fallback', message, card }` with the closest age-matched Handbook card. "Withheld" means `DecodeError` `unsafe`, covering review rejection and failed repair, or `refused`.
- The card comes from `cardsForChild` plus deterministic keyword matching, with no model call. Body and safety cards are offered only on a clear match.
- The reservation is failed, so nothing is saved or charged, the same as the existing no-charge-on-failure rule.
- Copy: "We couldn't check a custom answer this time. Here's a starting point from your Handbook." The UI shows the card's words, activity and "Leave out", with an "Open this in your Handbook" link (`openHandbook(id)`).
- Outages and timeouts still return the existing error, and chat and practice are unchanged.

**5. Fewer false positives in the diagnosis lint** (`src/lib/ai/critic.ts`)
- `ADD`, `ODD` and `SPD` match only in capitals, so "this is odd" and "add one more step" are no longer flagged.
- Names and diagnostic phrases (ADHD, autism, OCD, "attention deficit", "obsessive compulsive"…) still match in any case.

**6. Stage bands** (`src/lib/ai/doctrine/stages.ts`)
- `middle` (6–12) is now `school_early` (6–8: short, concrete scripts, feeling plus one step or two choices, play still works) and `school_late` (9–12: respectful, direct, a question that invites their view).
- The temperament intake band `middle` in `temperament.ts` and `moments.ts` is a separate concept and is unchanged.

**7. Ask UI** (`src/views/AskAIPage.tsx`)
- The answer renders on `first` and scrolls into view once. It does not jump again on `done`.
- While waiting, a small "Adding the why…" status shows.
- The visible answer is four blocks:
  1. Right now + Say this, with share
  2. Do this now + Leave out
  3. One collapsed "Understand why" containing hypotheses, developmental context, Needs/Builds, later-when-calm, watch for, and why this works with evidence
  4. The outcome bar, continue, and the saved moment
- "Talk to a professional if" stays visible, and only when `seekHelpIf` is present.
- The stacked disclaimers are now one line: "General guidance, not a diagnosis. Worried about health or safety? Talk to your paediatrician." The GuidanceTrust panel is kept.
- Share, clarify chips, outcome and continue appear once the answer is saved.

**8. Quick follow-up window** (coordinator request)
- `reserve_guidance` already refuses a `refines` root older than 30 minutes (`invalid_refinement`, which becomes 422 `refinement_limit` with no charge), so the window was enforced end to end.
- The route now also checks `CLARIFY_WINDOW_MS` (in `src/lib/plans.ts`, also used by the UI) before triage, so an expired follow-up makes no model call. SQL remains authoritative.

## Invariants kept

- **Triage before advice.** Triage completes before any advice generation. Nothing generates speculatively. Support and unavailable paths never reserve, generate or charge.
- **Every word checked.** Every word shown has passed lint and the fast review: Stage A on its own, Stage B together with Stage A. No raw tokens are streamed. The `delta` events stay ignored.
- **Billing semantics.** Quota, reservation, receipt and idempotency are unchanged. One reservation, one `completeGuidance`, one charge. A replay of a completed `requestId` returns the saved decode without generating.
- **Crisis paths.** Crisis paths and copy are unchanged.

## Deliberate trade-offs

- **Cancelling after the first answer still charges.** Once a checked first answer is sent, leaving or cancelling still saves and counts it. Otherwise aborting after `first` would give free answers. Before `first`, cancellation fails the reservation as today.
- **A failed save leaves an uncharged answer on screen.** If `completeGuidance` fails after `first`, the parent saw a checked answer that was not saved or charged, and the UI says so. Retrying the same moment generates again.
- **When Stage B fails, its safety fields go with it.** `seekHelpIf` and `watchFor` are explanation fields, so they are missing when Stage B fails. This only happens on the ordinary path, after triage has sent every elevated or urgent moment to support.
- **A rejected combined review keeps Stage A.** If the combined review rejects the answer, Stage A, which was reviewed alone against the full source, is kept and Stage B is dropped.
- **Some routing calls are wasted.** Routing now also runs, and is discarded, on support paths and on replays of a completed request. That is one extra fast-model call in those cases, aborted where possible.
- **Stage B costs more input.** Stage B repeats the per-request user turn as input. Only the system prompt is cached. That means more input tokens per answer, and less output in Stage A.

## Expected latency — an estimate, not a measurement

No live model calls were made: there were no API keys, and the brief said not to run live evals. The figures below are reasoning from the pipeline's shape, not measurements. Assumed: the fast model returns small JSON in about 1–2 s, and the main model on low effort streams roughly 50–80 output tokens per second after about 1–2 s to the first token.

| Step | Before (sequential) | After |
|---|---|---|
| Triage | ~1–2 s | ~1–2 s, in parallel with context and routing |
| Context + routing | ~1.5–2.5 s after triage | hidden behind triage |
| Words a parent can act on | full answer (~600–900 tokens) + review: **~15–22 s** | Stage A (~150–250 tokens) + review: **~6–9 s** |
| Full answer | ~15–22 s | + Stage B (~500–700 tokens) + review: **~16–25 s** |

The time to the first useful words should roughly halve. The full answer may take about the same time or slightly longer, because of the extra round trip and review. Confirm with `npm run eval` once a key is available. It now records `timings.safetyMs`, `routeMs`, `firstMs` and `detailMs` per case, and prints medians.

## Verification (local, this branch)

- **`npm run check`:** lint, typecheck, and 71 unit + 56 server tests all pass. The 12 new tests are in `tests/server/faster-ask.cases.ts`:
  - stage ordering and the combined review
  - Stage B outage, rejection and unrepairable output
  - repair limited to Stage B
  - Stage A withheld shows nothing
  - cancellation after `first`
  - the triage age prompt and calibration examples
  - regex emergencies bypassing the model with age supplied
  - lint false positives
  - the stage split
  - the Handbook fallback
  - the window constant
  - routing in parallel with controllable promises

  One evaluation test now expects routing alongside triage, with no generation.
- **Disposable database:** `node scripts/test-security-db.mjs --bootstrap` passes. `npx tsx --conditions=react-server scripts/test-family-plan-routes.mjs` passes, running the real analyze route with a fake AI transport. The extended section asserts:
  - triage is held until routing starts
  - the triage prompt carries the age band without the name
  - `first` comes after `safety` and before `done`, and holds only the immediate fields
  - the saved answer keeps the shown words
  - one charge
  - replay without generation
  - a free quick follow-up
  - an expired follow-up gets 422 with no model call and no reservation, and SQL independently returns `invalid_refinement`
  - a Stage B outage saves Stage A once, flagged
  - a rejected Stage A sends `fallback` with age-matched static card words, saves no decode, marks the request failed and uses no allowance

  The harness now returns SQL `date` as text, the same as PostgREST.
- **Other checks:** `npm run test:providers`, `npx tsx scripts/verify-handbook-render.tsx` and `npm run build` pass.

## Limits and open questions

- Expected latency is unmeasured (see above). There is no live evidence on Stage A/B quality or on how often Stage B is withheld.
- The new calibration examples are unreviewed. Add them to the clinical-review queue alongside the existing triage wording.
- Fallback card matching is keyword-based. Handbook cards are editorial and not clinically validated.
- Is "charge once the first answer is shown, even if the parent cancels" the policy the owner wants?
