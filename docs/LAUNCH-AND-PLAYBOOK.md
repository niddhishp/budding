# Release: programmes, partners, sponsors, playbook (21 October 2026)

Branch `claude/launch-and-playbook`. Migrations 031–033 are applied to production **before** the code deploys.

## What parents get
- **Guided programmes** ([GUIDED-PROGRAMMES.md](GUIDED-PROGRAMMES.md), migration 031). There are five free 7-day programmes:
  - potty training
  - screen-off
  - first period
  - body talk, early years
  - body talk, growing up

  Each day has words to say, an activity, what to leave out, a practice prompt and a help line. A rating from 1 (easy) to 5 (very hard) at the start and at the finish shows the parent their own change. Every programme is labelled "Clinical review pending".
- **What works for {child}.** The Child page keeps the words a parent marked as having helped, with a "Share with a caregiver" button. It is built only from the parent's own feedback.
- **Films.** Handbook cards and programme days embed a Vimeo or YouTube film once one is linked. Films are added in `src/data/handbook-films.ts` and `src/data/programmes.ts`, and the embed check is in `filmEmbed`.
- **Partner services** ([PARTNER-SERVICES.md](PARTNER-SERVICES.md), migration 032). These are offers from cleared partners, each labelled as a partner offer. Parents can enquire, with explicit confirmation of what is shared. The database enforces contract, terms, grievance contact, police verification and insurance, and health partners can never be on commission. **No partners are seeded, so parents see nothing yet.**
- **Sponsored access** ([SPONSORED-ACCESS.md](SPONSORED-ACCESS.md), migration 033). Schools, employers, clinics and communities can buy Plus for their families with codes. Sponsors see totals only, with groups under 5 hidden. `reserve_guidance` is patched with a guarded text replacement.

## Legal and launch
- `src/lib/legal-identity.ts`: the operator is Niddhish Puuzhakkal, sole proprietor of Light Seeker Films. The address and contacts come from `NEXT_PUBLIC_*` variables in Vercel. Until they are set, the pages say "being finalised".
- The privacy page adds a paragraph on partner enquiries and on sponsors. The terms add a "Partner services" section, and there is a `#grievance` anchor.
- Two new admin launch checks: "Legal details on privacy and terms" and "Sign-up and password emails" (`AUTH_SMTP_VERIFIED`).
- **Everything the owner must provide is in [OWNER-INPUTS.md](OWNER-INPUTS.md).**

## Verification
- `npm run check`: 95 unit and 62 server tests.
- Fresh pgvector/pg17 bootstrap: 23 database suites, including programmes, partners, sponsors and the seat race.
- Route suites: 10, including partners and sponsors.
- Providers, render (including the programme and partner renders), build, and SEO (47 pages).

## Rollback
The code can be reverted with a Vercel rollback. The migrations are additive, but **033 must stay in place while any build that reads `sponsored_access` is live**.
