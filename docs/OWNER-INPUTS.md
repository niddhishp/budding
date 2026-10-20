# What Kahiye needs from you

The app is built so that each item below unlocks something already in the code. Prepare them in any order and send them together. Do not paste passwords or keys into chat: put secrets straight into Vercel (Settings → Environment Variables → Production) or the provider's dashboard, then tell me the item is done.

Status keys:
- **Launch**: needed before we invite the public.
- **Paid**: needed before checkout opens.
- **Grow**: unlocks a later feature.

---

## 1. Launch blockers (do these first)

### 1.1 Legal details on the privacy policy and terms (Launch)
The pages already name the operator as *Niddhish Puuzhakkal, sole proprietor of Light Seeker Films*. Until the rest is filled, they show "being finalised".

| Vercel variable | What to put | Notes |
|---|---|---|
| `NEXT_PUBLIC_LEGAL_ADDRESS` | Principal place of business from the GST certificate | One line, as printed on the GST registration |
| `NEXT_PUBLIC_GRIEVANCE_NAME` | The Grievance Officer's name | DPDP and IT Rules require a named person. It can be you for now. |
| `NEXT_PUBLIC_GRIEVANCE_EMAIL` | e.g. grievance@kahiye.app | Must be a real mailbox that you check. Acknowledge within 24 hours; resolve within 15 days. |
| `NEXT_PUBLIC_GRIEVANCE_PHONE` | Optional | Leave unset if you prefer email only |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | e.g. hello@kahiye.app | Must be a real mailbox |

**How to check:** Admin → Launch checks → "Legal details on privacy and terms" turns *configured* after the next deploy.

### 1.2 Sign-up and password emails (Launch)
Supabase's built-in mailer sends only a few emails an hour. At launch, new parents would not receive their confirmation link.

1. In Resend, add and verify the domain `kahiye.app`. Add the DNS records it shows (SPF, DKIM, and optionally DMARC) at your domain registrar.
2. In Supabase, go to Authentication → SMTP Settings → Enable custom SMTP and enter:
   - Host `smtp.resend.com`, port `465`
   - User `resend`
   - Password: a Resend API key
   - Sender `Kahiye <hello@kahiye.app>`
3. Raise the email rate limit in Authentication → Rate Limits (e.g. 100/hour).
4. Sign up with an inbox you own, and request a password reset. Confirm that both arrive and are not in spam.
5. Set `AUTH_SMTP_VERIFIED=true` in Vercel. This records that the check was done.

### 1.3 An owned test inbox and phone (Launch)
This is one Gmail address and one phone number that belong to the company, not your personal ones. I use them for end-to-end checks of email, WhatsApp and payments. They are never used for real family data.

### 1.4 Confirmations (Launch)
Reply yes/no or with changes:
- [ ] Early access is **free**, with **10 Ask turns a week**.
- [ ] The launch audience is **parents of children aged 3–8** (other ages still work, with less depth).
- [ ] The city list for local services, e.g. Mumbai, Pune, Bengaluru, Delhi NCR.

---

## 2. Paid plans (Paid)

### 2.1 Razorpay live mode
- Complete KYC for **Light Seeker Films** (PAN, GST, bank account, website = kahiye.app). Razorpay will check the privacy, terms, refund and contact pages, which is why 1.1 comes first.
- Create two plans: **Founding monthly ₹99** and **Founding yearly ₹999**. Send me the two plan IDs (they are not secret).
- In Vercel, set `RAZORPAY_KEY_ID` (starts `rzp_live_`), `RAZORPAY_KEY_SECRET`, `RAZORPAY_PLAN_MONTHLY`, `RAZORPAY_PLAN_YEARLY` and `RAZORPAY_WEBHOOK_SECRET`.
- Add the webhook `https://www.kahiye.app/api/billing/webhook` in Razorpay. I give you the event list when we open checkout.
- Leave `BILLING_LIVE_ENABLED` unset. I switch it on after a real ₹99 test payment and refund.

### 2.2 CA questions
- Add "online information / software services" to the GST activities if it is not already there.
- How commission income from partners should be invoiced. I recommend that parents pay partners directly and Kahiye invoices the partner for its fee, which avoids e-commerce TCS on the parent's payment.
- File a **trademark for "Kahiye"** (classes 9, 41, 42, 44 and 45). A search plus filing costs roughly ₹4,500 per class for a proprietor.
- **When to incorporate a Pvt Ltd.** My advice: before the first partner contract with money flowing, before paid scale, and in any case before fundraising. The app, domain and trademark can then be assigned to the company.

### 2.3 Lawyer review (one engagement)
Ask the lawyer to review:
- the privacy policy and terms (live at /privacy and /terms);
- the partner agreement template (`docs/PARTNER-SERVICES.md` lists the clauses);
- the sponsor (school/employer/clinic) agreement.

Specific questions to ask:
- DPDP rules for children's data and verifiable parental consent.
- Whether listing medical providers is allowed with a booking or listing fee rather than a per-referral commission.
- What the facilitator disclaimer can and cannot shift.

---

## 3. Safety and expertise (needed before the sensitive features go public)

### 3.1 Clinical reviewers
You need three people, each paid per review session:

| Role | Reviews | Why |
|---|---|---|
| Child psychologist (RCI-registered) | Handbook cards, guided programmes, Ask safety rules | Behaviour and emotional content |
| Paediatrician (MCI/NMC-registered) | Potty training, sleep, food, first period, health partner listings | Medical content |
| Safeguarding / child-protection specialist | Body talk, safety training, sex education, bullying | Abuse, consent and POCSO reporting |

