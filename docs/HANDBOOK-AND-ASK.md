# Handbook and Ask — approved product reframe

20 October 2026. The owner's approval is the latest request to implement the five-item navigation and anticipatory handbook, retain horoscope/shopping/savings, and add chat. Preserve all existing records and features.

## Experience

Five primary destinations on desktop and phone: Today, Ask, Handbook, Child, You. Existing detailed destinations remain reachable inside these spaces, with a meaningful back link. No destructive removal of legacy records or source modules.

Today offers immediate help, one age-relevant conversation or parent-chosen follow-up, relevant saved family dates, care reminders, growth access and a light optional horoscope. It no longer assigns fixed temperament identities.

Handbook uses DOB automatically. Topic tracks cover body/consent, money, emotions, learning, safety, digital life, friendship/pressure, family, health and independence. Editorial conversation cards provide words, a practical activity, an example response to resistance, adaptations and source links. They are educational examples, not clinically validated interventions. Existing Puberty, Safety, Play, Stories, pregnancy and articles stay accessible.

Parents can mark a conversation tried, save it for later, or set a follow-up date. Saved status is a parent's record, never a developmental score. Moment preparation uses dates the parent supplied; no invented school calendars or inferred pregnancies.

Ask has practical guidance and a conversational mode. Parent-facing rehearsal is explicitly fictional, never a prediction of the actual child's response. Each generated turn uses existing safety/content checks, ownership, idempotency, quota and account-erasure mechanisms. Conversation history is explicitly continued, bounded and isolated by child. Rehearsal/chat must not automatically create memories about a child.

## Preserved choices and safeguards

- Horoscope stays, labelled for fun and separate from consequential advice.
- Gifts, shop, savings and family planning stay. Paid partnership disclosure remains distinct from recommendations and clinical guidance.
- No raw generated advice before content checks. No automatic reinsertion of raw logs after memory is disabled or stopped.
- No claim that sleep-time affirmations teach values; use awake, specific encouragement and ordinary rehearsal without jargon or guarantees.
- No new teen-facing companion, autonomous external sending, financial transactions or provider activation.
- Do not claim human clinical review of new editorial cards. Source review is not clinical validation.

## Implementation and validation

1. Shared child-age context and five-item navigation; retain nested paths.
2. Handbook content, bounded revision-safe saved progress and date-based preparation; concise Today and useful Child/You links.
3. Conversational/rehearsal generation using existing checked, durable guidance flow; prompt deduplication and static-prefix caching, additional deterministic safety tests.
4. Content/age/schema tests, isolation and failure tests, actual route/SQL regression, lint/typecheck/build, bounded synthetic model evaluation where configured.
5. Preview and production verification; record exact commits and limitations. No real family test writes.

The broader quality-review admin inbox, fully reviewed multilingual curriculum, caregiver accounts and teen rights model remain separate follow-up projects; they are not silently implied by this UX release.

## Engineering and verification record

- 34 authored cards: two expecting, two infant, and ten topics at each of ages 3–5, 6–12 and 13–17. These are an initial editorial library, not a complete clinically reviewed curriculum.
- Handbook status shares the existing revision-controlled care record. Both write paths merge the other feature's fields; stale saves return a conflict. No care record backfill or replacement.
- Chat/practice reuse private guidance history and existing allowance/erasure controls. Explicit continuation is limited to four earlier turns of the same mode and child. They are excluded from weekly reports and caregiver share rewrites.
- Additive migration 024 blocks outcome and extracted-memory writes sourced from conversations, including direct authenticated RPC access and faulty background workers. Continuation checks also enforce conversation mode. The migration was created through the Supabase CLI and placed in this project's existing numbered ledger.
- Production migration applied on 20 October. Before/after fingerprints matched across 17 existing family, guidance, catalogue and consultation tables; existing records were preserved. Trigger installation verified. Security advisors reported no new findings. Existing findings remain: service-only RLS tables intentionally have no user policies; [extensions in public](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public) and [leaked-password protection disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) are pre-existing follow-ups, not silently fixed here.
- Final `npm run check`: lint, TypeScript, 64 unit tests and 31 server tests passed (95 total). `npm run build` passed.
- Disposable database security/concurrency suite passed, including direct outcome-RPC rejection, background-memory rejection, same-mode continuation and existing account erasure tests.
- Actual Handbook/care/analyze/outcome/share/report route handlers ran against disposable SQL with simulated provider transport. Verified ownership, consent, revision conflicts, data preservation, explicit continuation, receipt replay, rejection without charge, crisis bypass and no fictional observations in reports. All fixtures rolled back.
- Existing Razorpay/Resend/Twilio signature, replay/order and concurrent receipt/lease tests passed. No real provider messages or charges.
- Actual component rendering checked synthetic ages 1, 4, 11 and 16, exactly five phone navigation buttons, age-appropriate Handbook content, AI/fiction labels, retained family tools and no fixed temperament claims. This is a render assertion, not a phone-sized browser screenshot.
- Production AI credentials are non-exportable Vercel Secrets. No live-model evaluation was possible from the local environment; simulated transport tests do not establish response quality, model latency or clinical efficacy.
- Static system instructions use provider prompt caching; family context stays in the user message. Constitution duplication is removed. Unchecked text is never streamed to parents.
- Supplied Parenting Research documents stay local and untracked. No production family test records or external messages were created.

Release commit, CI and live-browser results are recorded after deployment below.
