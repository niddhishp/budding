# Gifts, preferences and curated referrals

Approved scope, 18 October 2026: build the engineering now; the owner will configure Amazon India Associates/Creators API and financial partners later.

## Experience
Discover and Plan lead to Shop for Kids and Gifts & rewards. Every child has editable shopping preferences and a private occasion/reward notebook. Suggestions use age, explicitly selected shopping interests, styles and materials, plus reversible product feedback. Health, conversations, horoscope, savings amounts and inferred family wealth never enter ranking. A rejection affects that product; parents explicitly choose broader exclusions. No purchase is inferred from a click.

## Publishing and discovery
Owner/operations staff with MFA manage products, discovery recipes, financial partners and aggregate settlement records. Discovery uses coarse age bands and editor-selected interests, never names, birthdays or private notes. Manual and daily scheduled searches only queue ASINs as drafts. Editors write original descriptions, check age/safety/size evidence, and set a review expiry before publishing. Expired and paused items disappear automatically. No scraped images, reviews or prices; Amazon API content is transient and never persisted in the catalogue. Retailer links are direct and disclosed, with an optional non-referral link. No commission-based ranking or rewards for affiliate clicks.

## Financial referrals
Separate adult-facing partner directory, outside personalized savings projections. Publication requires a registered entity, verification evidence, documented referral arrangement, risk/fee disclosure, approved destination host and review expiry. No lead data is sent and no account is opened by Kahiye. Commission/reconciliation records stay admin-only. This engineering gate does not replace professional review of each proposed arrangement.

## Delivery
Additive migration; existing tables/data untouched. Private parent records cascade on account/child erasure. Authenticated API validation, service-only mutation functions, ownership checks, revision conflicts, bounded records, audited admin writes and rate-limited discovery. Provider configuration is disabled by default. Tests cover isolation, consent, role/MFA boundaries, conflicts, expiry, matching, provider errors and URL safety. Ship only after checks/build/CI, then verify production desktop/mobile without creating real family records.

## Sources and provider setup
- Amazon India operating agreement and content licence: https://affiliate-program.amazon.in/help/operating/agreement
- Creators API authentication: https://affiliate-program.amazon.in/creatorsapi/docs/en-us/get-started/using-curl
- SearchItems: https://affiliate-program.amazon.in/creatorsapi/docs/en-us/api-reference/operations/search-items
- SEBI circular 2025/11, associations with persons engaged in prohibited activities: https://www.sebi.gov.in/sebi_data/attachdocs/jan-2025/1738152590849.pdf

Amazon credentials belong in Vercel, not chat. Account/site approval, live provider contract verification and actual affiliate settlement reconciliation remain activation checks after configuration. Product candidates never publish themselves.

## Implementation notes
- Paths: Discover or Plan -> Shop for Kids / Gifts & rewards; admin -> Curated shop.
- Shopping preferences can learn from saved/purchased categories and styles; parents can disable this, undo feedback or reset preferences. Rejection affects only the individual item; reasons are stored for the parent, not interpreted by an AI.
- Admin demand aggregation requires three distinct consenting families per age-band/interest cohort. A team member can create a discovery recipe from the group; automatic searches remain opt-in and draft-only.
- Discovery runs daily at 09:00 Asia/Kolkata, one enabled recipe per run, oldest attempted first; ten results maximum. Status and provider errors are visible beside each recipe. Existing ASINs are never overwritten by discovery.
- Prices and product images are not copied into the catalogue. Original editorial descriptions and category illustrations are used; current price, variants and checkout stay on Amazon. Live media/price enrichment can be added after provider activation with Amazon licence-compliant refresh/retention.
- Financial referral activation is a separate environment switch. No financial partner is seeded or claimed approved. Aggregate settlement records are manual entries from provider statements, not measured conversions or automatic payout feeds.
- Existing private family/photo records and erasure recovery remain intact. Roll back application code only; do not drop populated new tables. Keep the family-photo deletion worker when rolling back any release after photo uploads.

## Release verification — 18 October 2026
- Production application code: `01fbe5ea88c5e3a892f74af22d3f258e15dd69b9` on main.
- GitHub Verify Kahiye: `39108328638` passed on that exact revision; initial implementation run `39108189962` also passed.
- Vercel: `dpl_9Vsu9zPExj1w8c7JS9sQjeX4rALJ`, Ready, https://budding-ax96xn360-reactic.vercel.app, aliases www.kahiye.app and kahiye.app.
- 52 unit tests and 22 server tests passed; lint, TypeScript and production build passed. Production dependency audit: zero reported vulnerabilities.
- Clean disposable PostgreSQL applied all 21 migrations; ownership/consent, no direct client writes, staff MFA, revisions/retries, audit, discovery claim limits and erasure passed. Existing provider signature/concurrency and family-photo suites passed.
- Actual shop and admin route handlers ran against isolated SQL: save/retry, conflicts, rejection/undo, private evidence redaction, paused-product hiding and admin role access. Creators API transport was simulated; real Amazon access is not verified until credentials are configured.
- Production migration atomically compared fingerprints of all existing public application tables (except the migration ledger), auth users/identities/sessions and storage objects. All matched; otherwise it would have rolled back.
- Security advisors: unchanged two public-extension warnings and leaked-password-protection warning. Two additional no-policy informational findings are intentional for service-only catalogue/discovery tables.
- Signed-in desktop 1280x720 and mobile 390x844: Shop, preference controls, Gifts, reward fields, Plan entry points, financial setup state and default horoscope checked. No console errors, no horizontal page overflow. All test forms cancelled. Product purchase/real API delivery/payouts not exercised.
- Live `/admin/shop` correctly required MFA; no authentication state was modified. Full admin browser visual check awaits an authenticated team session; admin HTTP/SQL behavior is covered by isolated tests.
- Anonymous shop/admin APIs and unauthenticated discovery cron return 401. Final production counts: shop records 0, catalogue records 0, discovery runs 0, pending photo erasure 0.
- Owner confirmed an Amazon India Associates account exists but requested engineering first; remaining provider setup and finance partners will be configured later.
