import test from 'node:test';
import assert from 'node:assert/strict';
import { bmiBandFromZ, childBMI, bmiGuidance } from '../src/lib/child-bmi';
import { DEFAULT_CARE, type GrowthEntry } from '../src/lib/family-care';
import { sunSign, horoscopeLine } from '../src/lib/horoscope';

test('BMI interpretations use unrounded z values at clinical percentile boundaries', () => {
  assert.equal(bmiBandFromZ(-1.644853628), 'below');
  assert.equal(bmiBandFromZ(-1.644853627), 'healthy');
  assert.equal(bmiBandFromZ(1.036433388), 'healthy');
  assert.equal(bmiBandFromZ(1.036433389), 'above');
  assert.equal(bmiBandFromZ(1.644853626), 'above');
  assert.equal(bmiBandFromZ(1.644853627), 'review');
  for (const z of [-3.01, 4, NaN, Infinity]) assert.equal(bmiBandFromZ(z), 'review');
});
test('BMI interpretation requires a complete supported reference and never declares overall health', () => {
  const entry: GrowthEntry = { id:'a',child_id:'b',revision:1,measured_on:'2026-10-18',length_cm:144.78,weight_kg:43,head_cm:null,method:'standing',archived:false,note:'' };
  assert.equal(childBMI(entry, '2015-09-01', DEFAULT_CARE).guidance, undefined);
  assert.equal(childBMI(entry, '2015-09-01', { ...DEFAULT_CARE, reference:'girls', preterm:true }).guidance, undefined);
  assert.equal(childBMI(entry, '2025-09-01', { ...DEFAULT_CARE, reference:'girls' }).guidance, undefined);
  assert.equal(childBMI(entry, '2015-09-01', { ...DEFAULT_CARE, reference:'girls' }).guidance, bmiGuidance.healthy);
  assert.equal(childBMI({ ...entry, weight_kg:100 }, '2015-09-01', { ...DEFAULT_CARE, reference:'girls' }).guidance, bmiGuidance.review);
  assert.match(bmiGuidance.healthy.text, /does not establish overall health/);
});
test('date-based sun signs handle year boundaries, leap days and unavailable birth dates', () => {
  const dates = [['01-19','Capricorn'],['01-20','Aquarius'],['02-19','Pisces'],['03-21','Aries'],['04-20','Taurus'],['05-21','Gemini'],['06-21','Cancer'],['07-23','Leo'],['08-23','Virgo'],['09-23','Libra'],['10-23','Scorpio'],['11-22','Sagittarius'],['12-22','Capricorn'],['12-31','Capricorn']];
  for (const [date, sign] of dates) assert.equal(sunSign(`2000-${date}`), sign);
  assert.equal(sunSign('2024-02-29'), 'Pisces');
  for (const date of [null,'2023-02-29','2027-01-01','bad-date']) assert.equal(sunSign(date,'2026-10-18'),null);
});
test('horoscope is one editorial line, stable today and changes on the next day', () => {
  const line = horoscopeLine('Virgo','2026-10-18');
  assert.equal(line, horoscopeLine('Virgo','2026-10-18'));
  assert.notEqual(line, horoscopeLine('Virgo','2026-10-19'));
  assert(!line.includes('\n'));
});
