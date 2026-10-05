import 'server-only';
import { z } from 'zod';
import { structuredCall } from '@/lib/ai/decode';

export const weekGuideSchema = z.object({
  babyThisWeek: z.string().min(1),
  sizeComparison: z.string().min(1),
  yourBody: z.string().min(1),
  yourMind: z.string().min(1),
  partnerTip: z.string().min(1),
  checklist: z.array(z.string().min(1)).min(1).max(4),
  askYourDoctor: z.array(z.string().min(1)).max(3),
  callNowIf: z.array(z.string().min(1)).min(1).max(5),
});
export type WeekGuide = z.infer<typeof weekGuideSchema>;

const WEEK_GUIDE_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['babyThisWeek', 'sizeComparison', 'yourBody', 'yourMind', 'partnerTip', 'checklist', 'askYourDoctor', 'callNowIf'],
  properties: {
    babyThisWeek: { type: 'string', description: '2-3 sentences on fetal development this week.' },
    sizeComparison: { type: 'string', description: 'Approximate size compared to a fruit or vegetable familiar in India, e.g. "a chikoo".' },
    yourBody: { type: 'string', description: '2-3 sentences on common physical changes and simple comfort measures.' },
    yourMind: { type: 'string', description: '2 sentences on common emotions this week and one grounding practice.' },
    partnerTip: { type: 'string', description: 'One concrete way a partner or family member can help this week.' },
    checklist: { type: 'array', items: { type: 'string' }, description: '1-4 practical to-dos typical for this week (tests commonly offered, preparations).' },
    askYourDoctor: { type: 'array', items: { type: 'string' }, description: 'Up to 3 good questions for the next antenatal visit.' },
    callNowIf: { type: 'array', items: { type: 'string' }, description: 'Warning signs at this stage that need immediate medical attention.' },
  },
} as const;

const WEEK_GUIDE_SYSTEM = `You write a short, warm week-by-week pregnancy guide for expecting parents in India.
Follow mainstream obstetric guidance (WHO, FOGSI, ACOG). General information only: no medication names or doses, no diagnosis, and defer decisions to the parent's doctor. Mention tests only as "commonly offered around now". Be reassuring without dismissing real warning signs. Plain language, culturally aware (family involvement, diet), no myths.
Write entirely in the requested language, in its native script.`;

export async function writeWeekGuide(week: number, language: string): Promise<WeekGuide> {
  return structuredCall({
    effort: 'medium',
    system: WEEK_GUIDE_SYSTEM,
    user: `<week>${week}</week>\n<language>${language}</language>`,
    schema: WEEK_GUIDE_JSON_SCHEMA,
    validator: weekGuideSchema,
    maxTokens: 8000,
  });
}
