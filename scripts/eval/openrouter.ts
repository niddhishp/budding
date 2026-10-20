/** Evaluation-only transport. Never loaded by application routes; synthetic fixtures only. */
import { DecodeError, MODEL, type StructuredOpts } from '../../src/lib/ai/llm';

type Price = { prompt: number; completion: number };
export interface CallRecord {
  model: string; ms: number; reservedUsd: number;
  inputTokens?: number; outputTokens?: number; costUsd?: number; outcome: string;
  /** Synthetic-only internal candidate, before the application's content check. */
  candidate?: unknown;
  httpStatus?: number;
  errorType?: string;
}
export const MODEL_IDS: Record<string, string> = {
  'claude-opus-5-5': 'anthropic/claude-opus-5.5',
  'claude-haiku-4-5': 'anthropic/claude-haiku-4.5',
};

export class OpenRouterEval {
  readonly calls: CallRecord[] = [];
  reservedUsd = 0;
  constructor(
    private key: string,
    private prices: Map<string, Price>,
    readonly budgetUsd: number,
    readonly maxRequests: number,
    private request: typeof fetch = fetch,
  ) {
    if (!key || !Number.isFinite(budgetUsd) || budgetUsd <= 0 || !Number.isInteger(maxRequests) || maxRequests < 1) {
      throw Error('A key and positive finite evaluation limits are required.');
    }
  }

  static async connect(key: string, models: string[], budgetUsd: number, maxRequests: number) {
    const response = await fetch('https://openrouter.ai/api/v1/models', { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw Error(`Model catalogue unavailable (${response.status}).`);
    const catalogue = await response.json() as { data: { id: string; pricing: { prompt: string; completion: string }; supported_parameters: string[] }[] };
    const prices = new Map<string, Price>();
    for (const name of models) {
      const id = MODEL_IDS[name] ?? name;
      const model = catalogue.data.find(m => m.id === id);
      if (!model?.supported_parameters.includes('structured_outputs')) throw Error(`Structured outputs unavailable for ${id}.`);
      const price = { prompt: Number(model.pricing.prompt), completion: Number(model.pricing.completion) };
      if (!Object.values(price).every(p => Number.isFinite(p) && p >= 0)) throw Error(`Invalid catalogue pricing for ${id}.`);
      prices.set(id, price);
    }
    return new OpenRouterEval(key, prices, budgetUsd, maxRequests);
  }

  call = async <T>(opts: StructuredOpts<T>): Promise<T> => {
    const model = MODEL_IDS[opts.model ?? MODEL] ?? opts.model ?? MODEL;
    const price = this.prices.get(model);
    if (!price) throw Error(`Model not approved for this evaluation: ${model}`);
    const body = {
      model,
      messages: [{ role: 'system', content: opts.system }, { role: 'user', content: opts.user }],
      max_tokens: opts.maxTokens,
      response_format: { type: 'json_schema', json_schema: { name: 'kahiye_eval', strict: true, schema: opts.schema } },
      provider: {
        require_parameters: true, data_collection: 'deny', allow_fallbacks: false,
        max_price: { prompt: price.prompt * 1_000_000, completion: price.completion * 1_000_000 },
      },
      ...(model.includes('haiku') ? {} : { reasoning: { effort: opts.effort ?? 'low' } }),
      stream: false,
    };
    // Conservative byte-based reservation, including schema/wrapper overhead. Not an invoice:
    // enforce the external key's credit cap too. Keep reservations even after errors/timeouts.
    const reservedUsd = (Buffer.byteLength(JSON.stringify(body), 'utf8') + 2048) * price.prompt + opts.maxTokens * price.completion;
    if (this.calls.length >= this.maxRequests || this.reservedUsd + reservedUsd > this.budgetUsd) {
      throw Error('Evaluation request/spend reservation limit reached.');
    }
    this.reservedUsd += reservedUsd;
    const record: CallRecord = { model, ms: 0, reservedUsd, outcome: 'started' };
    this.calls.push(record);
    const started = Date.now();
    try {
      const timeout = AbortSignal.timeout(opts.timeoutMs ?? 35_000);
      const signal = opts.signal ? AbortSignal.any([opts.signal, timeout]) : timeout;
      const response = await this.request('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST', signal,
        headers: { Authorization: `Bearer ${this.key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      record.httpStatus = response.status;
      if (!response.ok) throw Error(`OpenRouter request failed (${response.status}).`);
      const data = await response.json() as {
        error?: unknown;
        choices?: { finish_reason?: string; message?: { content?: string; refusal?: string } }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number };
      };
      record.inputTokens = data.usage?.prompt_tokens;
      record.outputTokens = data.usage?.completion_tokens;
      record.costUsd = data.usage?.cost;
      if (data.error) throw Error('OpenRouter returned a provider error.');
      const choice = data.choices?.[0];
      if (choice?.finish_reason === 'length') throw new DecodeError('truncated', 'The response was cut off.');
      if (choice?.finish_reason === 'content_filter' || choice?.message?.refusal) throw new DecodeError('refused', 'The model declined this request.');
      if (!choice?.message?.content) throw new DecodeError('empty', 'The model returned no text.');
      const parsed = opts.validator.parse(JSON.parse(choice.message.content));
      record.candidate = parsed;
      record.outcome = 'validated';
      return parsed;
    } catch (error) {
      record.outcome = error instanceof DecodeError ? error.code : 'error';
      record.errorType = error instanceof Error ? error.name : 'unknown';
      throw error;
    } finally { record.ms = Date.now() - started; }
  };
}
