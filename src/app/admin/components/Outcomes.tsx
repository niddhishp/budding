'use client';
import { COHORT_DEFINITIONS, COHORT_METRICS, METRIC_DEFINITIONS, formatMetric, type OutcomeMetrics, type SummaryMetric } from '@/lib/outcome-metrics';
import { Heading, LoadState, formatTime, useRemote } from './shared';

const GROUPS: { title: string; metrics: SummaryMetric[] }[] = [
  { title: 'Families', metrics: ['registered_families', 'first_guidance_families', 'matured_14_day', 'matured_30_day'] },
  { title: 'Activation and return', metrics: ['activated', 'activation_rate', 'second_moment_rate', 'return_30_day_rate'] },
  { title: 'Feedback', metrics: ['feedback_rate', 'outcome_worked', 'outcome_partly', 'outcome_did_not_work'] },
  { title: 'Sharing and Handbook', metrics: ['share_rate', 'handbook_tried'] },
  { title: 'Chat and practice', metrics: ['conversations', 'messages_per_conversation'] },
  { title: 'Plus', metrics: ['paid_conversion'] },
];
const weekLabel = (value: string) => new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));

export function ParentOutcomes() {
  const remote = useRemote<OutcomeMetrics>('/api/admin/outcomes');
  const data = remote.data;
  return <>
    <Heading eyebrow="Evidence, not anecdotes" title="Parent outcomes" description="Aggregate counts only. No family, child, name or question is shown, and nothing here can be opened further. Any figure based on fewer than five families shows as <5." />
    <LoadState {...remote} />
    {data && <>
      <section aria-label="Current state" className="border-y border-border divide-y sm:divide-y-0 sm:divide-x sm:grid sm:grid-cols-2 mb-10">
        {(['registered_families', 'plus_subscribers'] as const).map(key => <div key={key} className="py-6 sm:px-6 first:pl-0">
          <span className="block text-sm mb-2">{METRIC_DEFINITIONS[key].label} now</span>
          <strong className="font-heading font-normal text-4xl">{formatMetric(data.current[key], 'count')}</strong>
          <span className="block text-xs text-muted-foreground mt-3">{METRIC_DEFINITIONS[key].definition}</span>
        </div>)}
      </section>
      {GROUPS.map(group => <section key={group.title} className="mb-10">
        <h2 className="font-heading text-2xl mb-4">{group.title}</h2>
        <table className="w-full text-sm border-t border-border">
          <thead><tr className="text-left text-muted-foreground"><th scope="col" className="py-3 pr-4 font-normal">Metric</th><th scope="col" className="py-3 px-3 font-normal text-right whitespace-nowrap">All time</th><th scope="col" className="py-3 pl-3 font-normal text-right whitespace-nowrap">Last 30 days</th></tr></thead>
          <tbody>{group.metrics.map(key => <tr key={key} className="border-t border-border align-top">
            <th scope="row" className="py-4 pr-4 text-left font-normal"><span className="block font-semibold">{METRIC_DEFINITIONS[key].label}</span><span className="block text-xs text-muted-foreground mt-1 leading-relaxed">{METRIC_DEFINITIONS[key].definition}</span></th>
            <td className="py-4 px-3 text-right tabular-nums whitespace-nowrap">{formatMetric(data.periods.all_time[key], METRIC_DEFINITIONS[key].format)}</td>
            <td className="py-4 pl-3 text-right tabular-nums whitespace-nowrap">{formatMetric(data.periods.last_30_days[key], METRIC_DEFINITIONS[key].format)}</td>
          </tr>)}</tbody>
        </table>
      </section>)}
      <section className="mb-10">
        <h2 className="font-heading text-2xl mb-2">Weekly cohorts</h2>
        <p className="text-sm text-muted-foreground mb-4 max-w-2xl">Families grouped by the India-time week (from Monday) of their first ordinary guidance, newest first. Rates use only families who have had the full 14 or 30 days, so recent weeks fill in over time.</p>
        <div className="overflow-x-auto"><table className="w-full text-sm border-t border-border min-w-[720px]">
          <thead><tr className="text-left text-muted-foreground"><th scope="col" className="py-3 pr-4 font-normal">Week of</th>{COHORT_METRICS.map(key => <th key={key} scope="col" className="py-3 px-3 font-normal text-right">{COHORT_DEFINITIONS[key].label}</th>)}</tr></thead>
          <tbody>{data.weekly.map(week => <tr key={week.week_start} className="border-t border-border">
            <th scope="row" className="py-3 pr-4 text-left font-normal whitespace-nowrap">{weekLabel(week.week_start)}</th>
            {COHORT_METRICS.map(key => <td key={key} className="py-3 px-3 text-right tabular-nums">{formatMetric(week[key], COHORT_DEFINITIONS[key].format)}</td>)}
          </tr>)}</tbody>
        </table></div>
      </section>
      <p className="text-sm text-muted-foreground border-t pt-5">Calculated {formatTime(data.generated_at)}. “—” means there is nothing to divide by yet. Definitions and limits: docs/PARENT-OUTCOME-METRICS.md. <button className="underline ml-2" onClick={remote.reload}>Refresh</button></p>
    </>}
  </>;
}
