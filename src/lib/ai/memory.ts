import 'server-only';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { FAST_MODEL, structuredCall } from '@/lib/ai/llm';
import type { AgentAnalysis, DecodeOutcome, MemoryKind } from '@/types';

/*
 * Memory agent. Runs after the parent has their answer (never on the hot path).
 * Write gate: only durable, useful facts about this child/family; one-off events are not memories.
 * Every memory carries provenance (who said it) and confidence; parents can see and delete all of it.
 */

const extractSchema = z.object({
  memories: z.array(z.object({
    kind: z.enum(['fact', 'observation', 'pattern', 'preference', 'milestone', 'joy']),
    content: z.string().min(3).max(240),
    source: z.enum(['parent_said', 'ai_inferred']),
    confidence: z.number().min(0).max(1),
    sensitive: z.boolean(),
  })).max(4),
});

const EXTRACT_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['memories'],
  properties: {
    memories: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['kind', 'content', 'source', 'confidence', 'sensitive'],
        properties: {
          kind: { type: 'string', enum: ['fact', 'observation', 'pattern', 'preference', 'milestone', 'joy'] },
          content: { type: 'string', description: 'One short, neutral sentence in English, about the child or family. No labels.' },
          source: { type: 'string', enum: ['parent_said', 'ai_inferred'] },
          confidence: { type: 'number', description: '1.0 for things the parent stated; 0.3-0.7 for inferences.' },
          sensitive: { type: 'boolean', description: 'True for health, diagnosis claims, abuse, sexuality, religion/caste, or family conflict details.' },
        },
      },
    },
  },
} as const;

const EXTRACT_SYSTEM = `You maintain a parenting app's memory about one child. From the parent's message, propose at most 4 memories worth keeping for future advice.

Write gate — keep ONLY:
- durable facts (siblings, school, who lives at home, routines, languages, activities): kind "fact", source "parent_said";
- recurring patterns the parent describes ("every evening", "always when…"): kind "pattern";
- clear preferences (what calms the child, what they love): kind "preference";
- milestones and happy moments: kind "milestone" / "joy".
Do NOT keep one-off events ("today he threw a cup"), anything already in <already_known>, guesses about diagnoses, or judgements about the child's character.
Inferences are allowed only when strongly implied; mark them "ai_inferred" with confidence ≤ 0.7.
Return an empty list when nothing qualifies — that is the common case.`;

export async function extractMemories(opts: {
  message: string;
  childName: string;
  known: string[];
}): Promise<z.infer<typeof extractSchema>['memories']> {
  try {
    const { memories } = await structuredCall({
      model: FAST_MODEL,
      system: EXTRACT_SYSTEM,
      user: [
        `<child>${opts.childName}</child>`,
        `<already_known>`, ...opts.known.map((k) => `- ${k}`), `</already_known>`,
        `<parent_message>\n${opts.message}\n</parent_message>`,
      ].join('\n'),
      schema: EXTRACT_JSON_SCHEMA,
      validator: extractSchema,
      maxTokens: 1500,
    });
    return memories;
  } catch (error) {
    console.error('[memory] extraction failed', error);
    return [];
  }
}

/** Extract and store memories from a decode. `db` may be the user-scoped or admin client. */
export async function rememberFromDecode(db: SupabaseClient, opts: {
  userId: string;
  childId: string;
  childName: string;
  decodeId: string;
  message: string;
}) {
  const { data: existing } = await db
    .from('memories')
    .select('content')
    .eq('child_id', opts.childId)
    .eq('archived', false)
    .order('created_at', { ascending: false })
    .limit(40);
  const known = (existing ?? []).map((m) => m.content as string);

  const memories = await extractMemories({ message: opts.message, childName: opts.childName, known });
  const fresh = memories.filter((m) => !known.some((k) => k.toLowerCase() === m.content.toLowerCase()));
  if (!fresh.length) return;

  const { error } = await db.from('memories').insert(fresh.map((m) => ({
    child_id: opts.childId,
    user_id: opts.userId,
    kind: m.kind,
    content: m.content,
    source: m.source,
    confidence: m.source === 'parent_said' ? 1 : Math.min(m.confidence, 0.7),
    sensitive: m.sensitive,
    decode_id: opts.decodeId,
  })));
  if (error) console.error('[memory] insert failed', error.message);
}

/** Deterministic: an outcome rating becomes a "what worked / what didn't" memory. No model call. */
export async function rememberOutcome(db: SupabaseClient, opts: {
  userId: string;
  childId: string;
  decodeId: string;
  scenario: string;
  analysis: AgentAnalysis | null;
  outcome: DecodeOutcome;
}) {
  if (!opts.analysis?.sayThis) return;
  const kind: MemoryKind = opts.outcome === 'did_not_work' ? 'what_didnt' : 'what_worked';
  const situation = opts.scenario.length > 90 ? `${opts.scenario.slice(0, 87)}…` : opts.scenario;
  const verdict = opts.outcome === 'partly' ? ' (partly)' : '';
  const content = `${situation} → "${opts.analysis.sayThis}"${verdict}`.slice(0, 480);

  // One outcome memory per decode: replace if the parent changes their rating.
  await db.from('memories').delete().eq('decode_id', opts.decodeId).in('kind', ['what_worked', 'what_didnt']);
  const { error } = await db.from('memories').insert({
    child_id: opts.childId,
    user_id: opts.userId,
    kind,
    content,
    source: 'decode_outcome',
    confidence: 1,
    sensitive: false,
    decode_id: opts.decodeId,
  });
  if (error) console.error('[memory] outcome insert failed', error.message);
}
