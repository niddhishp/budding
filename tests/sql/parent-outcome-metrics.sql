-- Parent outcome metrics: definitions, 14/30-day windows, chat exclusion, consent scope,
-- small-cell suppression and access. Synthetic fixtures only; everything is rolled back.
begin;
do $$ begin
 if exists(select 1 from public.consents) or exists(select 1 from public.decodes) then
  raise exception 'parent-outcome-metrics.sql needs a database without family records';
 end if;
end $$;

-- Groups (5 families each unless noted). first_at is each family's first ordinary guidance.
--  A  first now-60d. Rated "worked" at exactly +14d (inclusive), second request +10d,
--     a 3-message chat at +20d, two completed shares (and one failed), Plus active, one Handbook card tried.
--  B  first now-60d. Rated "partly" at +14d+1h (outside), second request at +15d (outside),
--     so not activated and no second moment; the +15d request is a 30-day return. 2 of 5 paid once (expired).
--  C  a chat 5 days BEFORE first guidance (now-65d), first now-60d rated "did_not_work" at +13d.
--     A rated non-'none' safety answer at +2h (not ordinary; under 1 day so not a return),
--     and another request at +31d (outside the 30-day return window).
--  D  chat/practice only (a 4-message practice at now-2d) and two Handbook cards tried; no guidance.
--  E  first now-5d (window still open): rated at +3h and a second request at +2d.
--  F  3 families, first in week -3 (India time), second request at exactly +14d. No ratings.
--  G  first now-200d, nothing else except a one-message practice at +23h (under 1 day).
--  J  first in week -5, rated "worked" at +1h.
--  H  5 parents WITHOUT consent who do everything: excluded everywhere.
create temporary table fixture_family(code text, n int, user_id uuid, child_id uuid, consented boolean, first_at timestamptz) on commit drop;
insert into fixture_family
select g.code, n, ('f7000000-0000-4000-8000-'||lpad((g.ord*100+n)::text,12,'0'))::uuid,
 ('f7000000-0000-4000-8001-'||lpad((g.ord*100+n)::text,12,'0'))::uuid, g.code<>'H',
 case g.code when 'A' then now()-interval '60 days' when 'B' then now()-interval '60 days' when 'C' then now()-interval '60 days'
  when 'D' then null when 'E' then now()-interval '5 days'
  when 'F' then (date_trunc('week',now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata')-interval '20 days'
  when 'G' then now()-interval '200 days'
  when 'J' then (date_trunc('week',now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata')-interval '35 days'+interval '1 hour'
  when 'H' then now()-interval '60 days' end
from (values ('A',1,5),('B',2,5),('C',3,5),('D',4,5),('E',5,5),('F',6,3),('G',7,5),('J',8,5),('H',9,5)) g(code,ord,size)
cross join lateral generate_series(1,g.size) n;

insert into auth.users(id,email) select user_id, 'metrics-'||code||n||'@example.invalid' from fixture_family;
insert into public.children(id,user_id,name,dob) select child_id,user_id,'Synthetic metrics child','2019-01-01' from fixture_family;
insert into public.consents(user_id,policy_version) select user_id,'2026-10-05' from fixture_family where consented;
-- Registration is the first consent receipt: one day before first guidance (D: ten days ago).
update public.consent_events e set occurred_at=coalesce(f.first_at,now()-interval '10 days')-interval '1 day'
from fixture_family f where e.user_id=f.user_id;

create function pg_temp.ask(p_code text, p_offset interval, p_analysis jsonb default '{"sayThis":"Try this"}',
 p_safety text default 'none', p_outcome text default null, p_outcome_offset interval default null,
 p_continues text default null, p_tag text default null) returns void language sql as $$
 insert into public.decodes(id,user_id,child_id,scenario,analysis,safety_category,risk_level,outcome,outcome_at,created_at,continuation_of)
 select gen_random_uuid(), f.user_id, f.child_id, coalesce(p_tag,'Synthetic scenario'), p_analysis || jsonb_build_object('fixture',coalesce(p_tag,'')), p_safety, 'none',
  p_outcome, case when p_outcome is not null then f.first_at+p_outcome_offset end, coalesce(f.first_at,now())+p_offset,
  (select d.id from public.decodes d where d.user_id=f.user_id and d.analysis->>'fixture'=p_continues)
 from fixture_family f where f.code=p_code;
$$;

-- Guidance and outcomes.
select pg_temp.ask('A','0 days',p_outcome=>'worked',p_outcome_offset=>'14 days');
select pg_temp.ask('A','10 days');
select pg_temp.ask('B','0 days',p_outcome=>'partly',p_outcome_offset=>'14 days 1 hour');
select pg_temp.ask('B','15 days');
select pg_temp.ask('C','0 days',p_outcome=>'did_not_work',p_outcome_offset=>'13 days');
select pg_temp.ask('C','2 hours',p_safety=>'medical',p_outcome=>'worked',p_outcome_offset=>'3 hours');
select pg_temp.ask('C','31 days');
select pg_temp.ask('E','0 days',p_outcome=>'worked',p_outcome_offset=>'3 hours');
select pg_temp.ask('E','2 days');
select pg_temp.ask('F','0 days');
select pg_temp.ask('F','14 days');
select pg_temp.ask('G','0 days');
select pg_temp.ask('J','0 days',p_outcome=>'worked',p_outcome_offset=>'1 hour');
select pg_temp.ask('H','0 days',p_outcome=>'worked',p_outcome_offset=>'1 hour');
select pg_temp.ask('H','5 days');
-- Chat and practice conversations (never rateable; chains follow continuation_of).
select pg_temp.ask('A','20 days','{"conversation":{"mode":"talk"}}',p_tag=>'a1');
select pg_temp.ask('A','20 days 1 minute','{"conversation":{"mode":"talk"}}',p_continues=>'a1',p_tag=>'a2');
select pg_temp.ask('A','20 days 2 minutes','{"conversation":{"mode":"talk"}}',p_continues=>'a2',p_tag=>'a3');
select pg_temp.ask('C','-5 days','{"conversation":{"mode":"talk"}}',p_tag=>'c1');
select pg_temp.ask('G','23 hours','{"conversation":{"mode":"rehearse"}}',p_tag=>'g1');
select pg_temp.ask('H','2 days','{"conversation":{"mode":"talk"}}',p_tag=>'h1');
update fixture_family set first_at=now()-interval '2 days' where code='D';
select pg_temp.ask('D','0 minutes','{"conversation":{"mode":"rehearse"}}',p_tag=>'d1');
select pg_temp.ask('D','1 minute','{"conversation":{"mode":"rehearse"}}',p_continues=>'d1',p_tag=>'d2');
select pg_temp.ask('D','2 minutes','{"conversation":{"mode":"rehearse"}}',p_continues=>'d2',p_tag=>'d3');
select pg_temp.ask('D','3 minutes','{"conversation":{"mode":"rehearse"}}',p_continues=>'d3',p_tag=>'d4');
do $$ begin
 begin
  update public.decodes set outcome='worked',outcome_at=now() where analysis->>'fixture'='d1';
  raise exception 'chat was rateable';
 exception when check_violation then null; end;
end $$;

-- Caregiver shares: only completed shares by activated families count.
insert into public.guidance_requests(id,user_id,child_id,kind,fingerprint,state)
select gen_random_uuid(),f.user_id,f.child_id,'share','fixture-'||s,case when s<=2 then 'complete' else 'failed' end
from fixture_family f cross join generate_series(1,3) s where f.code='A';
insert into public.guidance_requests(id,user_id,child_id,kind,fingerprint,state)
select gen_random_uuid(),f.user_id,f.child_id,'share','fixture-b','complete' from fixture_family f where f.code in ('B','H');

-- Plus: A active, two B families paid once and expired, one G checkout never paid, H active (no consent).
insert into public.subscriptions(user_id,interval,status,razorpay_subscription_id,paid_through)
select f.user_id,'monthly',case when f.code in ('A','H') then 'active' when f.code='B' then 'cancelled' else 'created' end,'sub_fixture_'||f.code||f.n,
 case when f.code in ('A','H') then now()+interval '10 days' when f.code='B' then now()-interval '1 day' end
from fixture_family f where f.code in ('A','H') or (f.code='B' and f.n<=2) or (f.code='G' and f.n=1);

-- Handbook progress (India dates).
insert into public.child_care_state(child_id,user_id,value)
select f.child_id,f.user_id,jsonb_build_object('handbook',
 case when f.code='D' then jsonb_build_object(
   'card-one',jsonb_build_object('status','tried','followUp',null,'updatedOn',((now() at time zone 'Asia/Kolkata')::date-2)::text),
   'card-two',jsonb_build_object('status','tried','followUp',null,'updatedOn',((now() at time zone 'Asia/Kolkata')::date-3)::text),
   'card-three',jsonb_build_object('status','saved','followUp',null,'updatedOn',((now() at time zone 'Asia/Kolkata')::date-1)::text))
 else jsonb_build_object('card-one',jsonb_build_object('status','tried','followUp',null,'updatedOn',((now() at time zone 'Asia/Kolkata')::date-60)::text)) end)
from fixture_family f where f.code in ('A','D','H');

-- Access: only service_role may execute; the function is read-only and runs as its caller.
create function pg_temp.metrics_denied() returns void language plpgsql as $$ begin
 begin perform public.parent_outcome_metrics(); exception when insufficient_privilege then return; end;
 raise exception 'parent_outcome_metrics was executable by %', current_user;
end $$;
grant execute on function pg_temp.metrics_denied() to anon, authenticated;
set local role anon;
select pg_temp.metrics_denied();
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"f7000000-0000-4000-8000-000000000101"}',true);
select pg_temp.metrics_denied();
reset role;
do $$ begin
 if (select provolatile from pg_proc where oid='public.parent_outcome_metrics()'::regprocedure)<>'s'
  or (select prosecdef from pg_proc where oid='public.parent_outcome_metrics()'::regprocedure) then
  raise exception 'parent_outcome_metrics must be STABLE and SECURITY INVOKER';
 end if;
end $$;

set local role service_role;
create temporary table fixture_result as select public.parent_outcome_metrics() m;
reset role;

do $$ declare m jsonb:=(select m from fixture_result); a jsonb:=m->'periods'->'all_time'; l jsonb:=m->'periods'->'last_30_days';
 w jsonb; e_week date:=date_trunc('week',(now()-interval '5 days') at time zone 'Asia/Kolkata')::date;
 base date:=date_trunc('week',now() at time zone 'Asia/Kolkata')::date;
begin
 -- Privacy: no identifiers, names or scenario text in the output.
 if m::text ~ '[0-9a-f]{8}-[0-9a-f]{4}-' or m::text ~* 'synthetic|example\.invalid|try this|fixture' then
  raise exception 'Metrics leaked row-level content: %', m;
 end if;
 if (m->>'minimum_families')::int<>5 then raise exception 'minimum_families missing'; end if;
 -- Current state: 38 consented families; 5 active Plus (H excluded by consent).
 if m->'current'->'registered_families'<>'38' or m->'current'->'plus_subscribers'<>'5' then raise exception 'current state wrong: %', m->'current'; end if;
 -- All time. 33 families have a first guidance; 28 had 14 days; 25 had 30 days.
 if a->'registered_families'<>'38' then raise exception 'registered wrong: %', a; end if;
 if (a->>'paid_conversion')::numeric<>0.184 then raise exception 'conversion wrong (7/38): %', a->'paid_conversion'; end if;
 if a->'first_guidance_families'<>'33' or a->'matured_14_day'<>'28' or a->'matured_30_day'<>'25' then raise exception 'cohort sizes wrong: %', a; end if;
 -- Activated: A (rated at exactly +14d), C (chat before guidance does not move the window), E, J. Not B (+14d 1h).
 if a->'activated'<>'20' then raise exception 'activated wrong: %', a->'activated'; end if;
 if (a->>'activation_rate')::numeric<>0.536 then raise exception 'activation rate wrong (15/28): %', a->'activation_rate'; end if;
 if (a->>'second_moment_rate')::numeric<>0.286 then raise exception 'second moment wrong (8/28): %', a->'second_moment_rate'; end if;
 if (a->>'return_30_day_rate')::numeric<>0.4 then raise exception '30-day return wrong (10/25): %', a->'return_30_day_rate'; end if;
 if (a->>'share_rate')::numeric<>0.5 then raise exception 'share rate wrong (10/20): %', a->'share_rate'; end if;
 if (a->>'feedback_rate')::numeric<>0.446 then raise exception 'feedback rate wrong (25/56): %', a->'feedback_rate'; end if;
 if (a->>'outcome_worked')::numeric<>0.6 or (a->>'outcome_partly')::numeric<>0.2 or (a->>'outcome_did_not_work')::numeric<>0.2 then raise exception 'outcome mix wrong: %', a; end if;
 if a->'conversations'<>'20' or (a->>'messages_per_conversation')::numeric<>2.3 then raise exception 'conversations wrong (20, 45 messages): %', a; end if;
 if a->'handbook_tried'<>'15' then raise exception 'handbook wrong: %', a->'handbook_tried'; end if;
 -- Last 30 days: cohort E+F = 8; only F (3) had 14 days, so every rate is suppressed.
 if l->'registered_families'<>'13' or l->'paid_conversion'<>'"<5"' then raise exception 'last 30 registration wrong: %', l; end if;
 if l->'first_guidance_families'<>'8' or l->'activated'<>'5' or l->'matured_14_day'<>'"<5"' or l->'activation_rate'<>'"<5"'
  or l->'second_moment_rate'<>'"<5"' or l->'return_30_day_rate'<>'"<5"' or l->'share_rate'<>'"<5"' then raise exception 'last 30 cohort suppression wrong: %', l; end if;
 if (l->>'feedback_rate')::numeric<>0.238 or (l->>'outcome_worked')::numeric<>1 or l->'outcome_partly'<>'"<5"' or l->'outcome_did_not_work'<>'"<5"' then raise exception 'last 30 feedback wrong (5/21): %', l; end if;
 if l->'conversations'<>'5' or (l->>'messages_per_conversation')::numeric<>4 or l->'handbook_tried'<>'10' then raise exception 'last 30 activity wrong: %', l; end if;
 -- Weekly cohorts: eight India weeks, newest first.
 if jsonb_array_length(m->'weekly')<>8 or (m->'weekly'->0->>'week_start')::date<>base or (m->'weekly'->7->>'week_start')::date<>base-49 then
  raise exception 'weekly cohorts wrong: %', m->'weekly'; end if;
 select x into w from jsonb_array_elements(m->'weekly') x where (x->>'week_start')::date=base-21;
 if w->'first_guidance_families'<>'"<5"' or w->'activated'<>'"<5"' or w->'second_moment_rate'<>'"<5"' or w->'activation_rate'<>'"<5"' then
  raise exception 'three-family week was not suppressed: %', w; end if;
 select x into w from jsonb_array_elements(m->'weekly') x where (x->>'week_start')::date=base-35;
 if w->'first_guidance_families'<>'5' or w->'activated'<>'5' or (w->>'activation_rate')::numeric<>1 or w->'second_moment_rate'<>'"<5"' or w->'return_30_day_rate'<>'"<5"' then
  raise exception 'week -5 cohort wrong: %', w; end if;
 select x into w from jsonb_array_elements(m->'weekly') x where (x->>'week_start')::date=e_week;
 if w->'first_guidance_families'<>'5' or w->'activated'<>'5' or w->'matured_14_day'<>'"<5"' or w->'activation_rate'<>'"<5"' then
  raise exception 'open-window cohort wrong: %', w; end if;
 select x into w from jsonb_array_elements(m->'weekly') x where (x->>'week_start')::date=base-7*4;
 if w->'first_guidance_families'<>'"<5"' then raise exception 'empty week not suppressed: %', w; end if;
end $$;

-- Withdrawing consent removes a family from every metric.
delete from public.consents where user_id in (select user_id from fixture_family where code='J');
set local role service_role;
do $$ declare m jsonb:=public.parent_outcome_metrics(); begin
 if m->'current'->'registered_families'<>'33' or m->'periods'->'all_time'->'activated'<>'15' then raise exception 'withdrawn consent still counted: %', m->'periods'->'all_time'; end if;
end $$;
reset role;
rollback;