Send each reviewer's name, registration number, and a one-line bio for the site. Until they sign off, cards say "Clinical and safeguarding review pending", and **first period, body talk and sex education stay behind a review gate**. They can be read in preview, but they are not promoted.

### 3.2 Expert roster (for consultations)
For each expert, send:
- name;
- qualification and registration number;
- languages;
- cities, or "online";
- fee per session;
- available hours;
- a photo you have the right to use;
- signed consent to be listed.

No expert is shown until their details are verified in Admin.

---

## 4. Partners (Grow)

All partner services are partnerships: the provider delivers the service and is contractually responsible for it. Kahiye introduces families and earns a fee. For each partner, collect:

- [ ] Legal name, GST, PAN, and the signatory's name
- [ ] Signed partner agreement (template clauses in `docs/PARTNER-SERVICES.md`)
- [ ] Licence or registration for the category:
  - labs: NABL accreditation
  - clinics: Clinical Establishments registration
  - doctors and dietitians: council registration
  - tutors and studios: business registration
- [ ] **Police verification for every adult who meets children**, and the partner's own child-safeguarding policy
- [ ] Professional indemnity or public liability insurance certificate
- [ ] Price list, cities and age range served
- [ ] Commission or fee terms. For medical partners: a flat listing or booking fee, never a percentage of treatment.
- [ ] A named contact for complaints, with a response time

**Categories in priority order:**
1. Diagnostic labs and checkup packages
2. Vaccination clinics and paediatricians
3. Dietitians (child diet plans)
4. Academic tuition (maths, physics, chemistry)
5. Skill studios (painting, dance, music, filmmaking, coding)
6. Children's day-out venues
7. Interest discovery for under-13s, and career and stream guidance with counsellors for teens

These come later: movie recommendations need no partner, because they are editorial. Validated assessments need a licensed psychometric provider.

---

## 5. Kahiye for Schools, Employers and Clinics (Grow)
The sponsor code system lets an organisation pay for its families' Plus access. For each pilot, send:
- organisation name and a contact person;
- the number of families;
- the start date and the duration (e.g. 3 months);
- the agreed price per family, or "free pilot";
- who receives the aggregate report. The report is family-level and anonymous, with groups under 5 hidden.

Aim for **one school, one employer and one paediatric clinic** as the first three pilots.

---

## 6. Films (Grow)
The Handbook already has a "See it play out" slot on every card. It appears as soon as a film is linked.

For Season 1, I suggest 8 microdramas of 60–120 seconds, one per high-search situation:
1. Potty training
2. Screen-off meltdown
3. Sibling fight
4. First day of school
5. "Where do babies come from?"
6. First period talk
7. Bullying disclosure
8. A good touch / bad touch moment

For each film, send:
- the **Vimeo or YouTube link** (unlisted is fine);
- the title;
- its length in minutes;
- **the Handbook card it belongs to** (I'll send you the list of card ids).

Also needed:
- signed releases for all actors;
- parental consent and the shoot-hour rules for child actors (Child and Adolescent Labour Act / state rules for child artists);
- music licences.

Each film should end on the words to say, then show Kahiye. The behavioural brief for each is in our strategy notes.

---

## 7. WhatsApp Ask with voice (Grow)
- A **dedicated phone number** for Kahiye that is not already on WhatsApp.
- Meta Business verification for Light Seeker Films (GST certificate plus a utility bill or bank statement).
- Twilio WhatsApp sender approval for that number, with display name "Kahiye".
- Choice of speech-to-text provider for Hindi and English voice notes. I recommend testing two on 20 real voice notes before choosing.
- Then set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` and `NEXT_PUBLIC_WHATSAPP_NUMBER` in Vercel. I turn on `WHATSAPP_ENABLED` after the end-to-end test.

---

## 8. Shop (Grow, already built)
- Amazon Associates approval for kahiye.app, plus Creators API credentials: `AMAZON_CREATORS_CLIENT_ID`, `AMAZON_CREATORS_CLIENT_SECRET`, `AMAZON_ASSOCIATE_TAG` and `AMAZON_CREATORS_VERSION`.
- Any finance partner (for savings goals): the signed agreement and the allowed destination URLs.

---

## 9. Mailboxes to create
- `hello@kahiye.app`: support
- `grievance@kahiye.app`: the Grievance Officer
- `partners@kahiye.app`: partner applications
- `experts@kahiye.app`: consultation alerts (`EXPERT_NOTIFY_EMAIL`)

Google Workspace or Zoho Mail on kahiye.app is fine. Forwarding to one inbox is fine at launch.

---

## Checklist to send back
- [ ] 1.1 Legal variables set in Vercel
- [ ] 1.2 Resend domain verified, Supabase SMTP set, test emails received, `AUTH_SMTP_VERIFIED=true`
- [ ] 1.3 Test inbox and phone
- [ ] 1.4 Confirmations
- [ ] 2.1 Razorpay KYC and plan IDs
- [ ] 2.2 CA answers
- [ ] 2.3 Lawyer engaged
- [ ] 3.1 Reviewers named
- [ ] 3.2 First experts
- [ ] 4 First partner packs
- [ ] 5 First pilot organisations
- [ ] 6 Season 1 film links
- [ ] 7 WhatsApp number and Meta verification
- [ ] 8 Amazon credentials
- [ ] 9 Mailboxes
