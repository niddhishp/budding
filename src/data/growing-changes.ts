import { ageMonths } from '@/lib/family-care';

// Conversation invitations, not age deadlines or a clinical checklist.
export const growingBands = [
  { id: '3-5', min: 36, max: 60, label: 'Big feelings, big imagination · 3–5 years', prompts: [
    ['potty', 'Learning to use the toilet', 'How do they let you know their body needs the toilet?', 'Keep it calm and unhurried. Notice a small step, like telling you in time, and leave accidents without comment.'],
    ['preschool', 'Nursery and new places', 'What helps them settle when you say goodbye?', 'Use the same short goodbye each time and tell them truthfully when you will be back.'],
    ['no', 'Saying "no!"', 'When do they push back most, and what is underneath it?', 'Offer two choices you are happy with. A "no" is often practice at having a say, not a challenge to you.'],
    ['pretend', 'Pretend play', 'What do they love to pretend to be?', 'Join in for a few minutes and let them lead the story. Follow their rules, even the silly ones.'],
  ] },
  { id: '5-8', min: 61, max: 107, label: 'Growing independence · 5–8 years', prompts: [
    ['choices', 'Making small choices', 'What do they enjoy choosing for themselves?', 'Offer two workable choices and let them explain their preference.'],
    ['friendship', 'Learning to be a friend', 'What makes a good day with a friend?', 'Talk through taking turns or repairing a disagreement using a real, small example.'],
    ['feelings', 'Finding words for feelings', 'How do they show you that a day was hard?', 'Offer a feeling word as a guess, then leave room for their version.'],
    ['responsibility', 'A job that feels like theirs', 'Which everyday task would they like to try?', 'Break it into steps and stay available without taking over.'],
  ] },
  { id: '9-11', min: 108, max: 143, label: 'Their expanding world · 9–11 years', prompts: [
    ['friendship', 'Friendships and belonging', 'Who helps them feel comfortable being themselves?', 'Listen to a friendship story before offering a solution. Ask whether they want help or just a listener.'],
    ['independence', 'A little more independence', 'What would they like to manage on their own?', 'Agree on one small responsibility, the support available and when you will check in.'],
    ['feelings', 'Handling a difficult moment', 'What helps after disappointment or an argument?', 'Explore a pause, a walk or talking together. Let them choose what feels useful.'],
    ['privacy', 'Growing privacy and body questions', 'How can they ask you a private or awkward question?', 'Make time without an audience. Listen without teasing and offer to find reliable answers together.'],
    ['interests', 'Their own opinions and interests', 'What do they keep thinking about or coming back to?', 'Ask them to show you something they enjoy. Keep marks, prizes and comparisons out of this moment.'],
  ] },
  { id: '12-14', min: 144, max: 179, label: 'More voice, more space · 12–14 years', prompts: [
    ['identity', 'Finding their own voice', 'Which choices matter most to them right now?', 'Invite their reasons and explain yours. Find one decision you can share.'],
    ['friends', 'Friends, belonging and boundaries', 'When do they feel included or under pressure?', 'Keep the conversation curious. Help rehearse a way to say no if they want one.'],
    ['privacy', 'Trust and privacy', 'What privacy would help them feel respected?', 'Discuss privacy and safety together; agree on when you need to step in.'],
    ['rest', 'Balancing their day', 'What feels too full: school, activities, screens or friendships?', 'Look at one day together and make room for something they can drop or simplify.'],
  ] },
  { id: '15-plus', min: 180, max: Infinity, label: 'Practising independence · 15 years and beyond', prompts: [
    ['decisions', 'Making decisions with support', 'Which upcoming decision would they like to own?', 'Offer to explore options and consequences together without deciding for them.'],
    ['relationships', 'Respectful relationships', 'What does feeling safe and respected look like to them?', 'Discuss boundaries, consent and getting help without demanding personal disclosures.'],
    ['life', 'Everyday life skills', 'Which practical skill would make life easier?', 'Try planning a meal, a journey or a small budget together. Let them lead.'],
    ['pressure', 'Pressure and recovery', 'What is taking more energy than people realise?', 'Ask what support would help and agree on a manageable next step.'],
  ] },
] as const;

export function growingBand(birth: string | null, date?: string) {
  if (!birth) return null;
  const months = ageMonths(birth, date);
  return growingBands.find(b => months >= b.min && months <= b.max) ?? null;
}
export function observationKey(band: string, prompt: string) {
  return `growing-${band}-${prompt}`;
}
