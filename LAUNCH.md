# Kahiye — commercial launch runbook

Updated 20 October 2026. The application is deployed at https://www.kahiye.app.
Deployment is not commercial or clinical approval. This runbook supersedes the
old installation instructions, magic-link smoke test and manual SQL operations.

## Current release scope

The parent app uses Today, Ask, Handbook, Child and You. Child age and profile
drive relevant guidance. Private family records, savings goals, photos, growth,
health reminders, interests, play and the curated shop already have engineering
foundations. Ask and guidance return checked responses, not raw model output.

Clinical and safeguarding review remains **pending by owner instruction**.
The review packet contains placeholders; no reviewer approval is inferred from
automated tests. See [the review packet](docs/CLINICAL-REVIEW.md) and
[the implementation handoff](docs/HANDOFF.md) for the latest release evidence.

## 1. Review readiness in the protected team workspace

Sign in with email/password, complete authenticator verification and open
`/admin/launch` as an owner or operations member.

- The configuration checklist returns names and booleans, never secret values.
- “Configuration present” means the values exist, not that delivery, payment,
  clinical review, merchant approval or partner approval succeeded.
- “Check Razorpay plans” reads the provider plans and checks ₹299/month and
  ₹1,999/year, INR and the billing intervals. It does not create a subscription.
- The recovery worker runs every minute. A completed pass older than five minutes
  needs investigation; a recent pass does not prove inbox delivery.
- Review uncertain WhatsApp sends against provider history before retrying.
  Email receipts and retry status live on each consultation.
- Configuration is a snapshot: refresh after changes. Changing Vercel variables
  requires a new deployment before the running application sees them.

## 2. Outstanding owner/provider inputs

Production configuration names inspected on 20 October 2026:

| Area | Current evidence / missing step |
| --- | --- |
| Billing | Razorpay credentials, plans and webhook secret present; live activation absent. Earlier read-only verification confirmed test plans. Real test checkout, charge/renewal failure, cancellation and callback acceptance remain pending. |
| Operations email | Resend key, verified sender, operations recipient and webhook secret absent. Supply an approved owned test inbox before a delivery test. |
| Authentication email | Separate Supabase SMTP setup and real password-recovery delivery need verification; Resend operations alerts do not configure auth email. |
| WhatsApp | Credentials and sandbox number present; production sender purchase/approval, owned test number and activation pending. |
| Amazon | API credentials, credential version, Associates tag and activation absent. Review real catalogue products after approved access is available. |
| Financial referrals | Partner arrangements and activation pending. Savings planning does not require a referral partner. |
| People and policy | Confirm expert credentials, capacity, absence cover, legal entity/address, grievance contact and adviser-reviewed policies. Public legal pages still contain placeholders. |
| Clinical review | Deliberately pending: articles, pregnancy, growth interpretation, safeguarding, guidance and flagged live-test routing cases. |

Add secrets directly in the relevant provider/Vercel settings. Never paste them
into chat, screenshots, source control or evidence documents. See `.env.example`
for variable names. Do not copy production credentials into preview environments
or overwrite a developer’s existing `.env.local`.

## 3. Provider acceptance sequence

Detailed setup and expected evidence:
[Provider delivery](docs/PROVIDER-DELIVERY.md).

1. **Payments:** prepare an isolated acceptance harness/deployment with test-mode
   credentials and a disposable family. The current app checkout guard requires
   live keys everywhere; simply adding test keys to a preview does not open it.
   A separately reviewed test harness is still needed for real checkout acceptance.
   Confirm both plan prices, successful authorization/capture, the signed
   `subscription.charged` receipt and bounded paid access. Exercise abandoned and
   failed checkout, renewal failure, cancellation, duplicate and out-of-order
   callbacks. Authentication alone must not grant Plus. Reconcile against the
   provider dashboard. Refunds/disputes remain manual provider operations.
