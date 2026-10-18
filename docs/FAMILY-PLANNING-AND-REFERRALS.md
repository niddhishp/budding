# Family planning and trusted referrals — proposed implementation design

18 October 2026. Status: BMI interpretation and optional Western sun-sign reflection are the immediate release slice. Family overview, savings-goal scenarios and the private photo timeline are now deployed; see FAMILY-PLANNER-TIMELINE.md for exact scope and evidence. Gifts, curated shop and referral operations below remain proposed, not deployed features. User chose simple birth-date sun-sign commentary, not a Vedic birth chart. Existing family data must remain intact.

## Product intent

Help a parent see the whole family over time: what matters today, what is approaching, what to prepare for and what can wait. A useful action may be free time together, a conversation, saving money or doing nothing. Shopping is one optional response to a parent-recognised need. No paid ranking, behavioural advertising, parent score, child ranking or artificial urgency.

Recommended structure:

- **Today:** at most three prioritised actions, existing urgent support always accessible, recorded care reminders, one interest invitation, one parent-support prompt. Optional horoscope at the bottom.
- **Child:** growth and health records, interests, everyday observations, memories and wishlists.
- **Plan:** family overview, shared calendar, goals and costs, education/activity planning, upcoming celebrations and care appointments.
- **Discover:** editorial guidance, free activities and a clearly labelled curated shop.
- **Admin:** editorial review, evidence and product safety, merchant/referral configuration, feedback and operational exceptions.

## Alternatives considered

1. Add an independent tab for every feature: quick initial delivery, but more navigation and repeated data entry. Not recommended.
2. Let a general AI recommend products, investments and parenting tasks: broad coverage but weak provenance, unstable eligibility, unreviewed advice and commercial bias. Not recommended.
3. A shared family planner with deterministic eligibility, reviewed content/catalogue and explicit parent preferences: more foundation work, but recommendations stay explainable and maintainable. Recommended.

## Immediate slice: understandable growth and optional reflection

BMI interpretation uses the unrounded age/reference-adjusted result, not the displayed rounded percentile. Supported results show within/below/above the healthy-weight reference range and a proportionate next step. Unsupported extremes retain clinician-review guidance rather than inventing extended percentiles. No conclusion that the child is healthy overall, no target weight, dieting, supplement or product recommendation. Missing reference, unsupported age or incomplete measurements produce no interpretation.

Western sun sign uses conventional date ranges, explicitly approximate near boundaries. One short authored reflection changes by India-calendar day. No personality or future-health claims. Sign is visible in Child; daily reflection is optional via a browser-local per-child preference. No additional birth data, AI call, server write or product-ranking input.

## Phase 1 — family overview and planning foundation (P0)

Deliver a compact week/month overview for each child and all children together. Combine recorded care dates, parent-entered school/club events, celebrations, saved interest activities and savings reviews. Show provenance: recorded by parent, reviewed guide, or calculated from a date. Distinguish unknown from overdue. Avoid duplicating the same action across cards.

Use new owner-scoped records rather than expanding existing JSON objects that older clients can overwrite. Suggested entities: family_goals, family_events, preference_choices and reminder_preferences. Each record has owner, optional child, revision, archive/restore, timestamps and clear deletion behaviour. Existing tables are read without rewriting them. Plan permissions for a future co-parent invitation, but do not expose family records to another account by default.

Acceptance: multi-child isolation, dates/timezones, edit/conflict/retry, old data preservation, empty states, keyboard/mobile checks. No fabricated school calendars or growth deadlines. A parent can dismiss or postpone an optional activity without losing progress or receiving guilt-based prompts.

## Phase 2 — child financial planning (P1; depends on Phase 1)

Start with goals and education, not financial product sales. Parent inputs: goal, target date, estimated cost today, amount already set aside, affordable monthly contribution and optional inflation/return assumptions. Use an adjustable scenario calculator showing contributions separately from assumed growth, uncertainty and the gap. Defaults must be labelled assumptions, never guaranteed returns. Support zero-return scenarios and a target-date-before-today error. Separate long-term goals from near-term fees and emergency money.

