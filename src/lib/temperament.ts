import type { TemperamentProfile } from '@/types';

export type TraitKey = keyof TemperamentProfile;

// Three plain-language answers per trait, mapped to the 0–100 scale stored in the profile.
// Order matters: it defines the compact share-URL encoding below.
export const TRAIT_QUESTIONS: { key: TraitKey; question: string; options: [string, string, string] }[] = [
  { key: 'sensitivity', question: 'Noise, textures, a sharp tone of voice…', options: ['Barely notices', 'Sometimes bothered', 'Deeply affected'] },
  { key: 'emotionalIntensity', question: 'When upset, their reaction is…', options: ['Quiet, brief', 'Clear but manageable', 'Big and loud'] },
  { key: 'flexibility', question: 'Sudden change of plan…', options: ['Struggles a lot', 'Needs a warning', 'Rolls with it'] },
  { key: 'persistence', question: 'When something is hard, they…', options: ['Give up quickly', 'Try a few times', 'Keep at it'] },
  { key: 'sociability', question: 'With new people, they…', options: ['Hang back', 'Warm up slowly', 'Dive right in'] },
  { key: 'curiosity', question: 'New places and objects…', options: ['Prefer the familiar', 'Explore with you', 'Must touch everything'] },
];
export const OPTION_VALUES = [20, 50, 80] as const;

export type Answers = Partial<Record<TraitKey, number>>;

/** Encode answers as six digits (0/1/2) for share URLs, e.g. "210121". */
export function encodeAnswers(answers: Answers): string {
  return TRAIT_QUESTIONS.map((q) => {
    const idx = OPTION_VALUES.indexOf((answers[q.key] ?? 50) as (typeof OPTION_VALUES)[number]);
    return String(idx === -1 ? 1 : idx);
  }).join('');
}

export function decodeAnswers(code: string | null | undefined): TemperamentProfile | null {
  if (!code || !/^[012]{6}$/.test(code)) return null;
  return Object.fromEntries(
    TRAIT_QUESTIONS.map((q, i) => [q.key, OPTION_VALUES[Number(code[i])]]),
  ) as unknown as TemperamentProfile;
}

export interface Archetype {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  description: string;
  tips: string[];
}

const ARCHETYPES: Record<string, Archetype> = {
  storm: {
    id: 'storm', name: 'The Big-Hearted Storm', emoji: '🌩️',
    tagline: 'Feels everything. Shows everything.',
    description: 'Takes in the world at full volume and lets you know about it. The same depth that fuels meltdowns also fuels fierce love, empathy and loyalty.',
    tips: ['Lower your voice as theirs rises; they borrow your calm', 'Name the feeling before you fix the problem', 'Plan quiet recovery time after busy days'],
  },
  noticer: {
    id: 'noticer', name: 'The Quiet Noticer', emoji: '🌙',
    tagline: 'Sees what others miss.',
    description: 'Deeply affected but rarely loud about it, so their big feelings can go unseen. They process inside first and talk later.',
    tips: ['Ask once, then wait; silence is them thinking', 'Side-by-side talks (car, walks) beat face-to-face', 'Watch for the quiet signs: withdrawal, stomach aches'],
  },
  firecracker: {
    id: 'firecracker', name: 'The Bold Firecracker', emoji: '🎆',
    tagline: 'Fast to ignite, fast to forgive.',
    description: 'Big, energetic reactions that blow over quickly. Not easily hurt, but quick to protest when things don\'t go their way.',
    tips: ['Give movement outlets before asking for focus', 'Keep instructions to one step at a time', 'Move on quickly after a blow-up; they already have'],
  },
  planner: {
    id: 'planner', name: 'The Steady Planner', emoji: '🗺️',
    tagline: 'Thrives on knowing what\'s next.',
    description: 'Feels safe when the day is predictable. Sudden changes, not the tasks themselves, are what trigger resistance.',
    tips: ['Give countdowns before every transition', 'Use a simple picture or written routine', 'Offer a choice inside the change: "shoes first or bag first?"'],
  },
  explorer: {
    id: 'explorer', name: 'The Determined Explorer', emoji: '🧭',
    tagline: 'Curious, and won\'t give up.',
    description: 'Wants to touch, test and figure things out, and keeps going long after others stop. That persistence can look like stubbornness.',
    tips: ['Say yes to the exploring, set limits on the where and when', 'Turn "no" into a puzzle: "how could we do this safely?"', 'Praise effort and strategy, not just results'],
  },
  spark: {
    id: 'spark', name: 'The Social Spark', emoji: '✨',
    tagline: 'People are their fuel.',
    description: 'Lights up around others and finds being alone harder. Friendships and approval matter a great deal, sometimes too much.',
    tips: ['Plan connection before chores: 5 minutes of play first', 'Teach that "no" to a friend is still kind', 'Use family time as a reward, not screens'],
  },
  breeze: {
    id: 'breeze', name: 'The Easy Breeze', emoji: '🍃',
    tagline: 'Goes with the flow.',
    description: 'Adaptable and even-tempered. Because they rarely complain, their needs can get overlooked in a busy family.',
    tips: ['Check in on purpose; they won\'t always ask', 'Protect their one-on-one time with you', 'Notice and name their quiet feelings too'],
  },
  builder: {
    id: 'builder', name: 'The Balanced Builder', emoji: '🧱',
    tagline: 'A bit of everything, still taking shape.',
    description: 'No single trait dominates, so the situation shapes them more than temperament does. Consistency from you is their foundation.',
    tips: ['Keep routines and rules the same across caregivers', 'Watch which situations bring out the big reactions', 'Retake this quiz in a few months; children change'],
  },
};

const high = (v: number) => v >= 65;
const low = (v: number) => v <= 35;

export function archetypeFor(t: TemperamentProfile): Archetype {
  if (high(t.sensitivity) && high(t.emotionalIntensity)) return ARCHETYPES.storm;
  if (high(t.sensitivity) && !high(t.emotionalIntensity)) return ARCHETYPES.noticer;
  if (high(t.emotionalIntensity)) return ARCHETYPES.firecracker;
  if (low(t.flexibility)) return ARCHETYPES.planner;
  if (high(t.curiosity) && high(t.persistence)) return ARCHETYPES.explorer;
  if (high(t.sociability)) return ARCHETYPES.spark;
  if (high(t.flexibility) && !high(t.emotionalIntensity)) return ARCHETYPES.breeze;
  return ARCHETYPES.builder;
}

/** Quiz answers carried into onboarding after sign-up. */
export const QUIZ_STORAGE_KEY = 'budding.quiz';
export function saveQuizResult(name: string, answers: Answers) {
  try { localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify({ name, answers })); } catch { /* storage unavailable */ }
}
export function loadQuizResult(): { name: string; answers: Answers } | null {
  try {
    const raw = localStorage.getItem(QUIZ_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
export function clearQuizResult() {
  try { localStorage.removeItem(QUIZ_STORAGE_KEY); } catch { /* storage unavailable */ }
}
