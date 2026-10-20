import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PARTNER_CONSENT_VERSION, enquirySchema, momentMatches, offerLink, offerSchema, partnerGateProblems, partnerLabel, placementOffers, sharedPreview,
  type PartnerInput, type PartnerOffer,
} from '../src/lib/partner-services';

const offer = (over: Partial<PartnerOffer>): PartnerOffer => ({
  id: crypto.randomUUID(), title: 'Offer', summary: 'A plain summary.', category: 'tuition', moment: 'always', trigger_value: null, price_label: '', cta: 'enquiry', url: null,
  online: false, provider: 'Provider', terms_url: 'https://provider.example/terms', grievance_contact: 'help@provider.example', fee_model: 'listing_fee', ...over,
});
const ctx = { month: 6, interests: ['music'], vaccinationDue: false, checkupDue: false };

test('moments: an offer appears only when the family moment calls for it', () => {
  assert.equal(momentMatches({ moment: 'always', trigger_value: null }, ctx), true);
  assert.equal(momentMatches({ moment: 'vaccination_due', trigger_value: null }, ctx), false);
  assert.equal(momentMatches({ moment: 'vaccination_due', trigger_value: null }, { ...ctx, vaccinationDue: true }), true);
  assert.equal(momentMatches({ moment: 'checkup_due', trigger_value: null }, { ...ctx, checkupDue: true }), true);
  assert.equal(momentMatches({ moment: 'interest', trigger_value: 'music' }, ctx), true);
  assert.equal(momentMatches({ moment: 'interest', trigger_value: 'art' }, ctx), false);
  assert.equal(momentMatches({ moment: 'exam_season', trigger_value: null }, ctx), false, 'Default exam months are February and March');
  assert.equal(momentMatches({ moment: 'exam_season', trigger_value: null }, { ...ctx, month: 3 }), true);
  assert.equal(momentMatches({ moment: 'exam_season', trigger_value: '6,7' }, ctx), true);
});

test('placements: categories, limits, and Today only for a due vaccination or check-up', () => {
  const offers = [
    offer({ category: 'tuition' }), offer({ category: 'skills', moment: 'interest', trigger_value: 'music' }), offer({ category: 'health_lab', moment: 'vaccination_due' }),
    offer({ category: 'paediatrician' }), offer({ category: 'venue' }), offer({ category: 'tuition', moment: 'handbook_track', trigger_value: 'money' }),
  ];
  assert.equal(placementOffers(offers, 'child').length, 3, 'Child rail shows at most three');
  assert.deepEqual(placementOffers(offers, 'today').map(o => o.category), ['health_lab'], 'Today: one, and only a moment-triggered health offer');
  assert.equal(placementOffers([offers[3]], 'today').length, 0, 'An always-on offer never reaches Today');
  assert.deepEqual(placementOffers(offers, 'health').map(o => o.category), ['health_lab', 'paediatrician']);
  assert.deepEqual(placementOffers(offers, 'interests').map(o => o.category), ['skills']);
  assert.equal(placementOffers(offers, 'learning').length, 1, 'Tuition for another Handbook topic stays out of Learning');
  assert.equal(placementOffers([], 'child').length, 0);
});

test('link-outs carry only a referral marker', () => {
  const link = new URL(offerLink('https://partner.example/class?level=2'));
  assert.equal(link.searchParams.get('ref'), 'kahiye');
  assert.equal(link.searchParams.get('level'), '2');
  assert.equal([...link.searchParams.keys()].length, 2);
  assert.throws(() => offerLink('http://partner.example'));
});

test('every offer label names the provider, the fee and their terms', () => {
  assert.equal(partnerLabel('Asha Tutors'), 'Partner offer · Kahiye may earn a fee · Asha Tutors provides this service under its own terms');
});

test('gate problems mirror the SQL rules', () => {
  const ready: PartnerInput = { name: 'Tutors', legal_name: 'Tutors Pvt Ltd', category: 'tuition', website: '', terms_url: 'https://t.example/terms', contact_email: 'a@t.example', grievance_contact: 'help@t.example', contract_signed_on: '2026-10-01', contract_expires_on: '', fee_model: 'commission', fee_note: '', police_verification_confirmed: true, insurance_confirmed: true, status: 'active' };
  assert.deepEqual(partnerGateProblems(ready, '2026-10-21'), []);
  assert.equal(partnerGateProblems({ ...ready, police_verification_confirmed: false }, '2026-10-21').length, 1);
  assert.equal(partnerGateProblems({ ...ready, category: 'venue', police_verification_confirmed: false, insurance_confirmed: false }, '2026-10-21').length, 0, 'Venues need no vetting flags');
  assert.match(partnerGateProblems({ ...ready, category: 'health_lab' }, '2026-10-21').join(), /never a per-patient commission/);
  assert.match(partnerGateProblems({ ...ready, contract_signed_on: '2026-11-01' }, '2026-10-21').join(), /not in force/);
  assert.match(partnerGateProblems({ ...ready, contract_expires_on: '2026-10-20' }, '2026-10-21').join(), /expired/);
});

test('offer schema requires valid moment details and https links', () => {
  const base = { partner_id: crypto.randomUUID(), title: 'Music class', summary: 'Small-group rhythm sessions.', category: 'skills', min_months: 48, max_months: 96, cities: ['Pune'], moment: 'interest', trigger_value: 'music', price_label: '', cta: 'enquiry', url: '', status: 'draft' };
  assert(offerSchema.safeParse(base).success);
  assert(!offerSchema.safeParse({ ...base, trigger_value: 'astrology' }).success);
  assert(!offerSchema.safeParse({ ...base, cta: 'link' }).success);
  assert(!offerSchema.safeParse({ ...base, cta: 'link', url: 'http://insecure.example' }).success);
  assert(!offerSchema.safeParse({ ...base, min_months: 96 }).success);
  assert(!offerSchema.safeParse({ ...base, moment: 'always' }).success, 'An always offer carries no trigger value');
});

test('enquiries need explicit consent and show exactly what is shared', () => {
  const input = { receipt: crypto.randomUUID(), offerId: crypto.randomUUID(), childId: crypto.randomUUID(), parentName: 'Asha', contactMethod: 'phone', contact: '+91 98765 43210', message: '', consent: true, consentVersion: PARTNER_CONSENT_VERSION };
  assert(enquirySchema.safeParse(input).success);
  assert(!enquirySchema.safeParse({ ...input, consent: false }).success);
  assert(!enquirySchema.safeParse({ ...input, consentVersion: 'older' }).success);
  assert(!enquirySchema.safeParse({ ...input, contact: 'call me' }).success);
  assert(!enquirySchema.safeParse({ ...input, childName: 'Meera' }).success, 'No extra fields');
  const preview = sharedPreview({ parentName: 'Asha', contactMethod: 'email', contact: 'asha@example.com', message: '' }, { ageBand: '6–8 years', city: null });
  assert.deepEqual(preview.map(([k]) => k), ['Your name', 'Your email', 'Your child’s age band']);
});