2. **Email:** verify the sending domain, `RESEND_FROM`, `EXPERT_NOTIFY_EMAIL`,
   `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET` and recovery worker. With an approved
   test recipient, verify acceptance, actual inbox delivery and signed
   delivered/bounce events. **Adding sending credentials can resume existing
   queued alerts**; inspect the queue first.
3. **WhatsApp:** purchase and approve a business sender; set matching
   `TWILIO_WHATSAPP_FROM` and `NEXT_PUBLIC_WHATSAPP_NUMBER`. Keep
   `WHATSAPP_ENABLED=false` until an owned test conversation verifies linking,
   the reply, callbacks, STOP and replay handling.
4. **Shop:** verify approved Amazon access and a real item’s image, INR offer and
   availability. Review product suitability, referral disclosure and destination
   before publishing. Test a manual discovery recipe before enabling automatic
   draft discovery. Financial partners require separate approved arrangements.

Production callback paths:

| Service | Callback |
| --- | --- |
| Razorpay | `https://www.kahiye.app/api/billing/webhook` |
| Resend | `https://www.kahiye.app/api/email/webhook` |
| Twilio inbound | `https://www.kahiye.app/api/whatsapp/webhook` |
| Twilio status | Generated per job by the application; preserve its job query parameter. |

Keep `BILLING_LIVE_ENABLED`, `WHATSAPP_ENABLED`, `AMAZON_LINKS_ENABLED`,
`AMAZON_DISCOVERY_ENABLED` and `FINANCE_REFERRALS_ENABLED` closed until their
respective acceptance checks are documented. Proactive daily email/WhatsApp
guidance is not enabled by adding provider keys; it remains separate work.

## 4. Protect data and release the exact tested commit

The database migration ledger currently covers `schema.sql` and numbered
migrations through `024_conversation_boundaries.sql`. Never reinstall
`ALL_IN_ONE.sql`, rerun historical cleanup manually, delete current users, or
reset the production database. Legacy removal has already been handled.

For an approved schema change, first run the read-only `npm run db:check`
against the intended database and review pending files. The migration runner
uses the ledger and transactions. Confirm backups and record before/after
data-preservation evidence; apply only reviewed pending migrations. This
readiness release needs **no database migration**.

Release verification:

```text
npm run check
npm run test:security:bootstrap
npm run test:providers
npx tsx --conditions=react-server scripts/test-family-plan-routes.mjs
npx tsx scripts/verify-handbook-render.tsx
npm run build
```

Database tests must use a disposable local database, never production.
The GitHub Verify Kahiye workflow supplies one. Provider route tests use
synthetic signatures and mocked services; they do not prove real delivery.

Push the feature branch, wait for the exact commit’s full CI to pass, then
promote that commit to `main` only after checking for intervening changes.
Verify Vercel project `reactic/budding`, production environment, READY state,
commit SHA and aliases. Record CI and deployment IDs in `docs/HANDOFF.md`.

After deployment, check public pages, anonymous API rejection and protected
admin access. Use only explicitly approved synthetic accounts for authenticated
write flows. Do not test deletion, payments or messaging on a real family.
If a release fails, restore the previous verified deployment; never undo
customer records as a rollback strategy.

## 5. Daily operations and remaining separate work

Use the admin consultation queue for assignment, overdue follow-up, capacity,
scheduling and delivery receipts. Do not coordinate care through ad hoc SQL.
Rehearse absence cover with the real team. An expert request is not emergency
monitoring or confirmation that a parent has been contacted.

Check recovery freshness, uncertain sends, bounced email, payment receipts,
provider costs and reviewed catalogue expiry. Record acceptance evidence without
family messages, clinical notes or secrets.

Separate follow-ups include proactive daily outbound guidance, clinical quality
review tooling, fully reviewed multilingual content, caregiver/teen access
design, and photo video/social-sharing workflows. None should be represented as
completed merely because the app has deployed.
