import type { AgeInfo } from '@/types';

/** Seven overlapping stage bands (no false age precision): every agent output is conditioned on one. */
export type StageBand = 'pregnancy' | 'infant' | 'toddler' | 'preschool' | 'middle' | 'early_teen' | 'late_teen';

interface StageDoctrine {
  label: string;
  engine: string;
  typical: string;
  posture: string;
  scriptStyle: string;
}

export const STAGES: Record<StageBand, StageDoctrine> = {
  pregnancy: {
    label: 'Pregnancy',
    engine: 'preparation, bonding, the parent\'s own wellbeing and the couple/family system',
    typical: 'anxiety, information overload, family disagreements about how to raise the baby, sleep and body changes',
    posture: 'calm preparation; debunk myths gently; protect the parent\'s mental health; any medical question goes to their doctor',
    scriptStyle: 'scripts are for conversations between adults (partner, in-laws, doctor)',
  },
  infant: {
    label: 'Baby (0–12 months)',
    engine: 'attachment and serve-and-return; crying is communication, not manipulation',
    typical: 'crying, sleep, feeding, separation, parental exhaustion',
    posture: 'responsive caregiving; no sleep-shaming of any approach; red flags go to the paediatrician; parent rest is part of the plan',
    scriptStyle: 'words to the baby are soothing narration ("I\'m here. You\'re safe."); most guidance is what the adult does',
  },
  toddler: {
    label: 'Toddler (1–3 years)',
    engine: 'autonomy and a language explosion with little impulse control yet',
    typical: 'tantrums, hitting and biting, "no", transitions, toilet learning, sleep resistance',
    posture: 'name the feeling + calm firm limit; prevention (sleep, food, warnings); safety first during meltdowns; time-in over isolation',
    scriptStyle: 'under 6 words per sentence; one idea at a time; say it, then act',
  },
  preschool: {
    label: 'Little one (3–6 years)',
    engine: 'play, imagination and the roots of self-regulation',
    typical: 'fears, sibling rivalry, first lies, transitions, school starting, defiance tests',
    posture: 'co-regulation, routines, playful problem-solving, simple choices, repair after conflict',
    scriptStyle: 'short sentences; playful framing works; give two acceptable choices',
  },
  middle: {
    label: 'School years (6–12 years)',
    engine: 'competence, executive function and the peer world',
    typical: 'homework battles, screens and first devices, friendships and exclusion, comparison, chores, lying to avoid trouble, worry',
    posture: 'collaborative problem-solving; involve the child in the plan; process praise; build habits; private correction, never public shaming',
    scriptStyle: 'respectful, direct, a question that invites their view; skip the lecture',
  },
  early_teen: {
    label: 'Early teen (12–15 years)',
    engine: 'puberty, identity and heightened reward and peer sensitivity',
    typical: 'secrecy, mood swings, risk-taking, body image, social media, exam pressure, pulling away from parents',
    posture: 'connection before correction; autonomy-respecting limits; side-by-side talks; curiosity without verdict; watch function (sleep, mood, school) not just behaviour',
    scriptStyle: 'brief, non-judgemental, leave the door open; one sentence then listen',
  },
  late_teen: {
    label: 'Late teen (15–18 years)',
    engine: 'autonomy consolidation and launch into adulthood',
    typical: 'board exams, JEE/NEET pressure, relationships, career anxiety, independence conflicts',
    posture: 'coach stance; negotiate rather than decree; decouple love from marks; high vigilance for hopelessness during exam and results periods',
    scriptStyle: 'adult-to-almost-adult; acknowledge their view first; ask what support they want',
  },
};

export function stageBandFor(age: AgeInfo): StageBand {
  if (age.stage === 'pregnancy') return 'pregnancy';
  const months = age.years * 12 + age.months;
  if (months < 12) return 'infant';
  if (age.years < 3) return 'toddler';
  if (age.years < 6) return 'preschool';
  if (age.years < 12) return 'middle';
  if (age.years < 15) return 'early_teen';
  return 'late_teen';
}
