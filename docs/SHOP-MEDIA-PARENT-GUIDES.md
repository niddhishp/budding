# Shop media, puberty, safety and public reading

Deployed 2026-10-19. Application commit `732bd54519a1e0ea88ec5294692fb4c9e10038b9` on `main`.

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
- `npm run build`: passed; 84 generated pages, including all 32 public articles.
- Exact-commit GitHub CI: branch run `39201480622` and main run `39201691773` both successful.
- Vercel production `dpl_fqSLAAa3Q2eYdh8hVXG4vjpmXYVH` Ready; exact commit above, aliases `www.kahiye.app` and `kahiye.app`.
- Protected preview HTTP: homepage and article 200, crawlable featured links, indexable article metadata and valid Article JSON-LD. Preview authenticated routes have no Supabase preview environment and returned the existing setup-unavailable response; no configuration/security changes were made to work around it.
- Live production: anonymous media endpoint 401, public article 200. Signed-in Today → Puberty selected the existing 11–13 age band correctly; switching to boys/14–17, expanding a response, Child → Safety, younger age selection, mobile scenario expansion and Discover → Shop were verified without saving parent data.
- Mobile 390×844: no horizontal overflow in guides, shop, homepage or article. Homepage Articles navigation, article search (three period results) and source links worked. No Kahiye console errors; an earlier Vercel login FedCM error was unrelated to the app.
- The live catalogue remains unpopulated; real Amazon photo/price rendering and provider authentication are still pending credentials and reviewed products. Provider behaviour was tested with simulated payloads, not claimed live-verified. No production fixtures were created.
- Disposable SQL ended with zero test users, shop records and family entries; the task-owned Docker container was stopped and removed.
- Screenshot evidence: `C:/Users/Admin/.codex/visualizations/2026/10/17/01a14a81-9a08-7f22-ab03-d2a79055ac2f/puberty-guide-live.png` and `safety-guide-mobile-live.png`. Temporary browser tab closed; viewport reset; original user tab left untouched.

Rollback: redeploy the previous application commit. No migration rollback is needed. Preserve the existing photo erasure/cleanup routes.
