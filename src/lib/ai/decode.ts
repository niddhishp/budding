import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import type { AgentAnalysis, Child, RiskLevel, SafetyNotice } from '@/types';

type Effort = 'low' | 'medium' | 'high';

// The decode is the product: it gets the main model. Classification and message rewriting
// are simpler tasks and can run on a cheaper model via BUDDING_FAST_MODEL (defaults to the main one).
const MODEL = process.env.BUDDING_MODEL || 'claude-opus-5-5';
const FAST_MODEL = process.env.BUDDING_FAST_MODEL || MODEL;
// Decodes are read mid-meltdown: favour latency. Raise via env once evals show headroom.
const EFFORT = (process.env.BUDDING_EFFORT || 'low') as Effort;

// Haiku 4.5 rejects `effort` and is not a server-side-fallback model; omit both for it.
const supportsEffortAndFallbacks = (model: string) => !model.startsWith('claude-haiku');

let client: Anthropic | null = null;
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

// ─── Output schemas ──────────────────────────────────────────────────────────

const analysisSchema = z.object({
  sayThis: z.string().min(1),
  interpretation: z.string().min(1),
  emotionalNeed: z.string().min(1),
  doThis: z.array(z.string().min(1)).min(1).max(5),
  avoid: z.string().min(1),
  afterwards: z.string().min(1),
  skillBeingBuilt: z.string().min(1),
  developmentalContext: z.string().min(1),
});

const ANALYSIS_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['sayThis', 'interpretation', 'emotionalNeed', 'doThis', 'avoid', 'afterwards', 'skillBeingBuilt', 'developmentalContext'],
  properties: {
    sayThis: { type: 'string', description: 'The exact words the parent says right now. 1-3 short sentences, spoken language, addressed to the child.' },
    interpretation: { type: 'string', description: 'What the behavior most likely means. 2-3 sentences, plain language, no jargon.' },
    emotionalNeed: { type: 'string', description: 'The need underneath the behavior, in under 8 words.' },
    doThis: { type: 'array', items: { type: 'string' }, description: '2-4 concrete actions for the next few minutes, each under 20 words.' },
    avoid: { type: 'string', description: 'The single most likely mistake to avoid with THIS child, and why, in one sentence.' },
    afterwards: { type: 'string', description: 'What to do or say later, once everyone is calm. 1-2 sentences.' },
    skillBeingBuilt: { type: 'string', description: 'The skill this moment builds, in under 6 words.' },
    developmentalContext: { type: 'string', description: 'Why this is expected at this age/stage. 1-2 sentences.' },
  },
} as const;

const safetySchema = z.object({
  level: z.enum(['none', 'low', 'elevated', 'urgent']),
  reason: z.string(),
});

const SAFETY_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['level', 'reason'],
  properties: {
    level: { type: 'string', enum: ['none', 'low', 'elevated', 'urgent'] },
    reason: { type: 'string', description: 'One sentence explaining the rating.' },
  },
} as const;

// ─── Prompts ─────────────────────────────────────────────────────────────────

const DECODE_SYSTEM = `You are Kahiye, a parenting guide grounded in developmental psychology, attachment research and practical behavior science. A parent is describing a moment with their child, often while it is still happening. They need the right words in seconds, not an essay.

How to respond:
- Lead with what to SAY. Write it as the parent would speak it to this child at this age: short, warm, firm where a boundary is needed. A 2-year-old gets 5-word sentences; a teenager gets respect and brevity, never a lecture.
- Behavior is communication, not a moral failing. Explain what this behavior most likely signals given the child's age and temperament. Do not diagnose.
- Use the child's temperament and history. If a past approach worked or failed with this child, build on it explicitly. A highly sensitive or intense child needs a different approach from a flexible, low-intensity one.
- Hold boundaries. Empathy does not mean giving in; name the limit and the feeling together.
- Be concrete. "Get down to eye level and lower your voice" beats "connect with your child".
- Respect the family's context. Many families are multigenerational (grandparents, nannies, relatives share caregiving); where it helps, note how to keep caregivers consistent.
- Reply in the same language and register the parent wrote in (English, Hindi, Hinglish, Malayalam, Tamil, etc.).
- Safety first: if anyone may be at risk of harm, the first action in doThis must be to make everyone physically safe and seek help.

Never shame the parent. They are here because they care.`;

const SAFETY_SYSTEM = `You classify parent messages about their child for safety risk. Rate the situation described:
- "urgent": immediate danger — self-harm or suicidal talk by the child, abuse, a medical emergency, a child missing, violence causing injury, a parent at risk of harming the child.
- "elevated": warning signs that warrant professional input soon — persistent withdrawal or hopelessness, eating or sleep severely disrupted for weeks, regression after a trauma, developmental red flags, parental burnout with thoughts of giving up.
- "low": ordinary but intense difficulty — tantrums, defiance, sibling fights, school refusal, screen battles.
- "none": everyday questions.
Rate on the content, not the tone. Ordinary frustration ("I'm going to lose it") is not a risk of harm.`;

