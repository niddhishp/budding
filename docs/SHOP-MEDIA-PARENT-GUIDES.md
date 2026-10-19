# Shop media, puberty, safety and public reading

Implementation date: 2026-10-19. Release evidence is recorded below after deployment.

## Scope and design

- Preserve the existing catalogue, feedback, family plans, memories, health records and authentication. No schema changes or production data mutations are required.
- Shop for Kids browses ten reviewed products per page. Pictures and INR offer prices appear inside Kahiye; clearly labelled Amazon purchase links open the retailer. Images and prices also link to the relevant product, as Amazon requires. No automatic navigation or purchases.
- `/api/shop/media` requires parent authentication/current consent, validates at most ten ASINs, and checks current publication/review eligibility before provider access. It returns only image addresses/dimensions, numeric INR prices and freshness timestamps. No family information is sent to Amazon.
- Creators API GetItems uses OAuth, the India marketplace, new-condition offers, primary large images and OffersV2 prices. Both envelope spellings in Amazon's current documentation are accepted. Nullable resources, partial responses, missing prices and restricted advertised prices fail safely. Image origins are explicitly allowlisted.
- Server memory holds at most 1,000 short-lived product entries for ten minutes; missing products are retried after one minute. Concurrent requests share work, requests are paced per instance, and provider errors back off. These are per-instance controls; Amazon's account quotas remain authoritative across multiple server instances. No persistent product-content cache, image copying, scraper, reviews or generated prices. Responses are private/no-store. Browser state expires and refreshes on focus; no local-storage product cache.
- Browsers load images directly from Amazon with no referrer; privacy copy describes the ordinary network information Amazon receives. Images bypass Next image optimisation/storage. Timestamps and availability/price notices accompany offers.
- Guide to Puberty and Safety are available in Today, Child and Discover. Conversation age starts from the selected child's birth date, can be changed without saving, and resets between children. Unknown ages require a choice rather than guessing. Girls/boys paths describe common body changes without inferring sex from names or growth references.
- Twelve authored guides cover preparation, periods, boys' changes, privacy, body boundaries, unsafe requests, online manipulation, peer pressure and substance-use prevention. Each has words to borrow, a practice activity, a scenario and a revealable response. Ages guide discussion, not clinical milestone predictions. No sensitive developmental observations are collected.
- All twelve guides are also public articles, alongside the original twenty. Homepage navigation and a featured reading section, Today links, source links, canonical/Open Graph/Twitter metadata, Article structured data and sitemap entries support discovery. Publication does not guarantee search-engine indexing or ranking.

## Provider activation

Set these **server-side Vercel environment variables** after Amazon approves the site and Creators API access, then redeploy:

- `AMAZON_ASSOCIATE_TAG`: public India Associates tag.
- `AMAZON_CREATORS_CLIENT_ID` and `AMAZON_CREATORS_CLIENT_SECRET`: approved Creators API credentials, not legacy PA-API keys.
- `AMAZON_CREATORS_VERSION`: the credential version, currently 3.1, 3.2 or 3.3. India is listed with 3.2, but use the actual credential version Amazon issues.
- `AMAZON_LINKS_ENABLED=true`: enables tagged purchase links after approval.
- Optional existing `AMAZON_DISCOVERY_ENABLED=true`: enables daily draft discovery; it does not publish products.

Admin → Shop → Provider setup lists readiness and the operating method. Publish an editorially reviewed product with an ASIN and current review expiry, then verify its image, current INR price, timestamp and final Amazon destination in the parent shop. Missing credentials or products leave honest empty/unavailable states. The integration is contract-tested; live authentication, entitlement, quotas and offer accuracy must still be checked after credentials are added. Financial referral activation remains separate and unchanged.

Provider references checked 2026-10-19: [GetItems](https://affiliate-program.amazon.in/creatorsapi/docs/en-us/api-reference/operations/get-items), [OAuth and curl](https://affiliate-program.amazon.in/creatorsapi/docs/en-us/get-started/using-curl), [OffersV2](https://affiliate-program.amazon.in/creatorsapi/docs/en-us/api-reference/resources/offersV2), [images](https://affiliate-program.amazon.in/creatorsapi/docs/en-us/api-reference/resources/images), [India agreement](https://affiliate-program.amazon.in/help/operating/agreement).

## Editorial review

NHS, AAP HealthyChildren and NSPCC sources are linked per guide and were checked on 2026-10-19. Kahiye-authored examples are general parent education, not personalised medical advice. Independent clinical and safeguarding review remains pending and is stated publicly. Review with the available professional team before describing the content as professionally approved. No abuse-prevention guarantee, diagnosis, fertility prediction or child-responsibility framing is made.

## Verification

- `npm run check`: lint, TypeScript, 53 unit and 25 server tests.
- `npm run test:security:bootstrap`: fresh disposable PostgreSQL, all security/ownership/consent/MFA/revision/erasure suites.
- Actual Next route handlers exercised against disposable SQL: unauthenticated/invalid/unpublished/paused media requests; not-configured fallback; simulated Amazon media success and cache reuse; existing shop, family plan and private-photo flows.
- `npm run test:providers`: existing Razorpay/Resend/Twilio signature, receipt and concurrency contracts; no provider sends.
- Production build and hosted UI evidence: pending release checks below.

Rollback: redeploy the previous application commit. No migration rollback is needed. Preserve the existing photo erasure/cleanup routes.
