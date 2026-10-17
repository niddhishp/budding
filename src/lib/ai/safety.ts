import 'server-only';
import { z } from 'zod';
import { FAST_MODEL, structuredCall } from '@/lib/ai/llm';
import type { RiskLevel, SafetyCategory, SafetyNotice } from '@/types';

/*
 * Safety constitution, in code.
 * - Runs on every message, for every plan, before any entitlement check.
 * - Crisis turns never consume a parent's quota and are never paywalled.
 * - Tier 3 (imminent danger) > Tier 2 (risk to the child) > Tier 1 (parent distress).
 */

export interface SafetyResult {
  level: RiskLevel;
  category: SafetyCategory;
  reason: string;
}

const CATEGORIES = ['none', 'parent_distress', 'parent_harm_risk', 'child_self_harm', 'abuse', 'medical', 'violence', 'missing_child', 'exam_distress', 'wellbeing_concern'] as const;

const safetySchema = z.object({
  level: z.enum(['none', 'low', 'elevated', 'urgent']),
  category: z.enum(CATEGORIES),
  reason: z.string(),
});

const SAFETY_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['level', 'category', 'reason'],
  properties: {
    level: { type: 'string', enum: ['none', 'low', 'elevated', 'urgent'] },
    category: { type: 'string', enum: [...CATEGORIES] },
    reason: { type: 'string', description: 'One sentence explaining the rating.' },
  },
} as const;

const SAFETY_SYSTEM = `You triage parent messages about their child (or themselves) for safety. You do not give advice; you classify.

level:
- "urgent": immediate danger to life or body now — a child talking about wanting to die or hurting themselves, self-harm, abuse disclosure, a medical emergency, a missing child, violence causing injury, a parent saying they might hurt their child or baby.
- "elevated": warning signs that need professional input soon — persistent hopelessness or withdrawal, eating or sleep badly disrupted for weeks, regression after trauma, exam-related despair, a parent at breaking point.
- "low": ordinary but intense difficulty — tantrums, defiance, sibling fights, school refusal, screens, a parent feeling stressed.
- "none": everyday questions.

category: the main concern — parent_distress (overwhelm, burnout, "I can't do this"), parent_harm_risk (parent fears they will hurt the child, or already has), child_self_harm (self-harm or suicidal talk by the child), abuse (any abuse or neglect by anyone, including disclosures), medical (a physical emergency), violence (serious violence between people), missing_child, exam_distress (exam/results pressure with distress), wellbeing_concern (other worrying mental/developmental signs), or none.

Rate on content, not tone. "I'm going to lose it" from a tired parent is parent_distress at "low", not harm risk. Messages may be in English, Hindi, Hinglish or other Indian languages.`;

