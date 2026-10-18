# Phase 6: family resources and launch foundations

User authorization: complete the next phase, add the supplied 20 article topics, growth tracking with percentiles, milestone alerts, a play centre and a fuller pregnancy section. Preserve existing work/data and retain the pregnancy-to-18 vision.

## Design and implementation order

1. Public, searchable article library at /articles and individual article pages. All 20 requested subjects, original practical writing, source links, category, age context, calculated reading time and visible editorial status. No invented clinician names or claim of clinical review. Indexable metadata and sitemap entries. Retain the current paper/clay typography.
2. Add a Discover navigation destination linking the article library, growth, milestones, play and pregnancy tools. Preserve the primary Decode loop. Load these tools only when visited.
3. Additive parent-owned storage: dated growth entries (kg/cm, measurement method, archive/undo, revision checks) and per-child care settings (explicit chart reference, preterm caveat, optional milestone reminders, saved observations, pregnancy checklist/notes, favourite play). Auth, current consent, cross-child ownership, bounded payloads and erasure cascades enforced at the database and API. New data never enters AI context automatically.
4. Growth: actual measurements plus WHO reference curves for birth to two years from the CDC-published daily LMS dataset. Preserve the downloaded source and checksum. Calculate by exact age in days; compare recumbent length only; suppress percentiles outside supported age/method, when reference is unknown or preterm is selected. Older children can retain measurements without unsupported percentiles. No diagnosis, targets or growth scores; include an accessible data table.
5. Milestones: age-based examples through five years with links to full CDC checklists. Optional in-app reminders for the current/next checklist, dismissible and saved per child. Observations are parent-reported, never an exam or completion score. No push/email notification permission is requested and no outside messages are sent. Developmental concerns or lost skills point to a clinician, not an AI conclusion.
6. Play: age/context filters, specific low-preparation activities, materials, short steps, supervision and stop cues; saved favourites. Pregnancy: gestational dates, trimester guidance, preparation checklist, private questions/notes for appointments, support planning, clear urgent-care guidance and a profile-edit path after birth. Keep the existing optional weekly guide.
7. Launch foundations: billing duplicate/out-of-order webhook handling and paid-period expiry; truthful disabled checkout/WhatsApp state until production providers are activated; owner/operations launch-readiness view with configuration checks and explicit manual gates. Do not pretend SMTP, verified WhatsApp, KYC, legal identity or clinical review can be supplied by code.

## Alternatives and boundaries

A CMS-first rollout would delay the useful family tools; a large automatic health dashboard would imply clinical capability and add notification infrastructure. Use authored version-controlled articles and deterministic reference tools now, with existing role permissions ready for later editorial operations. No percentile extrapolation, automatic diagnosis, inferred sex/reference, automated medical reminders, fabricated experts or paid-provider activation.

## Verification

Unit tests for reference values, age boundaries, suppression, reminder dates and content integrity; SQL ownership, consent, revision and erasure tests; billing replay/order tests; HTTP guards; desktop/mobile browser save/reload/error workflows; CI/build; production migration fingerprints and read-only live checks. No real payments, messages or production test families.

Release evidence will be appended as checks finish.
