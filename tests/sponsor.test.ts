import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SPONSOR_CODE_ALPHABET, formatSponsorCode, generateSponsorCode, isValidSponsorCode, normalizeSponsorCode, sponsorDate } from '../src/lib/sponsor';

test('the code alphabet has no characters that are easy to misread', () => {
  assert.equal(SPONSOR_CODE_ALPHABET.length, 31);
  for (const ambiguous of ['0', '1', 'I', 'L', 'O']) assert(!SPONSOR_CODE_ALPHABET.includes(ambiguous), ambiguous);
  assert.equal(new Set(SPONSOR_CODE_ALPHABET).size, 31);
  // The database check constraint and the issuing alphabet must agree.
  const sql = readFileSync('supabase/033_sponsored_access.sql', 'utf8');
  assert(sql.includes("'^[2-9ABCDEFGHJKMNPQRSTUVWXYZ]{10}$'"));
  assert.equal('23456789ABCDEFGHJKMNPQRSTUVWXYZ', SPONSOR_CODE_ALPHABET);
});

test('generated codes are ten valid characters and do not repeat', () => {
  const seen = new Set<string>();
  for (let i = 0; i < 2000; i++) {
    const code = generateSponsorCode();
    assert.match(code, /^[2-9ABCDEFGHJKMNPQRSTUVWXYZ]{10}$/);
    assert(isValidSponsorCode(code));
    seen.add(code);
  }
  assert.equal(seen.size, 2000);
});

test('generation discards biased bytes instead of wrapping them', () => {
  // 248 and above would favour the first eight symbols; they must be skipped.
  let call = 0;
  const source = (bytes: Uint8Array) => { bytes.fill(call++ === 0 ? 255 : 0); return bytes; };
  assert.equal(generateSponsorCode(source), '2222222222');
  assert(call >= 2, 'A second batch was drawn after rejecting every byte');
  // 247 is the largest accepted byte (247 % 31 = 30, the last symbol).
  assert.equal(generateSponsorCode(bytes => bytes.fill(247)), 'ZZZZZZZZZZ');
});

test('what a parent types is normalised before checking', () => {
  assert.equal(normalizeSponsorCode(' abcde-23456 '), 'ABCDE23456');
  assert(isValidSponsorCode('abcde 23456'));
  assert(isValidSponsorCode('ABCDE-23456'));
  assert(!isValidSponsorCode('ABCDE-2345'), 'too short');
  assert(!isValidSponsorCode('ABCDE-234560'), 'too long');
  assert(!isValidSponsorCode('ABCDO-23456'), 'O is not issued');
  assert(!isValidSponsorCode('ABCD1-23456'), '1 is not issued');
  assert(!isValidSponsorCode(''), 'empty');
  assert(!isValidSponsorCode('ABCDE;23456'), 'punctuation');
  assert.equal(normalizeSponsorCode('x'.repeat(500)).length, 64, 'input is bounded');
});

test('codes are printed in two groups of five', () => {
  assert.equal(formatSponsorCode('abcde23456'), 'ABCDE-23456');
  assert.equal(formatSponsorCode('ABCDE-23456'), 'ABCDE-23456');
  assert.equal(formatSponsorCode('ABC'), 'ABC');
});

test('the access date shown is the sponsor’s last day, India time', () => {
  // Access runs until the midnight after 31 March 2027 in India (18:30 UTC on 31 March).
  assert.equal(sponsorDate('2027-03-31T18:30:00.000Z'), '31 March 2027');
});
