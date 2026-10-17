import 'server-only';
import { z } from 'zod';
import { FAST_MODEL, structuredCall, withTimeout } from '@/lib/ai/llm';

/*
 * Orchestrator step 3: the critic. A deterministic lint runs on every decode; only when it flags
 * something does a fast model repair the affected fields. Clean decodes pay no latency.
 */

export interface Violation { rule: string; field: string; excerpt: string }

const CONDITIONS = '(adhd|add|autism|autistic|asd|ocd|odd|oppositional defiant|conduct disorder|bipolar|depression|depressed|anxiety disorder|dyslexi[ac]|dyspraxi[ac]|sensory processing disorder|spd|personality disorder)';
const RULES: { rule: string; re: RegExp; fields?: string[] }[] = [
  // Assigning a condition: "he has ADHD", "sounds like autism", "may be autistic".
  { rule: 'diagnosis', re: new RegExp(`\\b(has|have|is|are|sounds like|looks like|could be|may be|might be|probably|likely|signs of|symptoms of)\\s+(an?\\s+)?${CONDITIONS}\\b`, 'i') },
  // Physical punishment suggested (not negated).
  { rule: 'physical_punishment', re: /(?<!\b(?:don'?t|do not|never|not|no|avoid|without|instead of)\s+(?:\w+\s+){0,2})\b(spank|slap|smack|beat|whack|pinch|pull (his|her) ear|hit (him|her|them) (back|once|lightly))\b/i },
  // Shaming, labelling or threats inside the words to say.
  { rule: 'shaming_or_threat', re: /\b(bad (boy|girl)|naughty|stupid|lazy|liar|shame on you|i('| wi)ll leave you|police will (come|take)|i don'?t love you|go away)\b/i, fields: ['sayThis'] },
];

export function lintAnalysis(a: Record<string, unknown>): Violation[] {
  const out: Violation[] = [];
  for (const [field, value] of Object.entries(a)) {
    const texts = Array.isArray(value) ? value.map((v) => (typeof v === 'string' ? v : (v as { text?: string })?.text ?? '')) : typeof value === 'string' ? [value] : [];
    for (const text of texts) {
      for (const r of RULES) {
        if (r.fields && !r.fields.includes(field)) continue;
        const m = r.re.exec(text);
        if (m) out.push({ rule: r.rule, field, excerpt: text.slice(Math.max(0, m.index - 30), m.index + m[0].length + 30) });
      }
    }
  }
  return out;
}

const REPAIR_SYSTEM = `You are the quality critic for a parenting app. You receive a JSON answer and a list of constitution violations. Rewrite ONLY the flagged text so it complies, keeping meaning, tone, language and length:
- diagnosis: never name or imply a condition. Replace with observable patterns and "a paediatrician or child psychologist can help you understand this".
- physical_punishment: remove it; offer a calm, non-physical alternative.
- shaming_or_threat: rewrite the words to say without labels, shame or threats; feeling first, limit second.
If an excerpt is actually compliant (e.g. it tells the parent NOT to spank), keep it unchanged.
Return the full JSON object with every field present.`;

/**
 * Repairs a decode that failed lint. Returns the original if repair fails or times out:
 * never block the parent on the critic.
 */
export async function repairAnalysis<T extends Record<string, unknown>>(
  analysis: T,
  violations: Violation[],
  schema: Record<string, unknown>,
  validator: z.ZodType<T>,
): Promise<{ analysis: T; repaired: boolean }> {
  try {
    const fixed = await withTimeout(structuredCall({
      model: FAST_MODEL,
      system: REPAIR_SYSTEM,
      user: `<violations>\n${violations.map((v) => `- ${v.rule} in ${v.field}: "${v.excerpt}"`).join('\n')}\n</violations>\n<answer>\n${JSON.stringify(analysis)}\n</answer>`,
      schema,
      validator,
      maxTokens: 6000,
    }), 12000);
    return { analysis: fixed, repaired: true };
  } catch (error) {
    console.error('[critic] repair failed', error);
    return { analysis, repaired: false };
  }
}
