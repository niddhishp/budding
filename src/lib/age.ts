import type { AgeInfo, DevelopmentalStage } from '@/types';

const DAY_MS = 86_400_000;
const PREGNANCY_DAYS = 280;

function parseDate(iso: string): Date {
  // Date-only strings parse as UTC; pin to local midnight so ages don't shift by a day.
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function stageForYears(years: number): DevelopmentalStage {
  if (years < 3) return 'infancy';
  if (years < 7) return 'early-childhood';
  if (years < 13) return 'middle-childhood';
  return 'teenage';
}

/** Compute age and developmental stage from a date of birth or, before birth, a due date. */
export function computeAge(dob: string | null, dueDate: string | null, now = new Date()): AgeInfo {
  if (!dob || parseDate(dob) > now) {
    const due = dueDate ? parseDate(dueDate) : dob ? parseDate(dob) : now;
    const daysUntilDue = Math.max(0, Math.round((due.getTime() - now.getTime()) / DAY_MS));
    const week = Math.min(42, Math.max(1, Math.floor((PREGNANCY_DAYS - daysUntilDue) / 7)));
    return { years: 0, months: 0, days: 0, stage: 'pregnancy', pregnancyWeek: week, label: `Week ${week}` };
  }

  const birth = parseDate(dob);
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();
  if (days < 0) {
    months -= 1;
    days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const totalMonths = years * 12 + months;
  const label =
    totalMonths < 1 ? `${days} days` :
    totalMonths < 24 ? `${totalMonths} months` :
    months === 0 ? `${years}y` : `${years}y ${months}m`;

  return { years, months, days, stage: stageForYears(years), label };
}
