-- Parent outcome metrics: private, aggregate evidence for the loops Kahiye claims to measure.
-- Read-only (STABLE, no writes) and executable only by service_role. The admin API calls it after
-- requireAdminAccess confirms an owner/operations membership at AAL2; therapists and content
-- reviewers never reach it. Output is aggregate counts and ratios only: no family, child, scenario,
-- name or identifier leaves the database. Any cell built from fewer than five families is "<5".
-- Definitions are documented in docs/PARENT-OUTCOME-METRICS.md. Additive; no existing rows change.
set local lock_timeout='5s';

-- A count is shown only when at least five distinct families contributed to it.
create function private.outcome_count(value bigint, families bigint) returns jsonb
language sql immutable set search_path='' as $$
 select case when coalesce(families,0)<5 then to_jsonb('<5'::text) else to_jsonb(coalesce(value,0)) end;
$$;
-- A ratio is shown only when both its numerator and denominator rest on at least five families.
create function private.outcome_ratio(numerator numeric, denominator numeric, families bigint, digits integer default 3) returns jsonb
language sql immutable set search_path='' as $$
 select case when coalesce(families,0)<5 then to_jsonb('<5'::text)
  when coalesce(denominator,0)=0 then 'null'::jsonb
  else to_jsonb(round(numerator/denominator,digits)) end;
$$;

