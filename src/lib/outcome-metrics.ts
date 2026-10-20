// Parent outcome metrics: aggregate-only evidence. Definitions match
// supabase/027_parent_outcome_metrics.sql and docs/PARENT-OUTCOME-METRICS.md.
// A cell is a number, null (no denominator) or "<5" (fewer than five families).
export type MetricCell = number | null | '<5';

export const SUMMARY_METRICS = [
  'registered_families', 'first_guidance_families', 'activated', 'activation_rate', 'second_moment_rate',
  'return_30_day_rate', 'feedback_rate', 'outcome_worked', 'outcome_partly', 'outcome_did_not_work',
  'share_rate', 'handbook_tried', 'conversations', 'messages_per_conversation', 'paid_conversion',
  'matured_14_day', 'matured_30_day',
] as const;
export type SummaryMetric = typeof SUMMARY_METRICS[number];
export const COHORT_METRICS = [
  'first_guidance_families', 'activated', 'activation_rate', 'second_moment_rate', 'return_30_day_rate', 'share_rate',
  'matured_14_day', 'matured_30_day',
] as const;
export type CohortMetric = typeof COHORT_METRICS[number];

export interface OutcomeMetrics {
  generated_at: string;
  minimum_families: number;
  current: { registered_families: MetricCell; plus_subscribers: MetricCell };
  periods: Record<'all_time' | 'last_30_days', Record<SummaryMetric, MetricCell>>;
  weekly: Array<{ week_start: string } & Record<CohortMetric, MetricCell>>;
}

type Format = 'count' | 'percent' | 'decimal';
export const METRIC_DEFINITIONS: Record<SummaryMetric | 'plus_subscribers', { label: string; definition: string; format: Format }> = {
  registered_families: { label: 'Registered families', format: 'count', definition: 'Parents with current consent, by first consent date.' },
  plus_subscribers: { label: 'Plus subscribers', format: 'count', definition: 'Registered families with paid access right now (a captured charge whose paid period has not ended).' },
  paid_conversion: { label: 'Free to paid', format: 'percent', definition: 'Registered families in the period who have ever had a captured Plus charge.' },
  first_guidance_families: { label: 'Families with first guidance', format: 'count', definition: 'Families whose first ordinary guidance request (not chat, practice or a safety answer) falls in the period.' },
  matured_14_day: { label: 'Had 14 days', format: 'count', definition: 'Of those, families whose first guidance is at least 14 days old: the base for 14-day rates.' },
  matured_30_day: { label: 'Had 30 days', format: 'count', definition: 'Of those, families whose first guidance is at least 30 days old: the base for the 30-day return.' },
  activated: { label: 'Activated', format: 'count', definition: 'Recorded worked, partly or didn’t work on ordinary guidance within 14 days of their first guidance.' },
  activation_rate: { label: 'Activation rate', format: 'percent', definition: 'Activated families as a share of families who have had 14 days.' },
  second_moment_rate: { label: 'Second moment within 14 days', format: 'percent', definition: 'Families who made a second ordinary guidance request within 14 days of the first, of those who have had 14 days.' },
  return_30_day_rate: { label: '30-day return', format: 'percent', definition: 'Families with any Ask activity 1–30 days after first guidance, of those who have had 30 days.' },
  feedback_rate: { label: 'Feedback rate', format: 'percent', definition: 'Ordinary guidance answers created in the period that have an outcome recorded.' },
  outcome_worked: { label: 'Worked', format: 'percent', definition: 'Share of rated answers in the period marked worked.' },
  outcome_partly: { label: 'Partly', format: 'percent', definition: 'Share of rated answers in the period marked partly.' },
  outcome_did_not_work: { label: 'Didn’t work', format: 'percent', definition: 'Share of rated answers in the period marked didn’t work.' },
  share_rate: { label: 'Caregiver shares per activated family', format: 'decimal', definition: 'Completed caregiver shares made by activated families, divided by activated families.' },
  handbook_tried: { label: 'Handbook conversations tried', format: 'count', definition: 'Handbook cards marked tried, by the card’s last update date. A count only.' },
  conversations: { label: 'Chat and practice conversations', format: 'count', definition: 'Chat or practice conversations started in the period. Never part of activation.' },
  messages_per_conversation: { label: 'Messages per conversation', format: 'decimal', definition: 'Average messages in those conversations, following each reply chain.' },
};

export function formatMetric(value: MetricCell | undefined, format: Format) {
  if (value === '<5') return '<5';
  if (value === null || value === undefined || typeof value !== 'number' || !Number.isFinite(value)) return '—';
  if (format === 'percent') return `${Math.round(value * 1000) / 10}%`;
  if (format === 'decimal') return value.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  return value.toLocaleString('en-IN');
}

export const COHORT_DEFINITIONS: Record<CohortMetric, { label: string; format: Format }> = {
  first_guidance_families: { label: 'Families', format: 'count' },
  matured_14_day: { label: 'Had 14 days', format: 'count' },
  matured_30_day: { label: 'Had 30 days', format: 'count' },
  activated: { label: 'Activated', format: 'count' },
  activation_rate: { label: 'Activation', format: 'percent' },
  second_moment_rate: { label: 'Second moment', format: 'percent' },
  return_30_day_rate: { label: '30-day return', format: 'percent' },
  share_rate: { label: 'Shares / activated', format: 'decimal' },
};
