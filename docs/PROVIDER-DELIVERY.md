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

### Owner setup checklist

In Vercel → reactic → budding → Settings → Environment Variables, use **Production**. Secret values remain server-only. Redeploy after changes; presence alone does not prove readiness.

| Service | Variables / action | Verification before enabling |
| --- | --- | --- |
| Razorpay | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_PLAN_MONTHLY`, `RAZORPAY_PLAN_YEARLY`, `RAZORPAY_WEBHOOK_SECRET` | Keys and plan IDs must belong to the same test/live mode. Published plans are INR 299/month and 1,999/year, interval 1. Admin → Launch readiness → Check Razorpay plans fetches and checks both without creating a charge. |
| Paid checkout | Keep `BILLING_LIVE_ENABLED=false` until the acceptance matrix below is signed off; set true only with live keys/plans | Test-mode keys can never enable production checkout. A successful mandate/Checkout callback alone never grants paid access. |
| Resend alerts | `RESEND_API_KEY`, `RESEND_FROM` (such as `Kahiye <alerts@kahiye.app>`), `EXPERT_NOTIFY_EMAIL` (actual operations inbox), `RESEND_WEBHOOK_SECRET` | Verify the sending domain's DNS in Resend, confirm the recipient, send one reviewed test consultation alert, verify both provider receipt and inbox. Configuring email enables existing pending alert retries. |
| Twilio | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM=whatsapp:+<approved-number>`, `NEXT_PUBLIC_WHATSAPP_NUMBER=+<same-number>` | Buying a number alone does not register a WhatsApp sender. Complete Twilio WhatsApp/Meta onboarding and number verification. Start with the sandbox/owned tester before public activation. |
| WhatsApp switch | `WHATSAPP_ENABLED=false` until an owned test number and sender are ready; explicit true enables the channel | Check connection link, a response, STOP, callback delivery and disabled/re-enabled behavior. Do not send unsolicited messages. Free-form replies are cancelled after 23 hours as a conservative margin inside the 24-hour window. |
| Recovery | `CRON_SECRET` is generated and installed by this release, minimum 32 characters | `/api/cron/delivery` runs every minute. Admin shows last completion and errors. It performs retention cleanup even while message providers remain disabled. |

Provider webhook URLs (POST):

- Razorpay: `https://www.kahiye.app/api/billing/webhook` — select subscription lifecycle events, including authenticated, activated, charged, pending, halted, cancelled, completed, paused and resumed where offered. Match the secret to the environment. Disable the historical alternate-domain webhook if it duplicates this destination. Unknown ownership is deliberately retryable and needs reconciliation.
- Resend: `https://www.kahiye.app/api/email/webhook` — email.sent, email.delivered, email.delivery_delayed, email.failed, email.bounced, email.complained. Copy its signing secret into `RESEND_WEBHOOK_SECRET`. Do not rely on acceptance as proof of delivery; bounced/complained alerts need recipient investigation, not blind retry.
- Twilio inbound: `https://www.kahiye.app/api/whatsapp/webhook`. Leave `TWILIO_WEBHOOK_URL` unset unless overriding with that exact configured URL. The app supplies a signed status callback per outbound message under `/api/whatsapp/status?job=<receipt>`; preserve that URL and query in provider callbacks.

### Authentication email (separate from Vercel alert keys)

In Supabase project `udqvdkuiwmzhlrqxvvks` → Authentication → Email/SMTP settings, configure a verified Resend sender: host `smtp.resend.com`, port `465` with TLS, username `resend`, password the Resend API key, sender name `Kahiye`, sender email the chosen verified address. Keep email confirmation enabled. Check the site URL and the existing `/auth/callback` redirects; disable email link tracking for auth links. Configure suitable auth rate limits after testing.

Vercel `RESEND_API_KEY` does **not** configure Supabase SMTP automatically. The owner must supply the sender address and an owned inbox for signup/recovery tests; the agent must not reset the real owner's password or send unapproved test messages.

References: [Resend SMTP](https://resend.com/docs/send-with-smtp), [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [Resend webhook verification](https://resend.com/docs/webhooks/verify-webhooks-requests), [Twilio sender onboarding](https://www.twilio.com/docs/whatsapp/self-sign-up), [Twilio status callbacks](https://www.twilio.com/docs/messaging/guides/outbound-message-status-in-status-callbacks), [Razorpay test subscriptions](https://razorpay.com/docs/payments/subscriptions/test/).

### Provider acceptance matrix — still requires external evidence

| Scenario | Expected evidence | Current evidence |
| --- | --- | --- |
| Published monthly/yearly plans | Provider mode, INR amount, period and interval match | Automated validation implemented; live/test credentials checked from protected admin control after deployment |
| Successful test authorization and capture | Test payment ID, subscription ID, signed charged receipt, bounded paid access | Deterministic handler + SQL tests pass; actual provider checkout pending |
| Failed/cancelled checkout and renewal failure | No unearned access; correct pending/halted state; safe retry/reconciliation | Deterministic tests; actual provider scenario pending |
| Duplicate/reordered callback and cancellation | One receipt, no reactivation by an older event, paid period preserved | Actual handlers against disposable SQL pass; provider dashboard replay still pending |
| Email alert and authentication recovery | Provider delivery plus owned-inbox receipt; working auth callback | Pending Resend domain/sender/recipient/SMTP configuration |
| WhatsApp | Approved sender, owned test number, connection + reply + delivered callback + STOP | Signed-handler, database and concurrency tests pass; sender purchase/registration and real conversation pending |

Do not enable billing/WhatsApp switches merely because keys have been entered. No real provider transaction, delivery or refund is claimed by deterministic tests. Refund/dispute handling remains a documented manual provider operation; it is not implemented as an automatic refund endpoint.

## Local verification

18 October: lint, TypeScript and 49 unit/server tests passed; a clean database bootstrap through migration 018 and the full ownership/consent/MFA/erasure, quota and consultation-capacity suite passed. New SQL checks cover atomic linking, stale leases, duplicate receipts, feedback recovery, STOP/consent suppression, expiry, uncertain-send quarantine and delivery-event ordering. Six-way concurrent token redemption, receipt insertion, preparation claims and send claims each admitted one winner. Actual Razorpay/Resend/Twilio route handlers were exercised against disposable PostgreSQL with synthetic signatures, including invalid signatures, payment activation/capture/cancel/order, unknown-subscription retry, email replay and callback ordering. These tests perform no external provider sends or payments.

The production build passed; 45 HTTP route/auth/origin checks passed against it. Updated Next.js from 15.5.15 to 15.5.28; pinned patched PostCSS/Sharp through overrides and updated compatible transitive packages. The production dependency audit reports zero known advisories at verification time. A patched AVIF encoder smoke test passed. Development-tool advisories remain separate from the deployed runtime; no forced major framework upgrade was made.

The Vercel Pro plan was verified. A fresh server-only CRON_SECRET was installed for Production without exposing its value. No existing credentials were overwritten. Production release evidence follows below.