// Instant, model-free screen: obvious emergencies never wait on an API round-trip.
const PATTERNS: { re: RegExp; category: SafetyCategory }[] = [
  { re: /\bsuicid|\bkill (him|her|my|them)sel(f|ves)\b|\bwants? to die\b|\bwant(s)? to end (it|(his|her) life)|marna chahta|marna chahti|khudkushi/i, category: 'child_self_harm' },
  { re: /\bself[- ]?harm|\bcutting (him|her)self|\bcuts (him|her)self|\bburn(s|ing)? (him|her)self/i, category: 'child_self_harm' },
  { re: /\b(sexual(ly)?|physical(ly)?) abus|\bmolest|\btouched (him|her) (inappropriately|there)|\bbad touch/i, category: 'abuse' },
  { re: /\bnot breathing\b|\bunconscious\b|\bseizure|\bconvuls|\bswallowed (a |some )?(battery|pills|medicine|poison|coin)|\bchoking\b/i, category: 'medical' },
  { re: /\bmissing\b.*\b(child|son|daughter|kid|baby)\b|\bcan'?t find (my|our) (son|daughter|child|kid)/i, category: 'missing_child' },
  { re: /\b(i|i'm|im) (might|will|going to|could|want to) (hurt|hit|shake|kill) (my|the) (baby|child|kid|son|daughter)\b|\bshook (my|the) baby\b/i, category: 'parent_harm_risk' },
];

export async function classifySafety(message: string): Promise<SafetyResult> {
  const hit = PATTERNS.find((p) => p.re.test(message));
  if (hit) return { level: 'urgent', category: hit.category, reason: 'Matched an emergency pattern.' };
  try {
    return await structuredCall({
      model: FAST_MODEL,
      system: SAFETY_SYSTEM,
      user: `<message>\n${message}\n</message>`,
      schema: SAFETY_JSON_SCHEMA,
      validator: safetySchema,
      maxTokens: 1500,
    });
  } catch (error) {
    // Fail safe-ish: an unclassified message is treated as low, never silently as none.
    console.error('[safety] classification failed', error);
    return { level: 'low', category: 'none', reason: 'Classifier unavailable.' };
  }
}

/** Crisis-adjacent turns bypass quotas and paywalls. */
export function bypassesPaywall(s: SafetyResult): boolean {
  return s.level === 'urgent' || s.level === 'elevated' || s.category === 'parent_distress' || s.category === 'parent_harm_risk';
}

/** Whether this turn should be queued for human review. */
export function needsReview(s: SafetyResult): boolean {
  return s.level === 'urgent' || s.level === 'elevated';
}

// India helplines (verified): 112 national emergency; 108 ambulance (most states);
// Childline 1098; Tele-MANAS 14416 / 1-800-891-4416; Women helpline 181.
const H = {
  emergency: { name: 'Emergency', number: '112', note: 'Police, ambulance, fire — all India' },
  ambulance: { name: 'Ambulance', number: '108', note: 'Medical emergencies (most states)' },
  childline: { name: 'Childline', number: '1098', note: 'Children in danger or distress, 24×7, free' },
  teleManas: { name: 'Tele-MANAS', number: '14416', note: 'Free mental health support, 24×7, many languages — for children and parents' },
  women: { name: 'Women helpline', number: '181', note: 'Violence at home, 24×7' },
};

export function safetyNotice(s: SafetyResult): SafetyNotice | null {
  const base = { level: s.level, category: s.category };
  switch (s.category) {
    case 'child_self_harm':
      return {
        ...base, tier: s.level === 'urgent' ? 3 : 2,
        message: 'Your child\'s safety comes first. You did the right thing by noticing.',
        steps: [
          'If they may be in danger right now, stay with them. Do not leave them alone.',
          'Calmly move medicines, blades, ropes and similar things out of reach.',
          'Ask gently and directly: "Are you thinking about hurting yourself?" Asking does not put the idea in their head.',
          'Listen more than you talk. Stay calm, even if you feel scared.',
          'Call Tele-MANAS 14416 now. If there is immediate danger, call 112.',
        ],
        helplines: [H.teleManas, H.emergency, H.childline],
      };
    case 'abuse':
      return {
        ...base, tier: s.level === 'urgent' ? 3 : 2,
        message: 'Thank you for acting on this. Believing your child is the most protective thing you can do.',
        steps: [
          'Stay calm and tell them: "I believe you. You did the right thing telling me. It is not your fault."',
          'Do not question them in detail or ask leading questions. That is for trained professionals.',
          'Keep them away from the person involved if you can.',
          'Write down what they said, in their words, with the date and time.',
          'Call Childline 1098 for help and next steps, or 112 if they are in danger now.',
        ],
        helplines: [H.childline, H.emergency, H.teleManas],
      };
    case 'medical':
      return {
        ...base, tier: 3,
        message: 'This may be a medical emergency. Get help now.',
        steps: ['Call 112 or 108 for an ambulance right away.', 'Stay with your child and follow the operator\'s instructions.', 'Do not give food, water or medicine unless told to.'],
        helplines: [H.ambulance, H.emergency],
      };
    case 'missing_child':
      return {
        ...base, tier: 3,
        message: 'Call for help immediately. Minutes matter.',
        steps: ['Call 112 now and give a description and what they were wearing.', 'Ask a neighbour or family member to check nearby places your child knows.', 'Keep your phone free for callbacks.'],
        helplines: [H.emergency, H.childline],
      };
    case 'violence':
      return {
        ...base, tier: s.level === 'urgent' ? 3 : 2,
        message: 'Getting everyone safe comes before anything else.',
        steps: ['Move children to a safe room or out of the house if you can.', 'Call 112 if anyone is in danger. For violence at home, the women helpline is 181.'],
        helplines: [H.emergency, H.women, H.childline],
      };
    case 'parent_harm_risk':
      return {
        ...base, tier: s.level === 'urgent' ? 3 : 2,
        message: 'Reaching out right now is a strong, safe choice. Feelings this big happen to many parents, and there is help.',
        steps: [
          'Put your child or baby down somewhere safe (a cot is safe even if they are crying) and step into another room for a few minutes.',
          'Breathe slowly. Splash cold water on your face.',
          'Call someone you trust to come over or take over for a while.',
          'Call Tele-MANAS 14416. It is free, 24×7, and it is for parents too.',
        ],
        helplines: [H.teleManas, H.emergency],
      };
    case 'exam_distress':
      if (s.level === 'low' || s.level === 'none') return null;
      return {
        ...base, tier: 2,
        message: 'Exam pressure can feel crushing. Your support right now matters more than any result.',
        steps: [
          'Tell them clearly that your love does not depend on marks.',
          'Watch for changes in sleep or eating, withdrawal, or talk of being a burden or giving up.',
          'If you hear any hopelessness, call Tele-MANAS 14416 together.',
        ],
        helplines: [H.teleManas, H.childline],
      };
    case 'parent_distress':
      return {
        ...base, tier: 1,
        message: 'You are carrying a lot. Looking after yourself is part of looking after your child.',
        steps: ['Take one small thing off today\'s list.', 'If you feel low most days, or close to breaking, Tele-MANAS 14416 is free and confidential, for parents too.'],
        helplines: [H.teleManas],
      };
    case 'wellbeing_concern':
      if (s.level !== 'elevated' && s.level !== 'urgent') return null;
      return {
        ...base, tier: 2,
        message: 'What you describe is worth talking through with a paediatrician or child psychologist soon. The guidance below can help in the meantime.',
        steps: [],
        helplines: [H.teleManas, H.childline],
      };
    default:
      if (s.level === 'urgent') {
        return { ...base, tier: 3, message: 'This sounds serious. Make sure everyone is safe first, then call for help.', steps: ['Call 112 if anyone is in danger.'], helplines: [H.emergency, H.childline, H.teleManas] };
      }
      if (s.level === 'elevated') {
        return { ...base, tier: 2, message: 'This is worth discussing with a professional soon. The guidance below can help in the meantime.', steps: [], helplines: [H.teleManas, H.childline] };
      }
      return null;
  }
}
