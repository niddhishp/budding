import { interestAreas } from '@/data/interest-exploration';
import { interestActivities } from '@/data/interest-activities';
import { ageMonths, ageDays, todayDate } from './family-care';
import { healthUpcoming, interestBand, type HealthEntry, type InterestsBook } from './profile-notebook';

export function dailyInterest(birth: string | null, interests: InterestsBook, date = todayDate(), offset = 0) {
  if (!birth || birth > date || !interests.selected.length) return null;
  const band = interestBand(ageMonths(birth, date) / 12);
  // Canonical order makes revisits stable even if selections were clicked in a different order.
  const areas = interestAreas.filter(a => interests.selected.includes(a.id));
  if (!areas.length) return null;
  const day = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86400000);
  const position = day + offset;
  const area = areas[position % areas.length];
  const alternatives = interestActivities[area.id][band === 'baby' || band === 'preschool' ? 'young' : 'older'];
  const options = [area.ideas[band], ...alternatives];
  const text = options[Math.floor(position / areas.length) % options.length];
  return { id: `${date}-${band}-${area.id}-${options.indexOf(text)}`, area: area.label, text, band, date };
}

export function dailyHealth(entries: HealthEntry[], date = todayDate()) {
  return {
    reminders: healthUpcoming(entries, date).map(e => {
      const days = ageDays(date, e.due);
      return { ...e, days, label: days < 0 ? 'Planned date passed' : days === 0 ? 'Planned for today' : days === 1 ? 'Tomorrow' : `In ${days} days` };
    }).filter(e => e.days <= 7),
    ongoing: entries.filter(e => !e.archived && e.kind === 'medication' && e.status === 'ongoing' && (!e.date || e.date <= date)),
  };
}
