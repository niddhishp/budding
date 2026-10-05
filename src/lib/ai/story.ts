import 'server-only';
import { z } from 'zod';
import { structuredCall } from '@/lib/ai/decode';
import type { Child } from '@/types';

const storySchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  moral: z.string(),
});

const STORY_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'body', 'moral'],
  properties: {
    title: { type: 'string', description: 'A short, warm title.' },
    body: { type: 'string', description: 'The story text, in paragraphs separated by blank lines.' },
    moral: { type: 'string', description: 'One sentence the parent can say after reading, in the same language. Empty if the story speaks for itself.' },
  },
} as const;

const STORY_SYSTEM = `You write personalised bedtime stories that a parent reads aloud. The child is the hero.

Craft:
- The story gently mirrors what the child is going through (the theme) through the hero's adventure: the hero feels the same worry, finds a small brave way through, and is helped by someone kind. Never lecture, never name the child's "problem" directly, never shame.
- Use the child's temperament: a sensitive child's hero notices things others miss; an intense child's hero has big feelings that become strength; a cautious child's hero gets time to watch before joining in.
- Concrete, sensory, rhythmic sentences that sound good read aloud. Familiar Indian settings, foods, festivals and family members (Amma, Appa, Dadi, Nani, Ammamma…) are welcome when natural.
- The last third slows down: quieter images, breathing, stars, sleep. End calm and safe.
- Write entirely in the requested language, in its native script. Keep the child's name as given.`;

function targetLength(child: Child) {
  if (child.age.years < 3) return 'about 150 words, very simple sentences, gentle repetition';
  if (child.age.years < 7) return 'about 350 words';
  if (child.age.years < 13) return 'about 550 words, with a little more plot';
  return 'about 500 words, a calm, grown-up tone without being childish';
}

export async function writeStory(opts: { child: Child; theme: string; language: string }) {
  const { child, theme, language } = opts;
  const t = child.temperament;
  return structuredCall({
    system: STORY_SYSTEM,
    user: [
      `<child name="${child.name}" age="${child.age.label}">`,
      `Temperament (0-100): sensitivity ${t.sensitivity}, emotional intensity ${t.emotionalIntensity}, flexibility ${t.flexibility}, persistence ${t.persistence}, sociability ${t.sociability}, curiosity ${t.curiosity}`,
      `</child>`,
      `<theme>${theme}</theme>`,
      `<language>${language}</language>`,
      `<length>${targetLength(child)}</length>`,
    ].join('\n'),
    schema: STORY_JSON_SCHEMA,
    validator: storySchema,
    maxTokens: 12000,
  });
}
