-- A short, optional fortnightly check-in so Kahiye can learn whether family evenings get easier,
-- not only whether parents use the app. Two answers per child: how many evenings in the last week
-- ended in a fight or tears (a band, not a count) and how confident the parent feels (1-5).
-- Parents read their own rows; writes go through one function that checks consent and ownership.
-- Aggregate metrics are service-role only and suppress any figure built from fewer than 5 families.
set local lock_timeout='5s';
create table public.family_checkins (
 id uuid primary key,
 child_id uuid not null references public.children on delete cascade,
 user_id uuid not null references auth.users on delete cascade,
 hard_evenings text not null check(hard_evenings in ('0','1-2','3-4','5+')),
 confidence smallint not null check(confidence between 1 and 5),
 created_at timestamptz not null default now()
);
create index family_checkins_child on public.family_checkins(child_id,created_at desc);
alter table public.family_checkins enable row level security;
revoke all on public.family_checkins from public,anon,authenticated;
grant select on public.family_checkins to authenticated;
grant all on public.family_checkins to service_role;
create policy "checkins: own read" on public.family_checkins for select to authenticated using(user_id=(select auth.uid()));

create function private.record_family_checkin(target uuid,receipt uuid,evenings text,sure smallint) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result public.family_checkins;
begin
 if auth.uid() is null or not exists(select 1 from public.consents where user_id=auth.uid() and policy_version='2026-10-05') then raise insufficient_privilege; end if;
 perform 1 from public.children where id=target and user_id=auth.uid() for update;
 if not found then raise insufficient_privilege; end if;
 -- A retried request returns the saved answer instead of a duplicate.
 select * into result from public.family_checkins where id=receipt;
 if found then
  if result.user_id<>auth.uid() or result.child_id<>target then raise insufficient_privilege; end if;
  return jsonb_build_object('status','saved','checkin',to_jsonb(result));
 end if;
 if exists(select 1 from public.family_checkins where child_id=target and created_at>now()-interval '10 days') then
  return jsonb_build_object('status','recent');
 end if;
 insert into public.family_checkins(id,child_id,user_id,hard_evenings,confidence) values(receipt,target,auth.uid(),evenings,sure) returning * into result;
 return jsonb_build_object('status','saved','checkin',to_jsonb(result));
end $$;
create function public.record_family_checkin(target uuid,receipt uuid,evenings text,sure smallint) returns jsonb
language sql security invoker set search_path='' as $$ select private.record_family_checkin(target,receipt,evenings,sure); $$;
revoke all on function private.record_family_checkin(uuid,uuid,text,smallint),public.record_family_checkin(uuid,uuid,text,smallint) from public,anon;
grant execute on function private.record_family_checkin(uuid,uuid,text,smallint),public.record_family_checkin(uuid,uuid,text,smallint) to authenticated;

-- Change from each child's first check-in to their latest one at least 28 days later.
create function public.parent_checkin_metrics() returns jsonb
language sql stable security invoker set search_path='' as $$
with families as (select user_id from public.consents where policy_version='2026-10-05'),
checkins as (
 select k.child_id, k.user_id, k.created_at, k.confidence,
  case k.hard_evenings when '0' then 0 when '1-2' then 1 when '3-4' then 2 else 3 end as level
 from public.family_checkins k join families f using(user_id)
),
firsts as (select distinct on (child_id) child_id, user_id, created_at, level, confidence from checkins order by child_id, created_at),
latest as (
 select distinct on (c.child_id) c.child_id, c.level, c.confidence
 from checkins c join firsts f on f.child_id=c.child_id and c.created_at>=f.created_at+interval '28 days'
 order by c.child_id, c.created_at desc
),
paired as (select f.user_id, f.level as level_0, l.level as level_1, f.confidence as sure_0, l.confidence as sure_1 from firsts f join latest l using(child_id)),
totals as (
 select (select count(distinct user_id) from checkins) as families,
  (select count(*) from checkins) as checkins,
  count(*) as pairs, count(distinct user_id) as paired_families,
  count(*) filter (where level_1<level_0) as fewer, count(distinct user_id) filter (where level_1<level_0) as fewer_families,
  count(*) filter (where level_1>level_0) as more, count(distinct user_id) filter (where level_1>level_0) as more_families,
  count(*) filter (where sure_1>sure_0) as surer, count(distinct user_id) filter (where sure_1>sure_0) as surer_families
 from paired
)
select jsonb_build_object(
 'generated_at', now(), 'minimum_families', 5,
 'families_checked_in', private.outcome_count(families, families),
 'checkins', private.outcome_count(checkins, families),
 'families_with_followup', private.outcome_count(paired_families, paired_families),
 'fewer_hard_evenings_rate', private.outcome_ratio(fewer, pairs, least(fewer_families, paired_families)),
 'more_hard_evenings_rate', private.outcome_ratio(more, pairs, least(more_families, paired_families)),
 'more_confident_rate', private.outcome_ratio(surer, pairs, least(surer_families, paired_families))
) from totals;
$$;
revoke all on function public.parent_checkin_metrics() from public,anon,authenticated;
grant execute on function public.parent_checkin_metrics() to service_role;
