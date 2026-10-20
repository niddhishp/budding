import 'server-only';
import { z } from 'zod';
import { DecodeError, FAST_MODEL, structuredCall } from '@/lib/ai/llm';

/*
 * Orchestrator step 3: the critic. A deterministic lint runs on every decode; only when it flags
 * something does a fast model repair the affected fields. Every result then receives the shared content check.
 */

export interface Violation { rule: string; field: string; excerpt: string }

// Names and diagnostic phrases match in any case. Acronyms that are also ordinary words ("odd", "add") match
// only in capitals, so "this is odd" or "is add one more step" are not treated as a diagnosis.
const CONDITIONS = '(adhd|attention deficit|autism|autistic|asd|ocd|obsessive compulsive|oppositional defiant|conduct disorder|bipolar|depression|depressed|anxiety disorder|dyslexi[ac]|dyspraxi[ac]|sensory processing disorder|personality disorder)';
const ACRONYMS = '(ADD|ODD|SPD)';
const ASSIGNING = ['has', 'have', 'is', 'are', 'sounds like', 'looks like', 'could be', 'may be', 'might be', 'probably', 'likely', 'signs of', 'symptoms of'];
const anyCase = (word: string) => word.replace(/[a-z]/g, c => `[${c}${c.toUpperCase()}]`);
const RULES: { rule: string; re: RegExp; fields?: string[] }[] = [
  // Assigning a condition: "he has ADHD", "sounds like autism", "may be autistic".
  { rule: 'diagnosis', re: new RegExp(`\\b(${ASSIGNING.join('|')})\\s+(an?\\s+)?${CONDITIONS}\\b`, 'i') },
  { rule: 'diagnosis', re: new RegExp(`\\b(${ASSIGNING.map(anyCase).join('|')})\\s+([aA]n?\\s+)?${ACRONYMS}\\b`) },
  // Physical punishment suggested (not negated).
  { rule: 'physical_punishment', re: /(?<!\b(?:don'?t|do not|never|not|no|avoid|without|instead of)\s+(?:\w+\s+){0,2})\b(spank|slap|smack|beat|whack|pinch|pull (his|her) ear|hit (him|her|them) (back|once|lightly))\b/i },
  // Shaming, labelling or threats inside the words to say.
  { rule: 'shaming_or_threat', re: /\b(bad (boy|girl)|naughty|stupid|lazy|liar|shame on you|i('| wi)ll leave you|police will (come|take)|i don'?t love you|go away)\b/i, fields: ['sayThis'] },
];

// Hindi (Devanagari) and Hinglish. Hindi often negates after the noun ("थप्पड़ न मारें"), so these rules work per
// clause: a clause that also negates the act is compliant. Inherently shaming phrases are flagged regardless.
// Devanagari has no \b, so word edges are "not preceded or followed by a Devanagari letter".
const DEVA = '\\u0900-\\u097F';
const word = (alternatives: string) => new RegExp(`(?<![${DEVA}a-z])(${alternatives})(?![${DEVA}a-z])`, 'i');
// "न"/"na" alone is often a softener ("मारो न" = "hit him, won't you"), so it counts only before the verb ("न मारें").
const NEGATION = word('मत|नहीं|नही|कभी नहीं|बिना|के बजाय|न मार|ना मार|न पीट|mat|nahi|nahin|kabhi nahi|bina|ke bajaye|mana|na maar|na maaro|na maro');
const INDIC_RULES: { rule: string; term: RegExp; needs?: RegExp; negatable: boolean; fields?: string[] }[] = [
  { rule: 'physical_punishment', negatable: true,
    term: word('थप्पड़|थप्पड|चांटा|चाँटा|पिटाई|पीटो|पीटिए|पीटें|मारो|मारिए|मारिये|मारें|मार दो|मार दीजिए|कान खींचो|कान खींचिए|thappad|thappar|chaanta|chanta|pitai|peeto|maaro|maro|maar do|kaan khencho|kaan kheencho') },
  { rule: 'diagnosis', negatable: true,
    term: word('एडीएचडी|ऑटिज़्म|ऑटिज्म|ऑटिस्टिक|डिप्रेशन|अवसाद|डिस्लेक्सिया|ओसीडी|adhd|autism|autistic|depression|dyslexia|ocd'),
    needs: word('है|हैं|हो सकता|हो सकती|हो सकते|लगता|लगती|लगते|लक्षण|hai|hain|ho sakta|ho sakti|lagta|lagti|lakshan') },
  { rule: 'shaming_or_threat', negatable: true, fields: ['sayThis'],
    term: word('बेवकूफ़|बेवकूफ|नालायक|गंदा बच्चा|गंदी बच्ची|बुरा बच्चा|बुरी बच्ची|झूठा|झूठी|आलसी|bewakoof|bevakoof|nalayak|ganda bachcha|gandi bachchi|bura bachcha|buri bachchi|jhootha|jhoothi|aalsi') },
  { rule: 'shaming_or_threat', negatable: false, fields: ['sayThis'],
    term: word('शर्म नहीं आती|शर्म करो|पुलिस आ जाएगी|पुलिस ले जाएगी|छोड़ दूंगी|छोड़ दूँगी|छोड़ दूंगा|छोड़ दूँगा|मैं तुमसे प्यार नहीं|sharam nahi aati|sharam karo|police aa jayegi|police le jayegi|chhod dungi|chhod dunga|main tumse pyaar nahi') },
];
const CLAUSES = /[।|.!?;,\n]+/;
function indicViolations(value: string, field: string): Violation[] {
  const out: Violation[] = [];
  for (const clause of value.split(CLAUSES)) {
    for (const r of INDIC_RULES) {
      if (r.fields && !r.fields.some(f => field === f || field.startsWith(`${f}.`))) continue;
      const m = r.term.exec(clause);
      if (!m || (r.needs && !r.needs.test(clause))) continue;
      if (r.negatable && NEGATION.test(clause)) continue;
      out.push({ rule: r.rule, field, excerpt: clause.trim().slice(0, 120) });
    }
  }
  return out;
}

export function lintAnalysis(a: Record<string, unknown>): Violation[] {
  const out: Violation[] = [];
  const visit = (value: unknown, field: string) => {
    if (Array.isArray(value)) { value.forEach((v, i) => visit(v, `${field}[${i}]`)); return; }
    if (value && typeof value === 'object') { Object.entries(value).forEach(([k, v]) => visit(v, field ? `${field}.${k}` : k)); return; }
    if (typeof value !== 'string') return;
    for (const r of RULES) {
      if (r.fields && !r.fields.some(f => field === f || field.startsWith(`${f}.`))) continue;
      const m = r.re.exec(value);
      if (m) out.push({ rule: r.rule, field, excerpt: value.slice(Math.max(0, m.index - 30), m.index + m[0].length + 30) });
    }
    out.push(...indicViolations(value, field));
  };
  visit(a, '');
  return out;
}

const REPAIR_SYSTEM = `You are the quality critic for a parenting app. You receive a JSON answer and a list of constitution violations. Rewrite ONLY the flagged text so it complies, keeping meaning, tone, language and length:
- diagnosis: never name or imply a condition. Replace with observable patterns and "a paediatrician or child psychologist can help you understand this".
- physical_punishment: remove it; offer a calm, non-physical alternative.
- shaming_or_threat: rewrite the words to say without labels, shame or threats; feeling first, limit second.
If an excerpt is actually compliant (e.g. it tells the parent NOT to spank), keep it unchanged.
Return the full JSON object with every field present.`;

/**
 * A failed repair must never return the unsafe original. Recheck every repaired field.
 */
export async function repairAnalysis<T extends Record<string, unknown>>(
  analysis: T,
  violations: Violation[],
  schema: Record<string, unknown>,
  validator: z.ZodType<T>,
  signal?: AbortSignal,
  call = structuredCall,
): Promise<{ analysis: T; repaired: boolean }> {
  try {
    const fixed = await call({
      model: FAST_MODEL,
      system: REPAIR_SYSTEM,
      user: `<violations>\n${violations.map((v) => `- ${v.rule} in ${v.field}: "${v.excerpt}"`).join('\n')}\n</violations>\n<answer>\n${JSON.stringify(analysis)}\n</answer>`,
      schema,
      validator,
      maxTokens: 6000, signal, timeoutMs: 8000,
    });
    if (lintAnalysis(fixed).length) throw new DecodeError('unsafe', 'Repaired output did not pass checks');
    return { analysis: fixed, repaired: true };
  } catch (error) {
    console.error('[critic] repair withheld', { name: error instanceof Error ? error.name : 'unknown' });
    throw new DecodeError('unsafe', 'We could not verify this guidance. Please try again.');
  }
}