Provide a reviewed comparison library for savings accounts, recurring/fixed deposits, PPF, Sukanya Samriddhi where eligible, and mutual-fund categories. Explain liquidity, risk, maturity, eligibility, costs and source/last-reviewed date. SIP is a contribution method, not a guaranteed-return product. Do not recommend a particular fund or personalised asset allocation without an appropriate regulated advisory service and suitability process.

Eligibility must use current rules and parent-confirmed facts. For example, a new Sukanya account generally requires a girl below age ten: an eleven-year-old must not receive an invitation to open a new account. An existing account can still be tracked. Do not infer scheme eligibility from the child's name, horoscope or BMI chart choice. Check whether product maturity aligns with the actual goal date rather than recommending by popularity.

Initial release records parent-entered balances/contributions; no bank connection, custody, investment execution or financial affiliate links. Optional referral to a verified SEBI-registered adviser is a separately reviewed future service. Parent chooses whether amounts appear on the family overview. No financial details in notification previews.

Acceptance: independently checked calculator fixtures, rounding, zero/negative/invalid assumptions, date and scheme eligibility, no guaranteed projections, archived goals, private ownership and accessible charts. Rate/tax rules require a source and review date; expired entries must be visibly stale or withheld.

## Phase 3 — celebrations, gifts and encouragement (P1; depends on Phase 1)

Keep occasion gifts separate from rewards for agreed, achievable behaviours. Capture occasion/date, budget, recipient, existing items, interests and parent exclusions. Suggest experiences, making something together, library visits, privileges chosen with the child and physical gifts. “No purchase needed” is a first-class result.

An encouragement plan lets parent and child agree on one practical behaviour and a modest recognition. Do not reward weight/BMI, eating amounts, hiding feelings, affection, compliance with unwanted touch or outperforming other children. Avoid making every hobby a paid-performance target. Pause, revise and end a plan without punishment or confiscating previously earned recognition.

Wishlist states: considering, saved, already own, purchased, no longer needed. Track duplicate gifts. Purchases only become recorded purchases after explicit parent confirmation or an authorised merchant receipt; a click is not a purchase. Optional gift sharing must produce revocable minimal links, without child DOB, health notes, full profile or private savings information.

Acceptance: budgets, duplicate detection, event recurrence, archive/restore, child/occasion-specific exclusions, private versus shared data, no unsolicited purchase prompts from health concerns.

## Phase 4 — curated shop and learning preferences (P1; depends on Phases 1 and 3)

Launch with a small manually reviewed catalogue of books, art materials, games, hobby tools and age-suitable experiences. Avoid medical, supplement and financial product recommendations in this catalogue. No live scraping or AI-generated inventory presented as handpicked. Catalogue size expands only as editorial review capacity permits.

Every item needs a named editor, editorial reason, evidence/source links, allowed image rights, age range with source, safety limitations, materials/dimensions where relevant, merchant/seller, price-check timestamp, delivery geography, returns/warranty link and review-expiry date. Draft → reviewed → published → expired/paused. Recall or safety concern disables recommendation and merchant links immediately. Review merchant claims instead of repeating unverified “boosts IQ” language.

Candidate pipeline: published and current → safe/age/geography eligibility → hard parent exclusions and budget → interest/need fit → preference match → diversity and duplicate suppression. Commission must not be an input to ranking. Do not show “best” unless an actual comparison supports it. Cards explain why selected, trade-offs, last price check, cost and referral disclosure. A zero-result state is preferable to an unsuitable product.

Feedback choices: like/save, already own, too expensive, wrong age, wrong interest, dislike material/style, safety concern, not now, other. Ask whether a choice applies to this product, this child, this occasion or the whole family when ambiguous. One rejection must not become a permanent global ban. “Not now” expires; budget feedback offers an explicit preference edit. A safety concern goes to editorial review rather than merely personalising it away.

Store explicit preference events with provenance and scope, not an opaque psychological profile. Parent can inspect, correct, undo and reset learned preferences. Keep each child’s interests separate from the payer’s taste. Allow exploration and new interests. Do not infer spending power, disability, religion or family distress from browsing, medical records or conversations. Use explicit parent choices rather than passive tracking of children.

