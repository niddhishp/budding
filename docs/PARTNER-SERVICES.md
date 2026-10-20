# Partner services

Built 21 October 2026 on branch `claude/partner-services`, migration `032_partner_services.sql`. Not deployed. No partners or offers are seeded, so parents see nothing until the team adds a partner whose gates are all satisfied and activates a reviewed offer.

## The model

Kahiye is a **facilitator**. Partners (home health labs and vaccination services, hospitals, paediatricians, dietitians, tuition, skill classes, venues for days out, therapy and speech services) deliver their services under their own contracts and legal responsibility. **Parents pay partners directly**; Kahiye never collects payment for a partner service. Kahiye earns a listing fee, a booking fee or a commission, paid by the partner.

Positioning rule: every offer enters through a parenting moment and fits the child's age (and city, or "online"). There is no marketplace feed, no display advertising, no fee-based ranking, and every offer is labelled.

## Where offers appear

| Place | What can appear | Limit |
|---|---|---|
| Child page, right rail: "For {name} now" | Any category, age/city matched, moment matched | 3 |
| Health diary: "Care services near you" | Home health and vaccination, hospital, paediatrician, dietitian | 3 |
| Interests: "Classes for what {name} enjoys" | Skill classes, shown when the offer's interest matches a saved interest (or set to "always") | 3 |
| Handbook, Learning & school topic and school cards: "Extra learning support" | Tuition, always next to Kahiye's own guidance on pressure ("Marks are information, not identity" from 13, "Make starting homework smaller" before) | 3 |
| Today | Only an offer whose moment is "vaccination due" or "check-up due", and only while such a date in the parent's own health diary is within the next 7 days or passed in the last 30 | 1 |

Moments: `always`, `vaccination_due`, `checkup_due`, `exam_season` (Feb–Mar by default, or chosen months), `interest` (an interest id), `handbook_track` (a Handbook topic id), `programme` (a named programme, treated like "always" but never on Today). Exam-season and interest offers never reach Today.

Order is the editorial order the offers were created in. Fees, fee models and clicks never affect order or inclusion.

When there are no matching active offers, nothing renders: no empty box, no "coming soon".

## What every offer shows

- Label: **Partner offer · Kahiye may earn a fee · {provider} provides this service under its own terms**.
- Provider name, the price label as the partner states it, and "Online" or the city.
- Under "Terms, fees and concerns": the provider is responsible for the service and its price, the parent pays the provider directly, how Kahiye is paid (listing fee, booking fee or commission), a link to the provider's own terms, the provider's grievance contact, and Kahiye's grievance officer (`/privacy#grievance`).
- Footnote: shown for the child's age and city, never by fee; nothing is shared unless the parent sends an enquiry.

The privacy notice ("Who processes it") and terms ("Partner services") now describe this. **Both pages still contain placeholders for the legal entity and grievance officer; a lawyer must review the new paragraphs and fill those in before any offer is activated.**

## Enquiries and DPDP consent

An offer's next step is either a **link** to the partner's page (Kahiye appends only `ref=kahiye`; no family, child or session identifier) or an **enquiry**.

