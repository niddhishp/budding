# Budding.live — launch runbook

Everything needed to take the app from this repo to paying users, in order.

## 1. Database (Supabase project `udqvdkuiwmzhlrqxvvks`)

**Fastest:** add `SUPABASE_DB_URL` to `.env.local` (Supabase → Connect → Session pooler URI, with the DB password), then:

```bash
npm run db:check     # lists clashes with leftover Synaptix objects; must say "No clashes"
npm run db:migrate   # applies every file below once, in order, each in a transaction
```

**Or manually** in the SQL editor, in order, stopping on any error:

| File | Creates |
|---|---|
| `supabase/000_precheck.sql` | Nothing. Lists name clashes with leftover Synaptix objects. Must return 0 rows. |
| `supabase/schema.sql` | `children`, `context_logs`, `decodes` + RLS |
| `supabase/002_billing.sql` | `subscriptions`, `consents` |
| `supabase/003_reports.sql` | `reports` |
| `supabase/004_phase2.sql` | `stories`, `story-audio` bucket, `week_guides`, `expert_requests` |
| `supabase/005_whatsapp.sql` | `whatsapp_links`, `whatsapp_link_codes`, `decodes.channel` |

Then **Authentication → URL Configuration**: Site URL = production domain; add `https://<domain>/auth/callback` (and `http://localhost:3000/auth/callback` for dev) to Redirect URLs. **Authentication → Email Templates**: rebrand the magic-link email from Synaptix to Budding.

Note: existing Synaptix accounts share this auth pool and can sign in to Budding.

## 2. Environment

Copy `.env.example` → `.env.local` (dev) and set the same keys in Vercel (Production + Preview).

Required: Supabase URL, anon key, service-role key · `ANTHROPIC_API_KEY` · Razorpay key id/secret, both plan ids, webhook secret.
Recommended: `BUDDING_FAST_MODEL=claude-haiku-4-5` (safety check + caregiver messages at a fraction of the cost).
Optional: ElevenLabs (story narration), Resend (expert-request alerts).

## 3. Razorpay

1. Start in **Test mode**. Subscriptions → Plans: ₹299 monthly and ₹1,999 yearly → copy ids into `RAZORPAY_PLAN_MONTHLY/YEARLY`.
2. Settings → Webhooks: URL `https://<domain>/api/billing/webhook`, events `subscription.*`, secret → `RAZORPAY_WEBHOOK_SECRET`.
3. Before going live: complete KYC, recreate both plans and the webhook in Live mode, swap keys.

## 3b. Twilio WhatsApp

1. **Testing (today):** Twilio Console → Messaging → Try it out → *Send a WhatsApp message* (sandbox). Each tester first sends the sandbox's `join <word>` message to +1 415 523 8886.
   Sandbox settings → *When a message comes in*: `https://<domain>/api/whatsapp/webhook`, method **POST**.
2. **Production:** Messaging → Senders → WhatsApp senders → register your own number (Meta Business verification runs through Twilio; allow 1–3 weeks). Point its webhook at the same URL and update `TWILIO_WHATSAPP_FROM` / `NEXT_PUBLIC_WHATSAPP_NUMBER`.
3. Replies are sent inside WhatsApp's 24-hour customer-service window, so no message templates are needed. Proactive daily tips would need approved templates; not built.

## 4. Deploy

Push to GitHub → import in Vercel (framework auto-detected) → set env → deploy → attach domain → set `NEXT_PUBLIC_SITE_URL`.

## 5. Smoke test (production, Razorpay test mode)

- [ ] `/quiz` → result page → WhatsApp share preview shows the card image
- [ ] Sign in by magic link → consent screen → add a child (born) and one (expecting)
- [ ] Decode a moment: "Say this" streams in first; rate it "worked"
- [ ] Decode an urgent message ("he said he wants to die") → red banner with 112/1098/14416 + expert button
- [ ] 4th decode in a week on Free → upgrade sheet opens
- [ ] Upgrade with a Razorpay test card/UPI → "Welcome to Plus"; Supabase `subscriptions.status` = active
- [ ] Share a decode in Hindi → WhatsApp opens with Devanagari text
- [ ] Bedtime story → "Read it to us" plays (ElevenLabs if configured, device voice otherwise)
- [ ] Expecting child → Today shows the week guide
- [ ] Log 3 moments → Child tab → generate weekly report → Save PDF
- [ ] Request expert call → row in `expert_requests` (+ email if Resend set)
- [ ] Menu → Connect WhatsApp → send code → "✅ Connected"; message a situation → decode arrives; reply `1` → outcome saved
- [ ] Cancel Plus → "Cancelled, access until …"
- [ ] Delete account → all rows gone, sign-in returns to onboarding

## 6. Daily operations

Expert queue (fulfil manually: call, match a psychologist, send a payment link):

```sql
select r.created_at, r.source, r.phone, r.preferred_language, r.preferred_time, r.concern, u.email
from expert_requests r join auth.users u on u.id = r.user_id
where r.status = 'new' order by (r.source = 'safety') desc, r.created_at;
-- after calling: update expert_requests set status = 'contacted' where id = '…';
```

Unit economics to watch weekly: decodes per Plus user, Anthropic spend ÷ Plus revenue (target < 35%), free→Plus conversion, quiz → sign-up rate.

## 7. Before scaling

- **Legal:** fill every `[placeholder]` in `/privacy` and `/terms`; appoint the Grievance Officer; counsel review.
- **Quality:** read 50 real decodes; then trial `BUDDING_MODEL=claude-sonnet-5-5` on the same scenarios — if quality holds, it halves cost.
- **Deferred by design:** proactive WhatsApp messages (need approved templates), voice notes on WhatsApp, international payments (Stripe), self-serve expert marketplace (validate demand through the concierge queue first).
