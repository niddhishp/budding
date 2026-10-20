# Synthetic live-model evaluation

This runner calls the same safety, routing, guidance, conversation and output-check functions as the app, with an explicitly injected OpenRouter transport. It does **not** read/write Supabase, create users, consume parent allowances, or send email/WhatsApp. Production keeps its existing provider; OpenRouter is used only by this local test runner.

Put `OPENROUTER_API_KEY` in ignored `.env.local`. Use an externally capped key; never share its value in chat or commits. Provider request routing forbids training/data-collection providers, requires structured outputs and disables provider fallbacks. Only fictional fixtures may be supplied here. These controls do not constitute a guarantee about every intermediary's retention.

PowerShell (direct invocation avoids npm/PowerShell argument-forwarding differences):

```powershell
$env:BUDDING_FAST_MODEL='claude-haiku-4-5'
node node_modules/tsx/dist/cli.mjs --env-file-if-exists=.env.local --conditions=react-server scripts/eval/run.ts '--suite=conversation' '--limit=6' '--budget-usd=3' '--max-requests=30'
```

Main defaults to `claude-opus-5-5`; mapping is explicit to OpenRouter's catalogue IDs. Verify both names against production before claiming comparable configuration. Route transport and latency differ from production. No substitute model is silently chosen if a catalogue entry is unavailable.

Options:

- `--only=id1,id2` or `--suite=conversation|golden|crisis|false_alarm|diagnosis|discipline|pseudoscience|injection|hindi`
- `--limit=6` defaults to six fixtures; maximum 100.
- `--concurrency=1` defaults to one; maximum three.
- `--budget-usd=5` and `--max-requests=100` bound conservative request reservations. Input bytes plus overhead and the requested maximum output tokens are priced from the live catalogue, without cache discounts. Reservations remain spent after errors/timeouts. **This is an estimate, not a provider invoice or a substitute for an external credit cap.**
- `--safety-only` does triage only.
- `--judge` enables additional paid model grading. Default is deterministic assertions plus manual engineering review. A judge is not a clinician.

Safety routing is sequential. Support/unavailable results never enter the generator. An unavailable classifier is an evaluation failure even though withholding advice is the correct runtime behaviour. Explicit expected paths detect over-escalation. A guidance rubric skipped due to support routing is flagged for human review rather than counted as validated guidance.

Reports checkpoint after every case under ignored `results/`. They include generated synthetic text, safety path, latency, route fallback, validated call usage/cost where supplied, retained reservations, source hashes and **unreviewed** clinical status. Cost after a network timeout may be unknown. Keep failed runs; do not replace their evidence with successful reruns.

For each release, inspect actual answers as well as automated assertions, retest changed paths, and publish a sanitized findings summary. Clinical ownership and sign-off are in [CLINICAL-REVIEW.md](../../docs/CLINICAL-REVIEW.md).

Transport references: [structured output documentation](https://openrouter.ai/docs/guides/features/structured-outputs), [provider routing](https://openrouter.ai/docs/guides/routing/provider-selection), [live model catalogue](https://openrouter.ai/api/v1/models).
