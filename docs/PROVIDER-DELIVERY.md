# Payment, email and WhatsApp delivery

Approved continuation, 18 October 2026. Preserve existing work and data; deploy tested code. The owner confirms Razorpay/Twilio accounts are ready, will add keys to Vercel, and has not yet purchased the WhatsApp sender number. Email sender/recipient and owned test destinations are not yet supplied.

## Design

Use the existing Supabase transaction/lease pattern rather than introducing another queue vendor. Persist a signed WhatsApp inbound receipt before acknowledging it, atomically consume high-entropy account-link tokens, prepare one response under a lease, then send from the persisted outbox. Generation can retry; an interrupted external send cannot blindly retry because Twilio message creation does not provide the same documented idempotency contract as Resend. Signed status callbacks resolve acceptance/delivery, including callbacks that race the HTTP response. STOP cancels pending work immediately. Consent, current phone ownership and the 24-hour reply window are checked before sending. An already in-flight external send cannot be recalled.

Run bounded recovery batches through Vercel Cron every minute (the existing team is Pro), authenticated with CRON_SECRET. Keep channel activation explicit and require provider configuration. Redact completed message bodies; purge transient WhatsApp jobs after seven days. No marketing, unsolicited templates or parent email sending is added.

Keep consultation email's frozen payload, provider idempotency key and 23-hour retry cutoff. Add signed Resend delivery/bounce/complaint callbacks, delayed automatic retry and operational visibility. Authentication email remains Supabase SMTP: document the exact provider settings, verify real signup/recovery only with the owner's test inbox.

Payment: validate configured plan amount/currency/interval before checkout; expand lifecycle/signature/replay tests; add protected read-only provider configuration checks. Test-mode provider checkout/charge/renewal/cancellation evidence must be recorded before live enablement. Never substitute mocked tests for provider transaction evidence.

## Acceptance and deployment order

1. Additive migration, server-only grants/RLS, queue transitions and erasure/ownership tests.
2. Signed webhook routes, durable workers, cron authentication, admin delivery/readiness visibility.
3. Payment configuration guards and deterministic tests; provider setup runbook.
4. Lint/typecheck/unit and SQL/concurrency tests, route/browser checks, build/CI.
5. Apply migration with before/after data fingerprints, deploy exact tested commit, verify live closed-channel behavior.

## Provider setup and verification

Never paste API keys or passwords into chat. Use Vercel Production environment settings and Supabase Auth SMTP settings. Existing production Secret values cannot be downloaded by the CLI; no attempts are made to expose them.

The detailed environment checklist and release evidence are appended after implementation. No real messages or payment tests are considered completed without provider evidence and an owner-approved test destination.
