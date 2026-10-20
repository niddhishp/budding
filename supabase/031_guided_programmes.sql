-- Guided programmes: a parent runs a short, structured plan (for example seven days of potty
-- training) with one child. Programme content is version-controlled in src/data/programmes.ts;
-- this table keeps only the family's own progress: which days are done, and a 1-5 "how hard is
-- this" rating at the start and, optionally, at the finish.
-- Parents read their own rows; every write goes through a security-definer function that checks
-- consent (policy 2026-10-05), ownership and the row revision. At most one active enrolment per
-- child per programme. Aggregate metrics are service-role only and suppress any figure built
-- from fewer than five families. Additive; no existing rows change.
set local lock_timeout='5s';

-- Progress is a small object of day number -> India date it was ticked, e.g. {"1":"2026-10-21"}.
create function private.programme_progress_ok(p jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare e record;
begin
 if p is null or jsonb_typeof(p)<>'object' then return false; end if;
 if (select count(*) from jsonb_object_keys(p))>14 then return false; end if;
 for e in select key, value from jsonb_each(p) loop
  if e.key !~ '^([1-9]|1[0-4])$' or jsonb_typeof(e.value)<>'string' or (e.value#>>'{}') !~ '^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$' then return false; end if;
 end loop;
 return true;
end $$;

create table public.programme_enrolments (
 id uuid primary key,
 user_id uuid not null references auth.users on delete cascade,
 child_id uuid not null references public.children on delete cascade,
 programme_id text not null check(programme_id ~ '^[a-z][a-z0-9-]{2,39}$'),
 started_on date not null,
 progress jsonb not null default '{}'::jsonb check(private.programme_progress_ok(progress)),
 baseline smallint not null check(baseline between 1 and 5),
 final smallint check(final between 1 and 5),
 status text not null default 'active' check(status in ('active','completed','stopped')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 revision integer not null default 0 check(revision>=0),
 check((status='completed')=(final is not null))
);
create unique index programme_enrolments_one_active on public.programme_enrolments(child_id,programme_id) where status='active';
create index programme_enrolments_child on public.programme_enrolments(child_id,created_at desc);
alter table public.programme_enrolments enable row level security;
revoke all on public.programme_enrolments from public,anon,authenticated;
grant select on public.programme_enrolments to authenticated;
grant all on public.programme_enrolments to service_role;
create policy "programmes: own read" on public.programme_enrolments for select to authenticated using(user_id=(select auth.uid()));

-- Start, or return the enrolment already started. A retried request (same receipt) returns its row.
create function private.start_programme(target uuid,receipt uuid,programme text,rating smallint) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result public.programme_enrolments;
begin
 if auth.uid() is null or not exists(select 1 from public.consents where user_id=auth.uid() and policy_version='2026-10-05') then raise insufficient_privilege; end if;
 perform 1 from public.children where id=target and user_id=auth.uid() for update;
 if not found then raise insufficient_privilege; end if;
 select * into result from public.programme_enrolments where id=receipt;
 if found then
  if result.user_id<>auth.uid() or result.child_id<>target or result.programme_id<>programme then raise insufficient_privilege; end if;
  return jsonb_build_object('status','saved','enrolment',to_jsonb(result));
 end if;
 select * into result from public.programme_enrolments where child_id=target and programme_id=programme and status='active';
 if found then return jsonb_build_object('status','active','enrolment',to_jsonb(result)); end if;
 if (select count(*) from public.programme_enrolments where child_id=target)>=100 then return jsonb_build_object('status','limit'); end if;
 insert into public.programme_enrolments(id,user_id,child_id,programme_id,started_on,baseline)
  values(receipt,auth.uid(),target,programme,(now() at time zone 'Asia/Kolkata')::date,rating) returning * into result;
 return jsonb_build_object('status','saved','enrolment',to_jsonb(result));
end $$;

-- Locks an enrolment the signed-in parent owns, for a child they still own.
create function private.own_enrolment(enrolment uuid) returns public.programme_enrolments
language plpgsql security definer set search_path='' as $$
declare result public.programme_enrolments;
begin
 if auth.uid() is null or not exists(select 1 from public.consents where user_id=auth.uid() and policy_version='2026-10-05') then raise insufficient_privilege; end if;
 select * into result from public.programme_enrolments where id=enrolment for update;
 if not found or result.user_id<>auth.uid() or not exists(select 1 from public.children where id=result.child_id and user_id=auth.uid()) then raise insufficient_privilege; end if;
 return result;
end $$;

-- Tick or untick one day. A retry whose change is already in place returns the row unchanged;
-- otherwise a stale revision returns 'conflict' with the current row.
create function private.mark_programme_day(enrolment uuid,day smallint,done boolean,expected integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result public.programme_enrolments; k text;
begin
 result:=private.own_enrolment(enrolment);
 if day is null or day<1 or day>14 or done is null then raise exception using errcode='22023', message='Choose a day between 1 and 14.'; end if;
 k:=day::text;
 if result.status<>'active' then return jsonb_build_object('status',result.status,'enrolment',to_jsonb(result)); end if;
 if (result.progress ? k)=done then return jsonb_build_object('status','saved','enrolment',to_jsonb(result)); end if;
 if expected is distinct from result.revision then return jsonb_build_object('status','conflict','enrolment',to_jsonb(result)); end if;
 update public.programme_enrolments set
  progress=case when done then progress||jsonb_build_object(k,((now() at time zone 'Asia/Kolkata')::date)::text) else progress-k end,
  revision=revision+1, updated_at=now()
 where id=enrolment returning * into result;
 return jsonb_build_object('status','saved','enrolment',to_jsonb(result));
end $$;

-- Finish with the closing 1-5 rating. Finishing twice returns the first finish.
create function private.finish_programme(enrolment uuid,rating smallint,expected integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result public.programme_enrolments;
begin
 result:=private.own_enrolment(enrolment);
 if result.status='completed' then return jsonb_build_object('status','saved','enrolment',to_jsonb(result)); end if;
 if result.status='stopped' then return jsonb_build_object('status','stopped','enrolment',to_jsonb(result)); end if;
 if expected is distinct from result.revision then return jsonb_build_object('status','conflict','enrolment',to_jsonb(result)); end if;
 update public.programme_enrolments set status='completed', final=rating, revision=revision+1, updated_at=now()
 where id=enrolment returning * into result;
 return jsonb_build_object('status','saved','enrolment',to_jsonb(result));
end $$;

-- Stop without a rating. Stopping twice is harmless; a completed programme stays completed.
create function private.stop_programme(enrolment uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result public.programme_enrolments;
begin
 result:=private.own_enrolment(enrolment);
 if result.status<>'active' then return jsonb_build_object('status',result.status,'enrolment',to_jsonb(result)); end if;
 update public.programme_enrolments set status='stopped', revision=revision+1, updated_at=now()
 where id=enrolment returning * into result;
 return jsonb_build_object('status','stopped','enrolment',to_jsonb(result));
end $$;

create function public.start_programme(target uuid,receipt uuid,programme text,rating smallint) returns jsonb
language sql security invoker set search_path='' as $$ select private.start_programme(target,receipt,programme,rating); $$;
create function public.mark_programme_day(enrolment uuid,day smallint,done boolean,expected integer) returns jsonb
language sql security invoker set search_path='' as $$ select private.mark_programme_day(enrolment,day,done,expected); $$;
create function public.finish_programme(enrolment uuid,rating smallint,expected integer) returns jsonb
language sql security invoker set search_path='' as $$ select private.finish_programme(enrolment,rating,expected); $$;
create function public.stop_programme(enrolment uuid) returns jsonb
language sql security invoker set search_path='' as $$ select private.stop_programme(enrolment); $$;

revoke all on function private.programme_progress_ok(jsonb), private.own_enrolment(uuid),
 private.start_programme(uuid,uuid,text,smallint), private.mark_programme_day(uuid,smallint,boolean,integer),
 private.finish_programme(uuid,smallint,integer), private.stop_programme(uuid),
 public.start_programme(uuid,uuid,text,smallint), public.mark_programme_day(uuid,smallint,boolean,integer),
 public.finish_programme(uuid,smallint,integer), public.stop_programme(uuid) from public,anon;
revoke all on function private.own_enrolment(uuid) from authenticated;
grant execute on function private.start_programme(uuid,uuid,text,smallint), private.mark_programme_day(uuid,smallint,boolean,integer),
 private.finish_programme(uuid,smallint,integer), private.stop_programme(uuid),
 public.start_programme(uuid,uuid,text,smallint), public.mark_programme_day(uuid,smallint,boolean,integer),
 public.finish_programme(uuid,smallint,integer), public.stop_programme(uuid) to authenticated;
-- The table check calls the validator as whichever role writes the row.
grant execute on function private.programme_progress_ok(jsonb) to authenticated, service_role;

-- Per programme: families, enrolments, completion (of enrolments at least 14 days old) and the
-- share of completed enrolments whose closing rating was easier than the opening one.
create function public.programme_metrics() returns jsonb
language sql stable security invoker set search_path='' as $$
with families as (select user_id from public.consents where policy_version='2026-10-05'),
enrolments as (
 select e.user_id, e.programme_id, e.status, e.baseline, e.final,
  e.started_on<=(now() at time zone 'Asia/Kolkata')::date-14 as matured
 from public.programme_enrolments e join families f using(user_id)
),
per as (
 select programme_id,
  count(*) as enrolments, count(distinct user_id) as families,
  count(*) filter (where status='active') as active, count(distinct user_id) filter (where status='active') as active_families,
  count(*) filter (where status='completed') as completed, count(distinct user_id) filter (where status='completed') as completed_families,
  count(*) filter (where status='stopped') as stopped, count(distinct user_id) filter (where status='stopped') as stopped_families,
  count(*) filter (where matured) as matured, count(distinct user_id) filter (where matured) as matured_families,
  count(*) filter (where matured and status='completed') as matured_completed,
  count(distinct user_id) filter (where matured and status='completed') as matured_completed_families,
  count(*) filter (where status='completed' and final<baseline) as improved,
  count(distinct user_id) filter (where status='completed' and final<baseline) as improved_families
 from enrolments group by programme_id
)
select jsonb_build_object(
 'generated_at', now(), 'minimum_families', 5,
 'programmes', coalesce((select jsonb_agg(jsonb_build_object(
   'programme_id', programme_id,
   'families', private.outcome_count(families, families),
   'enrolments', private.outcome_count(enrolments, families),
   'active', private.outcome_count(active, active_families),
   'completed', private.outcome_count(completed, completed_families),
   'stopped', private.outcome_count(stopped, stopped_families),
   'completion_rate', private.outcome_ratio(matured_completed, matured, least(matured_completed_families, matured_families)),
   'improved_rate', private.outcome_ratio(improved, completed, least(improved_families, completed_families))
  ) order by programme_id) from per), '[]'::jsonb)
);
$$;
revoke all on function public.programme_metrics() from public,anon,authenticated;
grant execute on function public.programme_metrics() to service_role;