Acceptance: deterministic ranking fixtures show commission changes cannot change rank; hard filters always win; undo changes results; sibling preferences do not leak; age transitions invalidate stale fits; already-owned products are excluded; expired/unsafe products disappear; loading failures do not silently substitute unreviewed inventory.

## Phase 5 — referral revenue and delivery operations (P2; depends on Phase 4)

Use a separate merchant-offer/referral layer. The same editorial item can have affiliate and non-affiliate sellers. Affiliate availability cannot make an item eligible. No sponsored ranking slots, paid editorial approval, countdown pressure or discounts fabricated from stale prices.

The user-facing promise should be “No paid placements. Recommendations chosen independently. Some links may earn Kahiye a referral fee.” Do not call a monetised recommendation non-commercial or hide the connection behind a privacy policy. Disclose beside each relevant link before the parent clicks. Only claim no additional cost when the actual arrangement supports that statement.

Admin maintains partner programme, contract/terms review, destination domain allowlist, offer status, permitted tracking, disclosure text and payout reconciliation. The redirect resolves an approved offer ID server-side; never accept an arbitrary destination URL. No DOB, child name, interests, health notes or savings data in affiliate URL parameters. Where attribution is permitted, use an opaque reference with minimal retention and appropriate parent choice, and reconcile refunds/cancellations rather than counting clicks as revenue.

Day-to-day admin needs editorial review queue, overdue reviews, broken links, price/availability freshness, reported safety issues, recall response, rejected recommendations, affiliate errors and net commission after reversals. Editing/publishing permissions must follow existing admin authentication/MFA, least privilege and audit logs. Merchant accounts do not gain access to family profiles.

Notifications: opt-in per channel and content type, quiet hours/timezone, frequency cap, child-scoped preferences, pause/unsubscribe and idempotent delivery. Send a generic care reminder linking to the private diary rather than a condition/medication name on a lock screen. Health and crisis conversations never include a sales CTA. Provider activation alone must not enable campaigns or daily sends.

Measure parent-rated usefulness, ignored/unwanted recommendations, successful exclusions, product returns, safety incidents and editorial freshness. Referral revenue is a secondary operational metric. Do not optimise for clicks, time spent or repeated buying at the expense of family outcomes.

## Later additions worth considering

School transitions and documents; co-parent coordination with granular permissions; consent-based clinician record export; age-appropriate independence and digital-safety conversations; life-event preparation; an annual family review; the previously discussed private photo timeline. Add these when the basic overview and delivery operations are reliable, rather than crowding Today with every module at launch.

## Sources checked 18 October 2026

- CDC child BMI categories and screening limitations: https://www.cdc.gov/bmi/child-teen-calculator/bmi-categories.html and https://www.cdc.gov/bmi/child-teen-calculator/calculator.html
- SEBI goals, budgets, investment considerations and adviser roles: https://investor.sebi.gov.in/moneymatters-budandfinangoal.html ; https://investor.sebi.gov.in/investment-thingsbeforeinv.html ; https://investor.sebi.gov.in/investment_advisor.html
- India Post scheme catalogue and eligibility: https://www.indiapost.gov.in/banking-services/savings ; https://www.indiapost.gov.in/api/documents/file/103pg0i2m4g701grd3jv2e3da860fhn10sjr80fiob3ennq01gju3mn7q07234 . Do not use an old brochure's rate as today's rate.
- AAP parent resource on reward planning: https://www.healthychildren.org/English/family-life/family-dynamics/Pages/Positive-Reinforcement-Through-Rewards.aspx
- ASCI disclosure guidance: https://www.ascionline.in/influencer-resource/ and https://www.ascionline.in/the-asci-code-guidelines/ . Product-specific legal review is still required before financial promotion or affiliate activation.

## Inputs before commercial activation

Choose the first product categories and catalogue editor; identify approved merchants and affiliate programmes; confirm initial geography, currency and budget bands; decide who maintains financial scheme content and expert review. No API keys in chat. Proposed default: India/INR, small editorial catalogue, experiences/free options included, no financial-product commissions, no payments collected by Kahiye for shop purchases.
