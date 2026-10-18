# Family overview, savings goals and private photo timeline

18 October 2026. Approved scope: the family overview and savings planner from FAMILY-PLANNING-AND-REFERRALS.md, plus the user's explicit choice to include a private photo timeline now. Video export and social sharing remain separate.

## Implementation plan

1. Add independent owner-scoped, revision-checked family records, without rewriting existing care/profile data. Events and goals can belong to one child or the whole family. Photo memories require a child. Keep archive/restore and safe lost-response retries. Use a private storage bucket and authenticated image responses, never public photo URLs.
2. Add Plan navigation with a week/month list, child/all-family filter, recorded care dates, birthdays calculated from saved dates, parent-entered events and savings target dates. Distinguish recorded dates, calculated dates and past planned dates; retain drafts on errors. Let parents hide amounts.
3. Savings goals capture cost today, target date, already saved, monthly contribution and optional annual inflation/return assumptions. Calculate whole monthly contributions from today to the target, effective monthly compounding and inflation-adjusted cost. Show cash contributions separately from hypothetical growth, shortfall and required monthly contribution. Default both assumptions to zero. No bank access, transactions, product commissions, guaranteed rates or individual fund recommendations. Provide a sourced educational comparison of common saving approaches.
4. Child links to a private chronological photo timeline. One JPEG/PNG/WebP photo per dated memory, title and caption. Validate/decode images on the server, strip metadata, resize to at most 1600 pixels and store JPEG. Limit input to 3 MB and 24 megapixels. Reserve a bounded owner-scoped record before upload, retain incomplete uploads for explicit retry, and never replace an already saved photo. Metadata is editable; archive/restore is reversible. Account erasure removes the complete photo prefix, including incomplete uploads, before auth deletion. No AI ingestion or public sharing.
5. Verify calculator/date fixtures, schema validation, row-level ownership, direct RPC misuse, revision conflicts/retries, quotas, storage privacy, archive/restore and erasure. Run full checks, clean SQL bootstrap, provider regression checks and production build. Verify actual compiled routes using disposable fixtures where available. Deploy additive migration only after testing; compare existing table fingerprints. Deploy exact CI-passing code, inspect production aliases and live desktop/mobile screens.

## Design decisions

Use the existing warm paper/terracotta typography and simple vertical layouts. Plan is a shared family view, while the photo timeline remains attached to the selected Child. No placeholder memories or invented savings data. Empty states explain the first real action. Health dates link to the original diary; saving and photography are not connected to BMI, horoscope or inferred aptitude.

Separate row records avoid replacing existing notebooks or losing sibling edits. Optimistic revisions preserve concurrent drafts; a retry of the immediately preceding identical write succeeds. Errors are explicit rather than presenting unavailable data as empty. Browser-local amount visibility starts hidden; saved goals persist privately on the server.

## Source and review

Financial education checked 18 October 2026: https://investor.sebi.gov.in/moneymatters-budandfinangoal.html ; https://www.indiapost.gov.in/banking-services/savings . Do not hard-code advertised current interest rates. Scheme rules must be rechecked before using eligibility recommendations. Storage access follows https://supabase.com/docs/guides/storage/security/access-control . Changelog reviewed: current TLS deprecation does not require weakening modern clients; no new affected legacy crypto/index types are introduced.

## Release evidence

Pending implementation and verification; append exact results before release handoff.
