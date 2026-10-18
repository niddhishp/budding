import { describePatterns } from '@/lib/moments';
import 'server-only';
import { z } from 'zod';
import { FAST_MODEL, MODEL } from '@/lib/ai/llm';
import { CONSTITUTION } from '@/lib/ai/doctrine/constitution';
import { STAGES, stageBandFor } from '@/lib/ai/doctrine/stages';
import { getModule } from '@/lib/ai/doctrine/modules';
import { CARD_IDS, TIER_LABEL, getCard } from '@/lib/ai/doctrine/evidence';
import { checkedCall } from '@/lib/ai/checked-content';
import type { Route } from '@/lib/ai/router';
import type { AgentAnalysis, Child, Memory } from '@/types';

// Back-compat re-exports for report/story/week-guide and routes.
export { structuredCall, DecodeError } from '@/lib/ai/llm';
export const DECODE_MODEL = MODEL;

/*
 * Orchestrator step 2: compose doctrine for THIS child and moment, then generate one answer.
 * Constitution (stable, system) + stage band + routed modules + allowed evidence cards + memory
 * (per-request, user turn) → one complete structured response → safety check → saved result.
 */

// ─── Output contract ─────────────────────────────────────────────────────────

const generatedSchema = z.object({
  rightNow: z.string(),
  sayThis: z.string().min(1),
  doThis: z.array(z.string().min(1)).min(1).max(5),
  avoid: z.string().min(1),
  hypotheses: z.array(z.object({ text: z.string().min(1), likelihood: z.enum(['most likely', 'possible', 'less likely']) })).min(1).max(3),
  emotionalNeed: z.string().min(1),
  afterwards: z.string().min(1),
  watchFor: z.string(),
  seekHelpIf: z.string(),
  skillBeingBuilt: z.string().min(1),
  developmentalContext: z.string().min(1),
  whyItWorks: z.string().min(1),
  evidenceIds: z.array(z.string()).max(3),
});
type Generated = z.infer<typeof generatedSchema>;

// The response puts the immediate parenting steps before explanation.
const GENERATED_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['rightNow', 'sayThis', 'doThis', 'avoid', 'hypotheses', 'emotionalNeed', 'afterwards', 'watchFor', 'seekHelpIf', 'skillBeingBuilt', 'developmentalContext', 'whyItWorks', 'evidenceIds'],
  properties: {
    rightNow: { type: 'string', description: 'If the moment is happening now: ONE calm instruction for this second, under 20 words (safety first). Otherwise an empty string.' },
    sayThis: { type: 'string', description: 'Exact words the parent says to the child, spoken style, sized to the stage band. 1-3 short sentences.' },
    doThis: { type: 'array', items: { type: 'string' }, description: '2-4 concrete actions for the next few minutes, each under 20 words, in order.' },
    avoid: { type: 'string', description: 'The single most likely mistake to avoid with THIS child, and why, in one sentence.' },
    hypotheses: {
      type: 'array',
      description: '2-3 possibilities for what is going on, ranked, each tied to age, temperament or history. One sentence each.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['text', 'likelihood'],
        properties: {
          text: { type: 'string' },
          likelihood: { type: 'string', enum: ['most likely', 'possible', 'less likely'] },
        },
      },
    },
    emotionalNeed: { type: 'string', description: 'The need underneath the behaviour, under 8 words.' },
    afterwards: { type: 'string', description: 'What to do or teach later, once everyone is calm. 1-2 sentences.' },
    watchFor: { type: 'string', description: 'What to notice over the coming days that would tell the parent more. One sentence. Empty if not useful.' },
    seekHelpIf: { type: 'string', description: 'Concrete signs that mean talking to a paediatrician or child psychologist, and the words to describe it. Empty for ordinary everyday moments.' },
    skillBeingBuilt: { type: 'string', description: 'The skill this moment builds, under 6 words.' },
    developmentalContext: { type: 'string', description: 'Why this is expected at this stage. 1-2 sentences, no invented facts.' },
    whyItWorks: { type: 'string', description: 'Why the suggested approach works, in one or two plain sentences, consistent with the cited evidence.' },
    evidenceIds: { type: 'array', items: { type: 'string', enum: CARD_IDS }, description: '0-3 evidence card ids that genuinely support this answer. Only ids from the allowed list.' },
  },
} as const;

// ─── Context ─────────────────────────────────────────────────────────────────

export interface DecodeContext {
  child: Child;
  recentLogs: { content: string; log_type: string; created_at: string }[];
  pastDecodes: { scenario: string; say_this: string | null; outcome: string | null; created_at: string }[];
  memories?: Pick<Memory, 'kind' | 'content' | 'source' | 'confidence'>[];
  continuation?: { id: string; scenario: string; sayThis: string; outcome: string | null; createdAt: string }[];
}

const PROVENANCE: Record<string, string> = {
  parent_said: 'parent said',
  decode_outcome: 'parent reported outcome',
  log: 'parent logged',
  ai_inferred: 'inferred',
};

