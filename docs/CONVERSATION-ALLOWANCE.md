# Conversation allowance

20 October 2026. This change was made on the owner's instruction. Before it, every chat or practice message used one Ask turn, so a Free parent (3 turns a week) could send only three messages before running out.

## Rule

- **Starting** a chat ("Talk it through") or practice conversation uses one Ask turn.
- Later messages in the same conversation are included, up to **10 messages** (`CONVERSATION_MESSAGE_LIMIT` in `src/lib/plans.ts`).
- Message 11 returns `conversation_full`, and the parent starts a fresh conversation, which uses another turn.
- "Help with a moment" guidance is unchanged: each request uses one turn, and its two quick follow-ups remain free.
- Safety support never uses the allowance.
- Existing bounds still apply to included messages: a daily processing ceiling (20 attempts on Free, 100 on Plus) and at most two concurrent generations.

## Implementation

- **Migration `025_conversation_allowance.sql`.** It patches `reserve_guidance` in place, using the same verified text replacement as 017 and 018. The usage count now excludes decodes that both continue an earlier decode and carry conversation analysis. No rows are rewritten.
- **`src/lib/conversation-allowance.ts`.** It measures a conversation by following continuation links. An unknown, cyclic or over-long chain counts as full, so incomplete history can never make a message free.
- **`/api/analyze`.** For continued chat or practice it loads the latest 100 messages in that mode for the child, then checks the length. A message within the limit is reserved as uncharged; message 11 is refused before any model call.
- **`getEntitlement`.** The "turns left" figure excludes the same included messages.
- **Wording.** Plans, Terms and the Ask footer explain the rule in plain words.

## Verification

- `npm run check`: lint, TypeScript, and 109 unit and server tests pass. New tests cover chain length, the limit, incomplete history and cycles.
- **Disposable database suite.** It ran from an empty pgvector/pg17 bootstrap through migration 025 and passes. The new `tests/sql/conversation-allowance.sql` shows:
  - two conversation starts plus five continued messages leave one Free turn
  - a third start reaches the limit
  - an included message is reserved uncharged

  It **fails without migration 025**, which was checked by removing the file. The existing "eight concurrent requests reserve exactly one slot" test still passes.
- **Route handlers against real SQL.** The opening message is charged and the continued one is not, and the usage the parent sees is unchanged after the continued message. The fake database API now accepts exactly the new usage filter.
- The provider-route and race suites, the render check and the build all pass.
- **Production migration, applied 20 October.** The patched definition is verified, the 018 paused-subscription patch is preserved, execution is still limited to `service_role`, and the ledger row is recorded.

## Rollback

Revert the application commit. The migration can stay: with the old code, continued messages are reserved as charged but no longer counted, so parents get slightly more usage, never less. To fully restore the old count, reverse the text replacement with the same guarded pattern.