// Instant, model-free screen so obvious emergencies never depend on an API round-trip.
const URGENT_PATTERNS = [
  /\bsuicid/i, /\bkill (him|her|them)sel(f|ves)\b/i, /\bwants? to die\b/i, /\bself[- ]?harm/i, /\bcutting (him|her)self/i,
  /\b(sexual(ly)?|physical(ly)?) abus/i, /\bnot breathing\b/i, /\bunconscious\b/i, /\bseizure/i, /\bswallowed\b/i,
  /\bmissing\b.*\b(child|son|daughter|kid)\b/i, /\bhurt(ing)? (my|the) (baby|child|kid)\b/i,
];

const HELPLINES: SafetyNotice['helplines'] = [
  { name: 'Emergency', number: '112', note: 'Police, ambulance, fire — India' },
  { name: 'Childline', number: '1098', note: 'Children in distress or danger, 24×7' },
  { name: 'Tele-MANAS', number: '14416', note: 'Free mental health support, 24×7, many languages' },
];

// ─── Context ─────────────────────────────────────────────────────────────────

export interface DecodeContext {
  child: Child;
  recentLogs: { content: string; log_type: string; created_at: string }[];
  pastDecodes: { scenario: string; say_this: string | null; outcome: string | null; created_at: string }[];
}

function describeTrait(name: string, value: number) {
  const band = value >= 70 ? 'high' : value <= 30 ? 'low' : 'moderate';
  return `${name}: ${band} (${value}/100)`;
}

function buildUserMessage(scenario: string, ctx: DecodeContext) {
  const { child, recentLogs, pastDecodes } = ctx;
  const t = child.temperament;
  const age = child.age.stage === 'pregnancy'
    ? `not yet born (pregnancy week ${child.age.pregnancyWeek})`
    : `${child.age.years} years ${child.age.months} months (${child.age.stage.replace('-', ' ')})`;

  const lines = [
    `<child>`,
    `Name: ${child.name}`,
    `Age: ${age}`,
    `Temperament (parent-reported): ${[
      describeTrait('sensitivity', t.sensitivity),
      describeTrait('emotional intensity', t.emotionalIntensity),
      describeTrait('flexibility', t.flexibility),
      describeTrait('persistence', t.persistence),
      describeTrait('sociability', t.sociability),
      describeTrait('curiosity', t.curiosity),
    ].join('; ')}`,
    `</child>`,
  ];

  if (recentLogs.length) {
    lines.push(`<recent_observations>`);
    recentLogs.forEach((l) => lines.push(`- [${l.created_at.slice(0, 10)}, ${l.log_type}] ${l.content}`));
    lines.push(`</recent_observations>`);
  }

  const rated = pastDecodes.filter((d) => d.outcome);
  if (rated.length) {
    lines.push(`<what_has_worked_before>`);
    rated.forEach((d) =>
      lines.push(`- Situation: ${d.scenario}\n  Said: ${d.say_this ?? '—'}\n  Parent's verdict: ${d.outcome!.replace(/_/g, ' ')}`),
    );
    lines.push(`</what_has_worked_before>`);
  }

  lines.push(`<parent_message>\n${scenario}\n</parent_message>`);
  return lines.join('\n');
}

// ─── Calls ───────────────────────────────────────────────────────────────────

function firstText(content: Anthropic.Beta.BetaContentBlock[]) {
  for (const block of content) if (block.type === 'text') return block.text;
  return null;
}

interface StructuredOpts<T> {
  model?: string;
  effort?: Effort;
  system: string;
  user: string;
  schema: Record<string, unknown>;
  validator: z.ZodType<T>;
  maxTokens: number;
}

function requestParams(opts: StructuredOpts<unknown>) {
  const model = opts.model ?? MODEL;
  const full = supportsEffortAndFallbacks(model);
  return {
    model,
    max_tokens: opts.maxTokens,
    ...(full ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
    system: opts.system,
    messages: [{ role: 'user' as const, content: opts.user }],
    output_config: {
      ...(full ? { effort: opts.effort ?? EFFORT } : {}),
      format: { type: 'json_schema' as const, schema: opts.schema },
    },
  };
}

function parseFinal<T>(response: Anthropic.Beta.BetaMessage, validator: z.ZodType<T>): T {
  if (response.stop_reason === 'refusal') throw new DecodeError('refused', 'The model declined this request.');
  if (response.stop_reason === 'max_tokens') throw new DecodeError('truncated', 'The response was cut off.');
  const text = firstText(response.content);
  if (!text) throw new DecodeError('empty', 'The model returned no text.');
  return validator.parse(JSON.parse(text));
}

export async function structuredCall<T>(opts: StructuredOpts<T>): Promise<T> {
  const response = await getClient().beta.messages.create(requestParams(opts));
  return parseFinal(response, opts.validator);
}

/** Same as structuredCall, but forwards raw JSON text deltas as they arrive. */
async function structuredStream<T>(opts: StructuredOpts<T>, onText: (delta: string) => void): Promise<T> {
  const stream = getClient().beta.messages.stream(requestParams(opts));
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') onText(event.delta.text);
  }
  return parseFinal(await stream.finalMessage(), opts.validator);
}

