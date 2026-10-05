import 'server-only';
import { z } from 'zod';
import { structuredCall } from '@/lib/ai/decode';
import type { Child, WeeklyReport } from '@/types';

const reportSchema = z.object({
  headline: z.string().min(1),
  patterns: z.array(z.object({ title: z.string().min(1), detail: z.string().min(1) })).max(4),
  whatsWorking: z.array(z.string().min(1)).max(4),
  tryThisWeek: z.array(z.string().min(1)).min(1).max(3),
  watchFor: z.string(),
  encouragement: z.string().min(1),
});

const REPORT_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['headline', 'patterns', 'whatsWorking', 'tryThisWeek', 'watchFor', 'encouragement'],
  properties: {
    headline: { type: 'string', description: 'One sentence capturing the week, under 15 words.' },
    patterns: {
      type: 'array',
      description: 'Up to 4 patterns actually supported by the entries: triggers, times of day, situations. Empty if the data shows none.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'detail'],
        properties: {
          title: { type: 'string', description: 'Under 6 words.' },
          detail: { type: 'string', description: '1-2 sentences citing what was observed and how often.' },
        },
      },
    },
    whatsWorking: { type: 'array', items: { type: 'string' }, description: 'Approaches the parent rated as working, each in one sentence. Empty if none were rated.' },
    tryThisWeek: { type: 'array', items: { type: 'string' }, description: '1-3 specific, small experiments for next week.' },
    watchFor: { type: 'string', description: 'Only if the entries show signs worth raising with a pediatrician or child psychologist: say what and why, gently. Otherwise an empty string.' },
    encouragement: { type: 'string', description: 'One honest, specific sentence acknowledging the parent\'s effort this week.' },
  },
} as const;

const REPORT_SYSTEM = `You write a weekly pattern report for a parent, from their own notes about one child, the situations they asked Budding about, and whether the suggested approach worked.

Rules:
- Only report patterns the entries actually support. Cite frequency ("3 of 5 evenings"). Never invent detail. With few entries, say less, not more.
- Read across entries: recurring triggers, times of day, transitions, people, places; what changed over the week.
- "What's working" comes only from approaches the parent rated as working or partly working.
- Interpret through the child's age and temperament, in plain language, without diagnosis or labels.
- Raise a concern in watchFor only when the entries genuinely warrant professional input (e.g. persistent regression, withdrawal, sleep or eating severely disrupted, self-harm talk). Otherwise leave it empty.
- Warm, direct, concise. The parent should finish reading in under a minute.`;

export interface ReportInput {
  child: Child;
  periodStart: string;
  periodEnd: string;
  logs: { content: string; log_type: string; created_at: string }[];
  decodes: { scenario: string; say_this: string | null; outcome: string | null; created_at: string }[];
}

function formatDay(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
}

export async function writeWeeklyReport(input: ReportInput): Promise<WeeklyReport> {
  const { child } = input;
  const t = child.temperament;
  const lines = [
    `<child>`,
    `Name: ${child.name}; age: ${child.age.label} (${child.age.stage.replace('-', ' ')})`,
    `Temperament (0-100, parent-reported): sensitivity ${t.sensitivity}, emotional intensity ${t.emotionalIntensity}, flexibility ${t.flexibility}, persistence ${t.persistence}, sociability ${t.sociability}, curiosity ${t.curiosity}`,
    `</child>`,
    `<period>${formatDay(input.periodStart)} to ${formatDay(input.periodEnd)}</period>`,
    `<parent_notes count="${input.logs.length}">`,
    ...input.logs.map((l) => `- [${formatDay(l.created_at)}, ${l.log_type}] ${l.content}`),
    `</parent_notes>`,
    `<situations_asked_about count="${input.decodes.length}">`,
    ...input.decodes.map((d) =>
      `- [${formatDay(d.created_at)}] ${d.scenario}\n  Suggested: ${d.say_this ?? '—'}\n  Parent's verdict: ${d.outcome?.replace(/_/g, ' ') ?? 'not rated'}`,
    ),
    `</situations_asked_about>`,
  ];

  return structuredCall({
    effort: 'medium',
    system: REPORT_SYSTEM,
    user: lines.join('\n'),
    schema: REPORT_JSON_SCHEMA,
    validator: reportSchema,
    maxTokens: 12000,
  });
}