An enquiry has two screens:
1. The parent enters their name, chooses phone or email, and may write a short message. They are asked to leave out the child's name, health details and notes.
2. A consent screen lists **exactly** what the partner will receive: the parent's name, the phone or email they chose, the child's age band (for example "6–8 years"), the city if one is saved, and the message if they wrote one. It states what is not shared (the child's name, health diary, notes, conversations with Kahiye, anything else in the account). The parent ticks an agreement for this enquiry only.

`create_partner_lead` in SQL then checks the privacy consent (`2026-10-05`), the partner-enquiry consent flag and text version (`partner-enquiry-2026-10-21`), child ownership, and that the offer is visible and takes enquiries. It **builds the shared fields itself** from a fixed list; a table constraint rejects any other key. It refuses a parent name or message containing the child's name (whole-word, case-insensitive). Receipts make retries idempotent; the same offer and child cannot be sent twice in a day; at most 10 enquiries per parent per day.

Each enquiry stores snapshots of the provider name and offer title, the shared fields, the consent version and a status (`new`, `sent`, `closed`). Parents can read their own enquiries (RLS own-read), they appear in the family export under each child as `partner_enquiries`, and they are erased with the child or the account.

**Partner email delivery is not built.** The team forwards each new enquiry from `/admin/partners` → Enquiries, with exactly the fields shown, then marks it sent. The parent's confirmation says Kahiye passes the details on; it does not promise a time.

### Optional city

`children.city` is a nullable, parent-chosen city on the child profile ("Update profile" → "A little about home"), from a short list of Indian cities, "Other" (typed), or "Prefer not to say". It is only for matching local offers. It is loaded by the parent's own app shell (`PARENT_CHILD_COLUMNS`) but **not** by guidance, stories or reports (`CHILD_COLUMNS` is unchanged), so it never enters AI context. Without a city, only "online" offers match. It is exported with the profile.

### What decides placement

The health diary and saved interests are read under the parent's own access, in the offers route, to decide whether a moment matches. Nothing from them leaves Kahiye or is stored with an event.

## Child-safety and ethics gates (enforced in SQL)

Gates hold for every writer: the admin route, the service role and direct SQL. Table constraints and triggers enforce them; the visibility function re-checks them on every read, so an expired contract hides offers without anyone editing anything.

A partner can be **active** only with:
- a contract signed date that is not in the future, and an expiry date (if any) not passed;
- the partner's own terms link (https), a contact email for forwarding enquiries, and a grievance contact;
- for categories involving in-home or one-to-one contact with children (`health_lab`, `paediatrician`, `dietitian`, `tuition`, `skills`, `therapy`, `other`): **police verification confirmed** and **professional liability insurance confirmed**. Hospitals and venues are institutions where a parent is present; they are exempt from these two flags but not from the contract, terms and grievance requirements.

Health partners (`health_lab`, `hospital`, `paediatrician`, `dietitian`, `therapy`) can **never** be on `commission`, even as a draft: booking fee or listing fee only (medical-ethics constraint against per-patient referral payments).

Payment model is fixed to `direct_to_partner`.

An **offer** can be active only if it has been reviewed (activation records the reviewer and date), its category matches its partner's, and its partner is ready. Pausing a partner hides all its offers at once. A partner's category cannot change while its offers have another category.

## Data model

| Table | Who can read | Who writes |
|---|---|---|
| `partners` | Service role only | `save_partner` (owner/operations, AAL2 session, revisioned, audited) |
| `partner_offers` | Service role only; parents through `partner_offers_for_child` | `save_partner_offer` (same checks) |
| `partner_leads` | Parent: own rows (RLS). Team: through `partner_admin_overview` (no account or child ids) | `create_partner_lead` (parent, consent-checked); `set_partner_lead_status` (team, audited) |
| `partner_events` | Service role only | `record_partner_events` (views and clicks of visible offers) and enquiries |

`partner_events` stores only offer, kind (`view`, `click`, `lead`) and time. No user, child, session or device identifier, so it is not personal data, survives erasure, and cannot be used for behavioural profiling. Views are sent once per offer per browser session.

Team functions reuse `private.shop_staff` from migration 021 (active owner or operations membership with a live AAL2 session). Every team write adds a row to `admin_audit_events`.

## Admin

`/admin/partners` (Workspace nav "Partner services"; owner and operations, MFA):
- **Partners:** create and edit, with a live checklist of what still blocks activation; "Active" is disabled until the checklist is clear, and commission is disabled for health categories. SQL refuses anything the form misses.
- **Offers:** partner, title, plain summary, age range in months, cities (`online` for anywhere), moment and its detail, price label, enquiry or https link, status. "Shown" says whether parents can currently see it, and why not.
- **Enquiries:** newest 200 with the shared fields only, to forward manually; mark sent or closed.
- **Monthly counts:** views, clicks and enquiries per partner per month (India time), last 12 months, for invoicing. These are exact counts of anonymous events, so small-number suppression does not apply: no family can be identified from them. Clicks are indicative and can be inflated by repeat clicking; invoice commissions and booking fees against bookings the partner confirms.

## Verification (this branch)

- `npm run check` (lint, typecheck, unit and server tests, including `tests/partner-services.test.ts`).
- `tests/sql/partner-services.sql` in `scripts/test-security-db.mjs`: gates for every writer, health fee rule, MFA, revisions, audit, visibility by status/age/city/contract dates, enquiry consent, ownership, privacy across families, fixed shared fields without the child's name, idempotency, duplicates, anonymous events and erasure.
- `scripts/test-family-plan-routes.mjs`: the real parent and admin routes against SQL, plus the export of enquiries and city.
- `scripts/verify-handbook-render.tsx`: offers render with full labels, terms and grievance routes; nothing renders when empty.

## Before activating the first partner

1. Fill the legal entity and grievance officer placeholders in `/privacy` and `/terms`, and have a lawyer review the new partner paragraphs. Decide whether the privacy notice change needs a new policy version.
2. Sign the partner contract (checklist below), collect evidence for police verification and insurance, and record it outside Kahiye (the app stores only the confirmations).
3. Apply migration 032 to production first, then deploy.
4. Add the partner as a draft, complete the checklist, activate, then add and activate one offer. Check it on a test family's Child page on phone and desktop.
5. Agree who forwards enquiries and how fast, until partner delivery is automated.

## Partner contract checklist (for a lawyer to turn into a template)

1. **Facilitator status.** Kahiye introduces families; it is not the provider, agent or employer of the partner's staff. The partner provides the service, sets its price, contracts directly with the parent and is solely responsible for the service, its staff and its outcomes.
2. **Indemnity.** The partner indemnifies Kahiye against claims arising from its services, staff, premises, data handling and breach of the agreement or law, including claims involving children. Kahiye's liability to the partner is capped.
3. **Partner's own terms and grievance contact.** The partner maintains public consumer terms (price, cancellation, refunds, safety) at an https link shown on every offer, and a named grievance contact who acknowledges complaints within 48 hours and resolves within a stated period, consistent with the Consumer Protection (E-Commerce) Rules, 2020 where they apply. The partner tells Kahiye of any change before it takes effect.
4. **Data protection (DPDP Act 2023).** The partner is an independent data fiduciary for enquiry data it receives. Purpose limitation: the data (parent's name, chosen phone or email, child's age band, city, and the parent's message) is used only to respond to that enquiry and deliver a service the parent books. No marketing, sale, sharing or profiling without the parent's own separate consent. Deletion when no longer needed for that purpose, and on the parent's request. Reasonable security safeguards. Breach notice to Kahiye within 24 hours, and cooperation with notices to the Data Protection Board and affected families. No attempt to obtain a child's data from Kahiye beyond these fields.
5. **Child-safety vetting.** Police verification for every person who will meet children, renewed on a stated cycle; background and reference checks; safeguarding training; a written child-protection policy. For minors: a two-adult rule or visible, interruptible sessions (open doors, observable rooms, a parent or guardian present or nearby for home visits); no private messaging or social-media contact with children; no photographs of children without the parent's written consent. Immediate notice to Kahiye of any allegation, investigation or incident.
6. **Professional insurance.** Current professional liability (and, for health services, professional indemnity) insurance at a stated minimum, with certificates provided on signing and each renewal.
7. **Medical ethics for health partners.** Fees to Kahiye are a flat listing fee or a per-booking administrative fee, never a payment per patient referred or a share of treatment fees, and never conditional on tests or treatment being recommended. Clinical decisions remain with the partner's registered practitioners; registrations (for example NMC or state medical council, lab accreditation) are kept current and evidenced.
8. **No advertising to children.** All communication is addressed to the parent. No marketing to children, no pressure or urgency claims, no claims of guaranteed outcomes (marks, admissions, talent, health), and no comparative claims about other providers in Kahiye. Kahiye approves the offer text and may edit or remove it.
9. **Termination for safety incidents.** Kahiye may suspend offers immediately, and terminate without notice, on any safety allegation, lapse in verification or insurance, data breach, or regulatory action; the partner must keep serving families already booked or arrange refunds. Ordinary termination on stated notice.
10. **Commission or fee and invoicing.** The fee model (listing, booking or commission, with health partners restricted as in 7), the rate, what counts as a booking, the partner's duty to report bookings from Kahiye enquiries and links (`ref=kahiye`), monthly invoicing by Kahiye with Kahiye's counts as a starting point, a dispute window, payment terms and audit rights.
11. **GST.** Parents pay partners directly; the partner invoices the parent and accounts for GST on its service. Kahiye invoices the partner for its fee and charges GST on that fee where applicable. Neither party collects money on the other's behalf.
12. **Service levels and complaint handling.** Response to enquiries within a stated time (for example one working day); the partner reports complaints received through Kahiye and their resolution; escalation path from the partner's grievance contact to Kahiye's grievance officer; Kahiye may share complaint outcomes with the parent.
13. **Brand and listing.** Licence for Kahiye to show the partner's name and the agreed offer text; no use of Kahiye's name or claims of endorsement beyond "listed on Kahiye".
14. **Records and audit.** The partner keeps evidence of verification, insurance, consent handling and deletion, and provides it on request.

## Open questions for the owner

- Whether `paediatrician` and `dietitian` should need police verification (currently yes, as one-to-one with children) or a registration check instead.
- Retention for enquiries: they are kept until the parent deletes the child or account. A fixed retention (for example 12 months after closing) needs a decision and a scheduled job.
- Whether parents should see their sent enquiries in the app (today: export only, and the confirmation screen).
- Whether the privacy notice change needs a new consent version under the DPDP notice rules.
- Partner email delivery: automate forwarding through Resend once a sender domain is configured.
