// Sponsored access codes, shared by the team workspace (issuing), the redeem route and the parent UI.
// The database enforces the same shape: supabase/033_sponsored_access.sql.

/** 31 symbols: digits 2-9 and capitals without I, L or O, so a code survives being read aloud or printed. */
export const SPONSOR_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const SPONSOR_CODE_LENGTH = 10;
const CODE = /^[2-9ABCDEFGHJKMNPQRSTUVWXYZ]{10}$/;

export const ORGANISATION_KINDS = {
  school: 'School',
  employer: 'Employer',
  clinic: 'Clinic',
  community: 'Community partner',
  diaspora_community: 'Kahiye Abroad (diaspora community)',
} as const;
export type OrganisationKind = keyof typeof ORGANISATION_KINDS;
export const ORGANISATION_STATUSES = ['draft', 'active', 'ended'] as const;

type RandomSource = (bytes: Uint8Array) => Uint8Array;
const secureRandom: RandomSource = bytes => globalThis.crypto.getRandomValues(bytes);

/** A new code from a cryptographic source, without modulo bias (about 49 bits of entropy). */
export function generateSponsorCode(random: RandomSource = secureRandom): string {
  const limit = 256 - (256 % SPONSOR_CODE_ALPHABET.length); // 248: bytes at or above are discarded
  let code = '';
  while (code.length < SPONSOR_CODE_LENGTH) {
    for (const byte of random(new Uint8Array(16))) {
      if (byte < limit && code.length < SPONSOR_CODE_LENGTH) code += SPONSOR_CODE_ALPHABET[byte % SPONSOR_CODE_ALPHABET.length];
    }
  }
  return code;
}

/** What a parent typed, as the database stores it: upper case, without spaces or hyphens. */
export function normalizeSponsorCode(input: string): string {
  return input.slice(0, 64).replace(/[\s-]/g, '').toUpperCase();
}

export function isValidSponsorCode(input: string): boolean {
  return CODE.test(normalizeSponsorCode(input));
}

/** Printed and shared as two groups of five: "ABCDE-23456". */
export function formatSponsorCode(code: string): string {
  const c = normalizeSponsorCode(code);
  return c.length === SPONSOR_CODE_LENGTH ? `${c.slice(0, 5)}-${c.slice(5)}` : c;
}

export type RedeemStatus = 'redeemed' | 'other_sponsor' | 'invalid' | 'inactive' | 'expired' | 'full' | 'too_many_attempts';

export const REDEEM_MESSAGES: Record<Exclude<RedeemStatus, 'redeemed' | 'other_sponsor'>, string> = {
  invalid: 'We could not find that code. Check it with the organisation that gave it to you.',
  inactive: 'This code is not active yet, or has been switched off. Please check with the organisation that gave it to you.',
  expired: 'This code has expired. Please ask the organisation that gave it to you for a current one.',
  full: 'All the places for this code have been taken. Please ask the organisation that gave it to you.',
  too_many_attempts: 'Too many codes were tried. Please wait an hour and try again.',
};

export function sponsorDate(iso: string): string {
  // Access runs to the end of the sponsor's last day in India; show that day, not the next midnight.
  return new Date(new Date(iso).getTime() - 1).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
}
