import { cardsForChild } from '@/lib/handbook';
import type { HandbookCard, Track } from '@/data/handbook';
import type { Child, HandbookFallback } from '@/types';

/*
 * When a custom Ask answer cannot be checked, the parent is offered the closest age-matched Handbook card
 * instead of a dead end. Cards are static editorial content written for that age; nothing is generated.
 * Matching is deterministic keyword overlap, never a model call.
 */

export const FALLBACK_MESSAGE = 'We couldn\'t check a custom answer this time. Here\'s a starting point from your Handbook.';

const TRACK_WORDS: Record<Track, RegExp> = {
  feelings: /\b(angry|anger|cry|cries|crying|tantrum|meltdown|upset|scared|afraid|fear|worr(y|ied|ies)|sad|frustrat\w*|hits?|hitting|bit(e|es|ing)|scream\w*|yell\w*|shout\w*|can'?t|gives? up|feelings?)\b/,
  family: /\b(sister|brother|sibling|grand(ma|pa|parents?|mother|father)|dadi|nani|partner|husband|wife|bed ?time|goodnight|shouted|fair|rules?)\b/,
  school: /\b(school|homework|teacher|class|test|exam|marks|grades?|read(ing)?|study|studies|nursery|drop[- ]?off|goodbye)\b/,
  digital: /\b(screens?|phone|tablet|ipad|tv|video|youtube|game|gaming|online|app|ai)\b/,
  friends: /\b(friends?|left out|bully|bullying|share|sharing|turns?|play ?date|peer)\b/,
  health: /\b(sleep|tired|eat|eating|food|brush\w*|teeth|doctor|sick|pain|check-?up|rest)\b/,
  money: /\b(money|buy|shop|shopping|pocket|save|saving|spend|price|in-game)\b/,
  independence: /\b(chores?|choice|choose|alone|dress(ing)?|by (him|her)self|independen\w*|job|task)\b/,
  // Body and safety cards are only offered when the moment is clearly about them.
  body: /\b(private parts|body parts|privacy|hug|kiss|consent|babies come from|puberty)\b/,
  safety: /\b(stranger|safe adult|secret|lost|road|street|photos? online)\b/,
};
const CAUTIOUS: Track[] = ['body', 'safety'];
const STOP = new Set(['about', 'after', 'again', 'always', 'because', 'before', 'being', 'cannot', 'could', 'doesn', 'every', 'having', 'their', 'there', 'these', 'thing', 'things', 'today', 'when', 'where', 'which', 'while', 'with', 'would', 'what', 'from', 'that', 'this', 'they', 'them', 'have', 'will', 'just', 'like', 'into', 'your', 'very', 'does', 'then', 'than', 'were', 'been', 'only', 'even', 'over', 'some', 'gets', 'keeps']);

function words(text: string) {
  return new Set(text.toLowerCase().split(/[^a-z']+/).filter((w) => w.length >= 4 && !STOP.has(w)));
}

function score(card: HandbookCard, scenario: string, scenarioWords: Set<string>) {
  const text = `${card.title} ${card.why} ${card.words} ${card.activity} ${card.resistance}`.toLowerCase();
  let s = TRACK_WORDS[card.track].test(scenario) ? 3 : 0;
  for (const w of scenarioWords) if (text.includes(w)) s += 1;
  return s;
}

/** The closest age-matched Handbook card for this moment, or null when the profile has no matching cards. */
export function fallbackCard(child: Pick<Child, 'dateOfBirth' | 'dueDate'>, scenario: string, today?: string): HandbookFallback | null {
  const cards = cardsForChild(child, today);
  if (!cards.length) return null;
  const lower = scenario.toLowerCase();
  const scenarioWords = words(scenario);
  const ranked = cards
    .map((card, index) => ({ card, index, s: score(card, lower, scenarioWords) }))
    .filter(({ card, s }) => !CAUTIOUS.includes(card.track) || s >= 3)
    .sort((a, b) => b.s - a.s || a.index - b.index);
  // With no overlap at all, a feelings card is the most generally useful starting point.
  const best = ranked[0]?.s ? ranked[0].card : (cards.find((c) => c.track === 'feelings') ?? ranked[0]?.card);
  if (!best) return null;
  return { id: best.id, title: best.title, words: best.words, activity: best.activity, avoid: best.avoid };
}
