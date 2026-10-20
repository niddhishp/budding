import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COHORT_DEFINITIONS, COHORT_METRICS, METRIC_DEFINITIONS, SUMMARY_METRICS, formatMetric } from '../src/lib/outcome-metrics';

test('every outcome metric has a plain label and a one-line definition', () => {
  for (const key of [...SUMMARY_METRICS, 'plus_subscribers' as const]) {
    const entry = METRIC_DEFINITIONS[key];
    assert.ok(entry.label.length > 2, key);
    assert.ok(entry.definition.length > 10 && !entry.definition.includes('\n'), key);
  }
  for (const key of COHORT_METRICS) assert.ok(COHORT_DEFINITIONS[key].label, key);
});

test('suppressed cells stay suppressed and never become numbers', () => {
  assert.equal(formatMetric('<5', 'count'), '<5');
  assert.equal(formatMetric('<5', 'percent'), '<5');
  assert.equal(formatMetric(null, 'percent'), '—');
  assert.equal(formatMetric(undefined, 'count'), '—');
  assert.equal(formatMetric(0.536, 'percent'), '53.6%');
  assert.equal(formatMetric(1, 'percent'), '100%');
  assert.equal(formatMetric(2.25, 'decimal'), '2.25');
  assert.equal(formatMetric(12345, 'count'), '12,345');
});
