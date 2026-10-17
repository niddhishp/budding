import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import type { z } from 'zod';

export type Effort = 'low' | 'medium' | 'high';

// The decode is the product: it gets the main model. Routing, safety, critique, memory and
// message rewriting are narrower tasks and run on BUDDING_FAST_MODEL (defaults to the main one).
export const MODEL = process.env.BUDDING_MODEL || 'claude-opus-5-5';
export const FAST_MODEL = process.env.BUDDING_FAST_MODEL || MODEL;
// Decodes are read mid-meltdown: favour latency. Raise via env once evals show headroom.
const EFFORT = (process.env.BUDDING_EFFORT || 'low') as Effort;

// Haiku 4.5 rejects `effort` and is not a server-side-fallback model; omit both for it.
const supportsEffortAndFallbacks = (model: string) => !model.startsWith('claude-haiku');

let client: Anthropic | null = null;
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

export class DecodeError extends Error {
  constructor(public code: 'refused' | 'truncated' | 'empty' | 'timeout', message: string) {
    super(message);
  }
}

export interface StructuredOpts<T> {
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

function firstText(content: Anthropic.Beta.BetaContentBlock[]) {
  for (const block of content) if (block.type === 'text') return block.text;
  return null;
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
export async function structuredStream<T>(opts: StructuredOpts<T>, onText: (delta: string) => void): Promise<T> {
  const stream = getClient().beta.messages.stream(requestParams(opts));
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') onText(event.delta.text);
  }
  return parseFinal(await stream.finalMessage(), opts.validator);
}

/** Resolve within `ms` or reject with a timeout DecodeError. */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new DecodeError('timeout', `Timed out after ${ms}ms`)), ms)),
  ]);
}