function composeUserTurn(scenario: string, ctx: DecodeContext, route: Route) {
  const { child, recentLogs, pastDecodes, memories = [] } = ctx;
  const stageBand = stageBandFor(child.age);
  const stage = STAGES[stageBand];
  const age = child.age.stage === 'pregnancy'
    ? `not yet born (pregnancy week ${child.age.pregnancyWeek})`
    : `${child.age.years} years ${child.age.months} months`;

  const modules = route.modules.map(getModule).filter((m): m is NonNullable<typeof m> => !!m);
  const cardIds = [...new Set(modules.flatMap((m) => m.cards))];

  const lines: string[] = [];

  lines.push(`<stage band="${stage.label}">`,
    `Developmental engine: ${stage.engine}.`,
    `Typical at this stage: ${stage.typical}.`,
    `Guidance posture: ${stage.posture}.`,
    `Words to the child: ${stage.scriptStyle}.`,
    `</stage>`);

  for (const m of modules) {
    lines.push(`<module name="${m.label}">`,
      ...m.principles.map((p) => `- ${p}`),
      `Avoid: ${m.avoid.join('; ')}.`,
      ...(m.escalate ? [`Escalate: ${m.escalate}`] : []),
      `</module>`);
  }

  lines.push(`<allowed_evidence>`,
    ...cardIds.map((id) => getCard(id)).filter(Boolean).map((c) => `- ${c!.id} [${TIER_LABEL[c!.tier]}]: ${c!.claim} (${c!.source})`),
    `</allowed_evidence>`);

  lines.push(`<child>`,
    `Name: ${child.name}`,
    `Age: ${age}`,
    describePatterns(child),
    child.focusAreas.length ? `What the parent wants help with lately: ${child.focusAreas.join(', ')}.` : '',
    child.household.length ? `Household / caregivers: ${child.household.join(', ')}.` : '',
    child.homeLanguages.length ? `Languages at home: ${child.homeLanguages.join(', ')}.` : '',
    child.profileNotes ? `Parent's note: ${child.profileNotes}` : '',
    `</child>`);

  if (memories.length) {
    lines.push(`<what_kahiye_remembers>`,
      ...memories.map((m) => `- [${m.kind.replace('_', ' ')}; ${PROVENANCE[m.source] ?? m.source}${m.source === 'ai_inferred' ? `, confidence ${Math.round(m.confidence * 100)}%` : ''}] ${m.content}`),
      `</what_kahiye_remembers>`);
  }

  if (recentLogs.length) {
    lines.push(`<recent_observations>`, ...recentLogs.map((l) => `- [${l.created_at.slice(0, 10)}, ${l.log_type}] ${l.content}`), `</recent_observations>`);
  }

  const rated = pastDecodes.filter((d) => d.outcome);
  if (rated.length) {
    lines.push(`<what_has_worked_before>`,
      ...rated.map((d) => `- Situation: ${d.scenario}\n  Said: ${d.say_this ?? '—'}\n  Parent's verdict: ${d.outcome!.replace(/_/g, ' ')}`),
      `</what_has_worked_before>`);
  }

  if (ctx.continuation?.length) {
    lines.push('<parent_selected_earlier_moments>',
      'The parent deliberately continued this situation. These are historical observations, not current facts. Current confirmed memories and the new update take precedence. A past suggestion is not evidence that it worked. Do not infer improvement without an outcome.',
      ...ctx.continuation.map(d => `- [${d.createdAt.slice(0, 10)}] ${d.scenario}\n  Suggested: ${d.sayThis}\n  Parent feedback: ${d.outcome ?? 'not rated'}`),
      '</parent_selected_earlier_moments>');
  }

  lines.push(`<routing mode="${route.mode}" parent_goal="${route.goal}" />`);
  if (route.clarify) {
    lines.push(`<open_question>The parent will also be asked: "${route.clarify.question}". Give your best answer now without waiting for it.</open_question>`);
  }
  lines.push(`<parent_message>\n${scenario}\n</parent_message>`);

  return lines.filter(Boolean).join('\n');
}

// ─── Generation ──────────────────────────────────────────────────────────────

function toAnalysis(g: Generated, route: Route): AgentAnalysis {
  const evidence = [...new Set(g.evidenceIds)]
    .map((id) => getCard(id))
    .filter((c): c is NonNullable<typeof c> => !!c)
    .map((c) => ({ id: c.id, tier: c.tier, label: TIER_LABEL[c.tier], claim: c.claim, source: c.source }));
  return {
    rightNow: g.rightNow.trim(),
    sayThis: g.sayThis,
    doThis: g.doThis,
    avoid: g.avoid,
    hypotheses: g.hypotheses,
    interpretation: g.hypotheses[0]?.text ?? '',
    emotionalNeed: g.emotionalNeed,
    afterwards: g.afterwards,
    watchFor: g.watchFor.trim(),
    seekHelpIf: g.seekHelpIf.trim(),
    skillBeingBuilt: g.skillBeingBuilt,
    developmentalContext: g.developmentalContext,
    whyItWorks: g.whyItWorks,
    evidence,
    clarify: route.clarify,
    modules: route.modules,
  };
}

/**
 * Generates and checks the complete decode before returning any parenting text.
 */
export async function decodeBehavior(
  scenario: string,
  ctx: DecodeContext,
  route: Route,
  _onText: (delta: string) => void = () => {},
  signal?: AbortSignal,
): Promise<{ analysis: AgentAnalysis; violations: string[]; repaired: boolean }> {
  void _onText; // Legacy callback retained for callers; unchecked text is never emitted.
  const generated = await checkedCall({
    system: CONSTITUTION, user: composeUserTurn(scenario, ctx, route),
    schema: GENERATED_JSON_SCHEMA, validator: generatedSchema,
    maxTokens: 6000, signal, additionalContent: route.clarify,
  });
  // No raw token callback: only complete, checked content may leave this module.
  return { analysis: toAnalysis(generated, route), violations: [], repaired: false };
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
  signal?: AbortSignal;
}): Promise<string> {
  const { message } = await checkedCall({
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
    maxTokens: 3000, signal: opts.signal,
  });
  return message;
}