export class DecodeError extends Error {
  constructor(public code: 'refused' | 'truncated' | 'empty', message: string) {
    super(message);
  }
}

export async function classifySafety(scenario: string): Promise<{ level: RiskLevel; reason: string }> {
  if (URGENT_PATTERNS.some((p) => p.test(scenario))) {
    return { level: 'urgent', reason: 'Matched an emergency pattern.' };
  }
  try {
    return await structuredCall({
      model: FAST_MODEL,
      system: SAFETY_SYSTEM,
      user: `<parent_message>\n${scenario}\n</parent_message>`,
      schema: SAFETY_JSON_SCHEMA,
      validator: safetySchema,
      maxTokens: 2000,
    });
  } catch (error) {
    // Fail safe-ish: an unclassified message is treated as low, never silently as none.
    console.error('[safety] classification failed', error);
    return { level: 'low', reason: 'Classifier unavailable.' };
  }
}

/**
 * Streams the decode. `sayThis` is the first schema property, so the words to say
 * reach the parent before the rest of the analysis is written.
 */
export async function decodeBehavior(
  scenario: string,
  ctx: DecodeContext,
  onText: (delta: string) => void = () => {},
): Promise<AgentAnalysis> {
  return structuredStream({
    system: DECODE_SYSTEM,
    user: buildUserMessage(scenario, ctx),
    schema: ANALYSIS_JSON_SCHEMA,
    validator: analysisSchema,
    maxTokens: 8000,
  }, onText);
}

// ─── Caregiver sharing ───────────────────────────────────────────────────────

export const SHARE_LANGUAGES = [
  'English', 'Hindi', 'Malayalam', 'Tamil', 'Marathi', 'Bengali', 'Telugu', 'Kannada', 'Gujarati',
] as const;
export type ShareLanguage = (typeof SHARE_LANGUAGES)[number];
export type ShareAudience = 'grandparent' | 'nanny' | 'partner' | 'teacher';

const SHARE_SYSTEM = `You turn a parent's plan for a difficult moment with their child into a short message the parent can forward to another caregiver on WhatsApp, so every adult responds the same way.

Write it as the parent speaking to that caregiver: warm, respectful, specific. For a grandparent, be especially respectful and never imply they did something wrong. For a nanny or helper, be clear and practical. Keep it under 90 words. Include: the situation in one line, the exact words to say to the child (keep these short and natural in the target language), one thing to do and one thing to avoid. Write entirely in the requested language and its native script; keep the child's name as is. No hashtags, no emoji except at most one at the start.`;

const shareSchema = z.object({ message: z.string().min(1) });
const SHARE_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['message'],
  properties: { message: { type: 'string' } },
} as const;

export async function writeShareMessage(opts: {
  childName: string;
  scenario: string;
  analysis: AgentAnalysis;
  language: ShareLanguage;
  audience: ShareAudience;
}): Promise<string> {
  const { message } = await structuredCall({
    model: FAST_MODEL,
    system: SHARE_SYSTEM,
    user: [
      `<caregiver>${opts.audience}</caregiver>`,
      `<language>${opts.language}</language>`,
      `<child_name>${opts.childName}</child_name>`,
      `<situation>${opts.scenario}</situation>`,
      `<plan>`,
      `Say: ${opts.analysis.sayThis}`,
      `Do: ${opts.analysis.doThis.join(' / ')}`,
      `Avoid: ${opts.analysis.avoid}`,
      `</plan>`,
    ].join('\n'),
    schema: SHARE_JSON_SCHEMA,
    validator: shareSchema,
    maxTokens: 3000,
  });
  return message;
}

export function safetyNotice(level: RiskLevel): SafetyNotice | null {
  if (level === 'urgent') {
    return {
      level,
      message: 'This sounds serious. Make sure everyone is physically safe first, then call for help now. You do not have to handle this alone.',
      helplines: HELPLINES,
    };
  }
  if (level === 'elevated') {
    return {
      level,
      message: 'What you describe is worth discussing with your pediatrician or a child psychologist soon. The guidance below can help in the meantime.',
      helplines: HELPLINES.slice(1),
    };
  }
  return null;
}

export const DECODE_MODEL = MODEL;
