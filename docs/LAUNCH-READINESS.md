# Launch operations follow-up — 20 October 2026

Scope approved by the owner: continue remaining launch work, preserve existing
work/data, test and deploy; keep clinical review pending.

## Implemented

- Protected launch diagnostics now cover billing, email delivery/receipts,
  WhatsApp, Amazon pictures/prices, referral links, discovery and financial
  partners. They expose configuration names and booleans, never values.
- Configuration is explicitly separated from real-world verification. Activation
  switches remain unchanged; no provider, partner or clinical approval is inferred.
- Recovery freshness distinguishes missing/invalid timestamps, worker failures,
  an overdue pass and recent completion. More than five minutes without completion
  needs investigation for the every-minute schedule.
- Refresh clears the previous report so an error cannot leave an old successful
  status looking current. Snapshot time and manual-refresh behaviour are visible.
- The stale launch runbook has been replaced with current auth, migration,
  release, provider acceptance and operating instructions.

No schema migration, production data write, provider activation, message,
payment or AI-provider request is part of this change. Existing family records,
clinical-review placeholders, untracked research and local evaluation artifacts
remain intact.

## Verification

Local lint, TypeScript and all 106 tests pass (64 unit, 42 server). Six additional
tests cover missing setup, secret non-disclosure, test/live billing separation,
email callback/recovery requirements, mismatched WhatsApp numbers, independent
shop gates and worker freshness. Production build and existing actual-component
SSR checks for ages 1, 4, 11 and 16 pass. `npm audit --omit=dev` reports zero known
vulnerabilities at verification time.

Application commit: `718814ba45ba8e9fb4df5748efdf82a3270b1e08`.
Exact branch CI `39435264256` and main CI `39435715495` both passed, including
fresh SQL/security bootstrap, provider/concurrency tests, actual route tests,
SSR and production build. Vercel production `dpl_DXZoKyVsyQsdmRUJmhhLVD7DGKhq`
is READY on `www.kahiye.app` and `kahiye.app`, with the matching commit.

Live checks passed: home, articles and immediate support return 200; anonymous
admin diagnostics (including plan checks), Handbook and cron return 401.
Analyze rejects missing Origin with 403 and same-origin anonymous calls with
401. An initial smoke expectation of 401 without Origin was corrected to match
the existing origin guard; no application change was needed. Admin diagnostics
did not expose configuration to anonymous callers.

The signed-in parent dashboard renders the existing selected child, five-item
navigation, age-specific guidance and saved interests, with no browser errors.
No parent records were edited. The admin session reaches the authenticator gate;
signed-in visual verification of the new admin dashboard is pending. Access
controls were not bypassed. The new deployment's runtime error query returned
zero records in the immediate post-release window; this is not long-term
monitoring or proof of provider delivery.

## Still missing

The read-only Vercel production configuration inventory confirms missing Resend
setup, Amazon credentials/tag and activation switches. Twilio still displays the
sandbox sender. Razorpay credentials/plans are present; prior verification was a
read-only test-plan check, not an actual checkout or charge.

See [LAUNCH.md](../LAUNCH.md) for exact configuration names, acceptance evidence
and the owner/provider inputs needed. Clinical review stays pending. Paid
checkout, WhatsApp and referrals are not being declared commercially ready.
