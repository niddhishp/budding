# Saved moments and memory suggestions

Branch `claude/log-memories`. Migration 034. No change to what guidance reads.

## The gap

"Log a moment" (the green + button) saved a note to `context_logs` and told the parent "Kahiye uses this next time you ask about {name}". It did not. Since the memory-continuity release (migration 014), `loadDecodeContext` deliberately passes `recentLogs: []`, so that a note can never bypass the parent's memory controls (confirm, stop, private, expiry, pause). The only reader of notes was the weekly report on the Child page.

The product already anticipated the right path: `memories.source` allows `'log'`, and the memory panel labels it "From a saved moment". It was never wired.

## What changes

A saved note now goes through the same write gate as an Ask message, and comes out as **unconfirmed suggestions** the parent reviews in "What Kahiye remembers". The raw note still never enters guidance.

- `POST /api/log` saves the note as before, returns `{ success, id }`, then schedules `proposeLogMemories` with `after()`. The parent is not kept waiting.
- `src/lib/log-memories.ts` checks consent, reads the note and the child's `memory_enabled` under the service role, loads what is already known, calls `extractMemories` (the existing extractor, same prompt and write gate), and commits through `propose_log_memories`. Any failure is logged and absorbed: a lost suggestion, never a lost note.
- `public.propose_log_memories(p_log, p_user, p_memories)` (migration 034) is service-role only and mirrors `finish_guidance_job`:
  - the log must belong to `p_user`, or `insufficient_privilege`;
  - consent `2026-10-05` is checked again at commit time;
  - if the child's memory is paused, nothing is written and the call returns 0;
  - at most four memories, each with a non-empty content and a source of `parent_said` or `ai_inferred`; the worker cannot choose the stored provenance;
  - parent statements are stored as source `log` with confidence 1; inferences as `ai_inferred`, capped at 0.7;
  - a memory whose content already exists for the child (case-insensitive) is skipped, so a retry is idempotent;
  - every row has `confirmed_at = null` and a 30-day review date, so it is a suggestion until the parent confirms it.
- QuickLog copy now says what happens: the note goes into the weekly report, and anything worth remembering becomes a suggestion to review.

## Invariants kept

- Guidance uses only confirmed, unexpired, non-private, non-archived memories when memory is enabled. Unchanged.
- No raw history or log is injected into guidance. Unchanged; `tests/server/memory-context.cases.ts` still asserts `recentLogs` is empty.
- Suggestions never become approved facts on their own.
- Pausing memory stops new suggestions, checked at commit time.
- Erasure: `context_logs` and `memories` cascade from `auth.users`.

## Tests

- `tests/sql/log-memories.sql`: parents cannot execute the function; cross-family logs refused; more than four or a forged provenance refused; parent statements become `log` at confidence 1, inferences capped, duplicates skipped, retries idempotent; pause and withdrawn consent at commit; family isolation; erasure.
- `tests/server/log-memories.cases.ts`: the worker passes the note and known memories to the extractor, commits only when there is something to keep, stops before the model on no consent, a paused child or a missing note, and absorbs model and commit failures.
- `scripts/test-family-plan-routes.mjs`: the real `/api/log` handler saves the note under RLS and schedules exactly one follow-up.

## Not done

- Notes written before this release do not get suggestions retroactively. The parent can add a memory by hand.
- `recentLogs` and `pastDecodes` remain fields on `DecodeContext` for the WhatsApp path's type compatibility; both are always empty.
