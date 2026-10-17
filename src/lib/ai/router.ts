import 'server-only';
import { z } from 'zod';
import { FAST_MODEL, structuredCall, withTimeout } from '@/lib/ai/llm';
import { MODULES, MODULE_IDS, keywordRoute } from '@/lib/ai/doctrine/modules';
import type { StageBand } from '@/lib/ai/doctrine/stages';

/*
 * Orchestrator step 1: decide which doctrine modules apply, whether the moment is happening now,
 * what the parent actually wants, and whether ONE question would materially change the advice.
 * Fast model, hard timeout, keyword fallback: routing must never block a parent.
 */

export type Mode = 'right_now' | 'planning' | 'understanding';
export type Goal = 'safety' | 'calm_now' | 'cooperation' | 'routine' | 'skill' | 'connection' | 'understanding';

export interface Route {
  modules: string[];
  mode: Mode;
  goal: Goal;
  clarify: { question: string; options: string[] } | null;
  source: 'router' | 'fallback';
}

const routeSchema = z.object({
  modules: z.array(z.enum(MODULE_IDS as [string, ...string[]])).min(1).max(3),
  mode: z.enum(['right_now', 'planning', 'understanding']),
  goal: z.enum(['safety', 'calm_now', 'cooperation', 'routine', 'skill', 'connection', 'understanding']),
  clarifyNeeded: z.boolean(),
  clarifyQuestion: z.string(),
  clarifyOptions: z.array(z.string()).max(4),
});

const ROUTE_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['modules', 'mode', 'goal', 'clarifyNeeded', 'clarifyQuestion', 'clarifyOptions'],
  properties: {
    modules: { type: 'array', items: { type: 'string', enum: MODULE_IDS }, description: '1-3 most relevant module ids, most important first.' },
    mode: { type: 'string', enum: ['right_now', 'planning', 'understanding'], description: 'right_now if the moment is happening now or just happened; planning if they want a plan for next time; understanding if they want to understand a pattern.' },
    goal: { type: 'string', enum: ['safety', 'calm_now', 'cooperation', 'routine', 'skill', 'connection', 'understanding'], description: 'What the parent most needs, which may differ from what they literally asked.' },
    clarifyNeeded: { type: 'boolean', description: 'True ONLY if one unknown would materially change the advice (e.g. whether it happens every day or once; whether the child is hurting someone). False for most messages.' },
    clarifyQuestion: { type: 'string', description: 'The single highest-information question, under 15 words, in the parent\'s language. Empty if not needed.' },
    clarifyOptions: { type: 'array', items: { type: 'string' }, description: '2-4 short tap-able answers. Empty if not needed.' },
  },
} as const;

const MODULE_MENU = MODULES.map((m) => `- ${m.id}: ${m.when}`).join('\n');

const ROUTER_SYSTEM = `You route a parent's message to the right parenting doctrine modules. You do not answer the parent.

Modules:
${MODULE_MENU}

Pick 1-3 modules, most important first. Ask a clarifying question only when its answer would change the advice substantially; most messages need none.`;

export async function routeMessage(message: string, stage: StageBand, childName: string): Promise<Route> {
  try {
    const r = await withTimeout(structuredCall({
      model: FAST_MODEL,
      system: ROUTER_SYSTEM,
      user: `<child stage="${stage}" name="${childName}" />\n<message>\n${message}\n</message>`,
      schema: ROUTE_JSON_SCHEMA,
      validator: routeSchema,
      maxTokens: 1200,
    }), 4000);
    const clarify = r.clarifyNeeded && r.clarifyQuestion.trim() && r.clarifyOptions.length >= 2
      ? { question: r.clarifyQuestion.trim(), options: r.clarifyOptions.slice(0, 4) }
      : null;
    return { modules: [...new Set(r.modules)], mode: r.mode, goal: r.goal, clarify, source: 'router' };
  } catch (error) {
    console.error('[router] falling back to keywords', error instanceof Error ? error.message : error);
    return { modules: keywordRoute(message), mode: 'right_now', goal: 'calm_now', clarify: null, source: 'fallback' };
  }
}
