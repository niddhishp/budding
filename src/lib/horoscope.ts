import { todayDate } from './family-care';

// Conventional Western calendar ranges, not a birth-chart calculation.
const signs = [
  [120, 'Capricorn'], [219, 'Aquarius'], [321, 'Pisces'], [420, 'Aries'],
  [521, 'Taurus'], [621, 'Gemini'], [723, 'Cancer'], [823, 'Leo'],
  [923, 'Virgo'], [1023, 'Libra'], [1122, 'Scorpio'], [1222, 'Sagittarius'], [1232, 'Capricorn'],
] as const;
export function sunSign(birth: string | null, today = todayDate()) {
  if (!birth || !/^\d{4}-\d{2}-\d{2}$/.test(birth) || birth > today) return null;
  const parsed = new Date(birth + 'T00:00:00Z');
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== birth) return null;
  const day = Number(birth.slice(5, 7)) * 100 + Number(birth.slice(8));
  return signs.find(([limit]) => day < limit)?.[1] ?? null;
}
const lines = [
  'Leave a little room for wonder: ask a question neither of you knows the answer to.',
  'A small shared adventure can begin with letting your child choose the next step.',
  'Make room for an unfinished idea; curiosity does not need a perfect result.',
  'Let a quiet moment count as connection today.',
  'Try seeing one familiar thing through your child’s eyes.',
  'A playful detour might be the part of the day you remember together.',
  'Offer a little encouragement, then leave space for their own way of doing things.',
  'There is room in today for a fresh start and a gentler pace.',
  'Invite a story, a question or a laugh; let your child choose which.',
  'Notice one small thing you enjoyed together and say it out loud.',
  'Let imagination borrow a few minutes from the everyday routine.',
  'Make a little space for something you both enjoy, with no score to keep.',
] as const;
export function horoscopeLine(sign: string, date = todayDate()) {
  const offset = [...sign].reduce((n, c) => n + c.charCodeAt(0), 0);
  return lines[(Math.floor(Date.parse(date + 'T00:00:00Z') / 86400000) + offset) % lines.length];
}
