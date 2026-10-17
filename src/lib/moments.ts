import type { Child, TemperamentProfile } from '@/types';
import { OPTION_VALUES, QUESTION_BANKS, TRAIT_QUESTIONS, intakeBandForAge, type Answers, type IntakeBand, type TraitKey } from './temperament';

export const MOMENT_KEYS = ['flexibility', 'emotionalIntensity', 'sociability', 'persistence'] as const;
const TITLES = ['A change of plan', 'A bumpy moment', 'Someone new', 'One more try'];
const SCENES: Record<IntakeBand, string[]> = {
  infant: ['You are visiting family and the usual routine shifts.', 'Something feels uncomfortable and your baby lets you know.', 'A visitor comes over to say hello.', 'A favourite toy is just beyond their reach. You are close by.'],
  toddler: ['It is time to leave the park. One last slide?', 'Their carefully built tower tumbles down.', 'You arrive at a playdate with someone new.', 'A puzzle piece will not quite fit.'],
  preschool: ['Rain arrives just as you are heading to the playground.', 'The drawing did not turn out how they imagined.', 'You walk into a birthday party together.', 'They are trying to build something that keeps falling over.'],
  middle: ['A plan they were looking forward to has to change.', 'A game ends differently from how they hoped.', 'They arrive at a club where they do not know anyone yet.', 'A project gets tricky before it is finished.'],
  teen: ['A plan with friends has to change at the last minute.', 'Something they cared about does not go as hoped.', 'They join a new group for the first time.', 'A goal they chose starts taking more effort than expected.'],
};
const OPTIONS: Record<IntakeBand, [string, string, string][]> = {
  infant: [['Needs plenty of familiar comfort', 'Settles with a little time', 'Seems comfortable with the change'], ['A small signal, then settles', 'Makes it clear, then settles', 'A big reaction; settling takes time'], ['Looks away or wants you close', 'Watches before responding', 'Engages quite quickly'], ['Moves on to something else', 'Has another go', 'Keeps reaching for it']],
  toddler: [['Wants the original plan', 'Adjusts with a little notice', 'Is ready for what comes next'], ['A brief wobble', 'Upset for a while, then ready again', 'Big feelings that take time'], ['Stays close to me', 'Watches, then joins', 'Heads straight over'], ['Moves on to something else', 'Tries again with a little help', 'Keeps trying their own way']],
  preschool: [['Wants the original plan', 'Adjusts with a little notice', 'Is ready for a new idea'], ['A brief wobble', 'Upset for a while, then ready again', 'Big feelings that take time'], ['Stays close to someone familiar', 'Watches, then joins', 'Heads straight over'], ['Chooses something else', 'Tries again with a little help', 'Keeps trying their own way']],
  middle: [['Finds the change hard', 'Adjusts after talking it through', 'Moves on to another plan'], ['A brief disappointment', 'Needs a while, then moves on', 'Feels it strongly for some time'], ['Prefers a familiar person nearby', 'Joins when they feel ready', 'Starts a conversation quickly'], ['Would rather take a break', 'Continues with some support', 'Wants to work it out independently']],
  teen: [['Needs time to accept the change', 'Talks it through, then adjusts', 'Finds another option quite easily'], ['It seems to pass fairly quickly', 'Shows it, then finds their footing', 'Feels it strongly, outwardly or quietly'], ['Prefers familiar company', 'Connects with a few people over time', 'Starts connecting quite quickly'], ['Finds it hard to keep going', 'Keeps going with some support', 'Keeps working at it independently']],
};
const IDEAS: Record<(typeof MOMENT_KEYS)[number], [string, string, string]> = {
  flexibility: ['Try keeping one familiar thing in the new plan.', 'Try a small heads-up about what comes next.', 'Make room to check how the change felt, even if it looked easy.'],
  emotionalIntensity: ['Leave room for a feeling, even when it passes quickly.', 'Try staying nearby before offering a solution.', 'Try fewer words and a calm presence while the feeling is big.'],
  sociability: ['Let a hello happen at their pace; watching counts too.', 'Offer a little time to watch before joining in.', 'Enjoy the connection, with room for a quiet break too.'],
  persistence: ['Try a pause, then offer one small step together.', 'Ask whether a little company or help would feel useful.', 'Leave space to try, and make taking a break welcome too.'],
};

export function momentsFor(band: IntakeBand) {
  return MOMENT_KEYS.map((key, i) => ({ key, title: TITLES[i], scene: SCENES[band][i], options: OPTIONS[band][i], ideas: band === 'infant' && key === 'persistence' ? ['Follow their interest if they turn to something else.', 'Stay close and give them space for another little try.', 'Stay nearby and make room for a pause when they need one.'] : IDEAS[key] }));
}

export function encodeMomentShare(band: IntakeBand, answers: Answers) {
  return `v2.${band}.${TRAIT_QUESTIONS.map(({ key }) => {
    const index = OPTION_VALUES.indexOf(answers[key] as 20 | 50 | 80);
    return index < 0 ? 'x' : String(index);
  }).join('')}`;
}
export function decodeMomentShare(code?: string) {
  const match = /^v2\.(infant|toddler|preschool|middle|teen)\.([012x]{6})$/.exec(code ?? '');
  if (!match) return null;
  const answers: Answers = {};
  TRAIT_QUESTIONS.forEach(({ key }, i) => { if (match[2][i] !== 'x') answers[key] = OPTION_VALUES[Number(match[2][i])]; });
  return { band: match[1] as IntakeBand, answers };
}

/** Only explicit new choices change saved numbers. Skipping a retake preserves the old profile. */
export function mergeIntake(prior: Child | undefined, answers: Answers, band: IntakeBand | null) {
  const keys = TRAIT_QUESTIONS.map(q => q.key).filter(key => OPTION_VALUES.includes(answers[key] as 20 | 50 | 80));
  const temperament = Object.fromEntries(TRAIT_QUESTIONS.map(({ key }) => [key, answers[key] ?? prior?.temperament[key] ?? 50])) as unknown as TemperamentProfile;
  const oldKeys = prior?.intakeAnswered ?? (prior?.intakeBand ? TRAIT_QUESTIONS.map(q => q.key) : []);
  return {
    temperament,
    intakeAnswered: !keys.length && prior ? prior.intakeAnswered ?? null : [...new Set([...(prior?.intakeBand === band ? oldKeys : []), ...keys])],
    intakeBand: keys.length ? band : prior?.intakeBand ?? band,
  };
}

export function observedPatterns(child: Child): { key: TraitKey; situation: string; answer: string }[] {
  if (child.age.stage === 'pregnancy') return [];
  const band = intakeBandForAge(child.age.years, child.age.months);
  if (child.intakeBand !== band) return [];
  const keys = child.intakeAnswered ?? TRAIT_QUESTIONS.map(q => q.key);
  return keys.flatMap(key => {
    const q = QUESTION_BANKS[band].find(q => q.key === key);
    if (!q) return [];
    const scene = momentsFor(band).find(q => q.key === key);
    const value = child.temperament[key];
    const index = value <= 35 ? 0 : value >= 65 ? 2 : 1;
    return [{ key, situation: scene?.title ?? q.question, answer: scene?.options[index] ?? q.options[index] }];
  });
}
export function describePatterns(child: Child) {
  const patterns = observedPatterns(child);
  return patterns.length
    ? `Parent's optional observations (situational, not fixed traits): ${patterns.map(p => `${p.situation}: ${p.answer}`).join('; ')}. Unlisted patterns are unknown. Do not infer them.`
    : 'No current observations supplied. Do not infer temperament or personality from missing answers.';
}