create function public.parent_outcome_metrics() returns jsonb
language sql stable security invoker set search_path='' as $$
with recursive
-- Registered family: a parent with current consent. Registration time is the first consent receipt.
families as (
 select c.user_id, coalesce(r.first_accepted,c.agreed_at) registered_at
 from public.consents c
 left join lateral (select min(e.occurred_at) first_accepted from public.consent_events e
  where e.user_id=c.user_id and e.action='accepted') r on true
 where c.policy_version='2026-10-05'
),
-- Every Ask record by a registered family. Ordinary guidance: safety 'none' and no conversation.
asks as (
 select d.id, d.user_id, d.created_at, d.outcome, d.outcome_at, d.continuation_of,
  d.analysis->'conversation' is not null as conversation,
  d.safety_category='none' and d.analysis->'conversation' is null as ordinary,
  d.refines is null as request
 from public.decodes d join families f on f.user_id=d.user_id
),
firsts as (
 select user_id, min(created_at) first_at from asks where ordinary and request group by user_id
),
-- Per-family flags stay inside this function; only their aggregates are returned.
parents as (
 select f.user_id, f.first_at,
  f.first_at<=now()-interval '14 days' as matured_14,
  f.first_at<=now()-interval '30 days' as matured_30,
  exists(select 1 from asks a where a.user_id=f.user_id and a.ordinary and a.outcome is not null
   and a.outcome_at>=f.first_at and a.outcome_at<=f.first_at+interval '14 days') as activated,
  (select count(*) from asks a where a.user_id=f.user_id and a.ordinary and a.request
   and a.created_at>=f.first_at and a.created_at<=f.first_at+interval '14 days')>=2 as second_moment,
  exists(select 1 from asks a where a.user_id=f.user_id
   and a.created_at>=f.first_at+interval '1 day' and a.created_at<=f.first_at+interval '30 days') as returned,
  (select count(*) from public.guidance_requests g where g.user_id=f.user_id and g.kind='share' and g.state='complete') as shares
 from firsts f
),
-- Periods: all time, the last 30 days, and the last eight India-time weeks (Monday start).
periods as (
 select 'all_time'::text as key, '-infinity'::timestamptz as from_at, 'infinity'::timestamptz as to_at, null::date as week_start
 union all select 'last_30_days', now()-interval '30 days', 'infinity'::timestamptz, null::date
 union all select 'week_'||k, w at time zone 'Asia/Kolkata', (w+interval '1 week') at time zone 'Asia/Kolkata', w::date
 from generate_series(0,7) k, lateral (select date_trunc('week',now() at time zone 'Asia/Kolkata')-make_interval(weeks=>k) w) week
),
summary_periods as (select * from periods where week_start is null),
-- Cohorts are defined by the time of a family's first ordinary guidance request.
cohort as (
 select p.key,
  count(x.user_id) as families,
  count(*) filter (where x.matured_14) as m14,
  count(*) filter (where x.matured_30) as m30,
  count(*) filter (where x.activated) as activated,
  count(*) filter (where x.activated and x.matured_14) as activated_m14,
  count(*) filter (where x.second_moment and x.matured_14) as second_m14,
  count(*) filter (where x.returned and x.matured_30) as returned_m30,
  coalesce(sum(x.shares) filter (where x.activated),0) as shares,
  count(*) filter (where x.activated and x.shares>0) as sharing
 from periods p left join parents x on x.first_at>=p.from_at and x.first_at<p.to_at
 group by p.key
),
registration as (
 select p.key, count(f.user_id) as registered,
  count(f.user_id) filter (where s.paid_through is not null) as paid
 from summary_periods p
 left join families f on f.registered_at>=p.from_at and f.registered_at<p.to_at
 left join public.subscriptions s on s.user_id=f.user_id
 group by p.key
),
-- Feedback is measured on ordinary guidance answers created in the period.
answers as (
 select p.key, count(a.id) as answers, count(distinct a.user_id) as answer_families,
  count(a.id) filter (where a.outcome is not null) as rated,
  count(distinct a.user_id) filter (where a.outcome is not null) as rated_families,
  count(a.id) filter (where a.outcome='worked') as worked,
  count(distinct a.user_id) filter (where a.outcome='worked') as worked_families,
  count(a.id) filter (where a.outcome='partly') as partly,
  count(distinct a.user_id) filter (where a.outcome='partly') as partly_families,
  count(a.id) filter (where a.outcome='did_not_work') as did_not_work,
  count(distinct a.user_id) filter (where a.outcome='did_not_work') as did_not_work_families
 from summary_periods p left join asks a on a.ordinary and a.created_at>=p.from_at and a.created_at<p.to_at
 group by p.key
),
-- Chat/practice: a conversation starts with a record that continues nothing; replies follow continuation_of.
walk as (
 select a.id as root, a.id, a.user_id, a.created_at as started_at from asks a where a.conversation and a.continuation_of is null
 union all
 select w.root, a.id, w.user_id, w.started_at from walk w join asks a on a.continuation_of=w.id and a.conversation
),
conversations as (select root, user_id, started_at, count(*) as messages from walk group by root, user_id, started_at),
talk as (
 select p.key, count(c.root) as conversations, count(distinct c.user_id) as talk_families, coalesce(sum(c.messages),0) as messages
 from summary_periods p left join conversations c on c.started_at>=p.from_at and c.started_at<p.to_at
 group by p.key
),
-- Handbook: conversation cards a parent marked tried, dated by the card's last update (India date).
tried as (
 select s.user_id,
  case when e.value->>'updatedOn' ~ '^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$' then (e.value->>'updatedOn')::date end as updated_on
 from public.child_care_state s join families f on f.user_id=s.user_id
 cross join lateral jsonb_each(case when jsonb_typeof(s.value->'handbook')='object' then s.value->'handbook' else '{}'::jsonb end) e
 where jsonb_typeof(e.value)='object' and e.value->>'status'='tried'
),
handbook as (
 select p.key, count(t.user_id) as tried, count(distinct t.user_id) as tried_families
 from summary_periods p left join tried t on p.key='all_time'
  or (t.updated_on>=(p.from_at at time zone 'Asia/Kolkata')::date and t.updated_on<(p.to_at at time zone 'Asia/Kolkata')::date)
 group by p.key
),
current_state as (
 select count(*) as registered,
  count(*) filter (where s.status in ('active','pending','halted','cancelled','completed') and s.paid_through>now()) as subscribers
 from families f left join public.subscriptions s on s.user_id=f.user_id
)
select jsonb_build_object(
 'generated_at', now(),
 'minimum_families', 5,
 'current', (select jsonb_build_object(
   'registered_families', private.outcome_count(registered, registered),
   'plus_subscribers', private.outcome_count(subscribers, subscribers)) from current_state),
 'periods', (select jsonb_object_agg(p.key, jsonb_build_object(
   'registered_families', private.outcome_count(r.registered, r.registered),
   'paid_conversion', private.outcome_ratio(r.paid, r.registered, least(r.paid, r.registered)),
   'first_guidance_families', private.outcome_count(c.families, c.families),
   'matured_14_day', private.outcome_count(c.m14, c.m14),
   'matured_30_day', private.outcome_count(c.m30, c.m30),
   'activated', private.outcome_count(c.activated, c.activated),
   'activation_rate', private.outcome_ratio(c.activated_m14, c.m14, least(c.activated_m14, c.m14)),
   'second_moment_rate', private.outcome_ratio(c.second_m14, c.m14, least(c.second_m14, c.m14)),
   'return_30_day_rate', private.outcome_ratio(c.returned_m30, c.m30, least(c.returned_m30, c.m30)),
   'share_rate', private.outcome_ratio(c.shares, c.activated, least(c.sharing, c.activated), 2),
   'feedback_rate', private.outcome_ratio(a.rated, a.answers, least(a.rated_families, a.answer_families)),
   'outcome_worked', private.outcome_ratio(a.worked, a.rated, least(a.worked_families, a.rated_families)),
   'outcome_partly', private.outcome_ratio(a.partly, a.rated, least(a.partly_families, a.rated_families)),
   'outcome_did_not_work', private.outcome_ratio(a.did_not_work, a.rated, least(a.did_not_work_families, a.rated_families)),
   'conversations', private.outcome_count(t.conversations, t.talk_families),
   'messages_per_conversation', private.outcome_ratio(t.messages, t.conversations, t.talk_families, 1),
   'handbook_tried', private.outcome_count(h.tried, h.tried_families)))
  from summary_periods p join cohort c using(key) join registration r using(key) join answers a using(key)
  join talk t using(key) join handbook h using(key)),
 'weekly', (select jsonb_agg(jsonb_build_object(
   'week_start', p.week_start,
   'first_guidance_families', private.outcome_count(c.families, c.families),
   'matured_14_day', private.outcome_count(c.m14, c.m14),
   'matured_30_day', private.outcome_count(c.m30, c.m30),
   'activated', private.outcome_count(c.activated, c.activated),
   'activation_rate', private.outcome_ratio(c.activated_m14, c.m14, least(c.activated_m14, c.m14)),
   'second_moment_rate', private.outcome_ratio(c.second_m14, c.m14, least(c.second_m14, c.m14)),
   'return_30_day_rate', private.outcome_ratio(c.returned_m30, c.m30, least(c.returned_m30, c.m30)),
   'share_rate', private.outcome_ratio(c.shares, c.activated, least(c.sharing, c.activated), 2))
   order by p.week_start desc)
  from periods p join cohort c using(key) where p.week_start is not null)
);
$$;

revoke all on function private.outcome_count(bigint,bigint), private.outcome_ratio(numeric,numeric,bigint,integer),
 public.parent_outcome_metrics() from public, anon, authenticated;
grant execute on function private.outcome_count(bigint,bigint), private.outcome_ratio(numeric,numeric,bigint,integer),
 public.parent_outcome_metrics() to service_role;
