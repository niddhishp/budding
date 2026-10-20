import { completeGuidance, failGuidance, guidanceErrorResponse, reserveGuidance, type Reservation } from '@/lib/guidance';
import { requireParentAccess } from '@/lib/access';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getEntitlement } from '@/lib/billing';
import { DECODE_MODEL } from '@/lib/ai/decode';
import { writeWeeklyReport } from '@/lib/ai/report';
import { CHILD_COLUMNS, childFromRow, type ChildRow } from '@/lib/mappers';
import type { Report, WeeklyReport } from '@/types';

export const maxDuration = 60;

const WEEK_MS = 7 * 86_400_000;
const MIN_ENTRIES = 3;
// A report is regenerated at most once a day per child; repeat requests return the latest.
const REGENERATE_AFTER_MS = 86_400_000;

interface ReportRow {
  id: string;
  child_id: string;
  period_start: string;
  period_end: string;
  report: WeeklyReport;
  created_at: string;
}
const REPORT_COLUMNS = 'id, child_id, period_start, period_end, report, created_at';

function reportFromRow(row: ReportRow): Report {
  return {
    id: row.id,
    childId: row.child_id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    report: row.report,
    createdAt: row.created_at,
  };
}

const childIdSchema = z.string().uuid();

/** Latest report for a child (any plan — it is the parent's own data). */
export async function GET(req: Request) {
  const access = await requireParentAccess();
  if (access.response) return access.response;
  const { supabase } = access;

  const childId = childIdSchema.safeParse(new URL(req.url).searchParams.get('childId'));
  if (!childId.success) return NextResponse.json({ error: 'Missing child.' }, { status: 400 });

  const { data, error } = await supabase
    .from('reports')
    .select(REPORT_COLUMNS)
    .eq('child_id', childId.data)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<ReportRow>();

  if (error) return NextResponse.json({ error: 'Saved report unavailable. Please retry.' }, { status: 503 });
  return NextResponse.json({ report: data ? reportFromRow(data) : null });
}

/** Generate this week's report (Plus). */
export async function POST(req: Request) {
  const access = await requireParentAccess();
  if (access.response) return access.response;
  const { supabase, user } = access;

  const body = z.object({ childId: childIdSchema, requestId: z.string().uuid().optional() }).safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: 'Missing child.' }, { status: 400 });
  const { childId } = body.data;

  let reservation: Reservation | undefined;
  try {
  const entitlement = await getEntitlement(supabase, user.id);
  if (entitlement.plan !== 'plus') {
    return NextResponse.json(
      { error: 'Weekly pattern reports are part of Kahiye Plus.', code: 'upgrade_required', entitlement },
      { status: 402 },
    );
  }

  const { data: latest, error: latestError } = await supabase
    .from('reports')
    .select(REPORT_COLUMNS)
    .eq('child_id', childId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<ReportRow>();
  if (latestError) throw new Error('Report lookup unavailable');
  if (latest && Date.now() - new Date(latest.created_at).getTime() < REGENERATE_AFTER_MS) {
    return NextResponse.json({ report: reportFromRow(latest) });
  }

  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - WEEK_MS);
  const since = periodStart.toISOString();

  const [childRes, logsRes, decodesRes] = await Promise.all([
    supabase.from('children').select(CHILD_COLUMNS).eq('id', childId).maybeSingle<ChildRow>(),
    supabase.from('context_logs').select('content, log_type, created_at')
      .eq('child_id', childId).gte('created_at', since).order('created_at', { ascending: true }).limit(60),
    supabase.from('decodes').select('scenario, analysis, outcome, created_at')
      .eq('child_id', childId).eq('safety_category', 'none').is('analysis->conversation', null).gte('created_at', since).order('created_at', { ascending: true }).limit(40),
  ]);
  if (childRes.error || logsRes.error || decodesRes.error) throw new Error('Report sources unavailable');
  if (!childRes.data) return NextResponse.json({ error: 'Child not found.' }, { status: 404 });

  const logs = logsRes.data ?? [];
  const decodes = (decodesRes.data ?? []).map((d) => ({
    scenario: d.scenario as string,
    say_this: (d.analysis as { sayThis?: string } | null)?.sayThis ?? null,
    outcome: d.outcome as string | null,
    created_at: d.created_at as string,
  }));
  const entries = logs.length + decodes.length;
  if (entries < MIN_ENTRIES) {
    return NextResponse.json(
      {
        error: `A report needs at least ${MIN_ENTRIES} moments from the last 7 days. You have ${entries}. Log a few more with the + button.`,
        code: 'not_enough_data',
      },
      { status: 422 },
    );
  }

  reservation = await reserveGuidance({ id: body.data.requestId ?? crypto.randomUUID(), userId: user.id, childId, kind: 'report', content: { childId } });
  let resultId = reservation.resultId;
  if (!reservation.complete) {
    const signal = AbortSignal.any([req.signal, AbortSignal.timeout(45_000)]);
    const report = await writeWeeklyReport({
      child: childFromRow(childRes.data),
      periodStart: since,
      periodEnd: periodEnd.toISOString(),
      logs,
      decodes,
    }, signal);
    signal.throwIfAborted();
    resultId = (await completeGuidance(reservation, { period_start: since, period_end: periodEnd.toISOString(), report, model: DECODE_MODEL })) ?? undefined;
  }
  const { data: row, error } = await supabase.from('reports').select(REPORT_COLUMNS).eq('id', resultId!).eq('child_id', childId).single<ReportRow>();
  if (error) throw new Error('Saved report unavailable');
  return NextResponse.json({ report: reportFromRow(row) });
  } catch (error) { await failGuidance(reservation).catch(() => undefined); return guidanceErrorResponse(error); }
}
