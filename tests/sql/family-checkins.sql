begin;
-- Ten families (one child each): 1-9 consented, 10 without consent. IDs end in a two-digit family number.
insert into auth.users(id,email) select ('f7000000-0000-4000-8000-0000000000'||lpad(g::text,2,'0'))::uuid, 'checkin'||g||'@example.invalid' from generate_series(1,10) g;
insert into public.consents(user_id,policy_version) select ('f7000000-0000-4000-8000-0000000000'||lpad(g::text,2,'0'))::uuid,'2026-10-05' from generate_series(1,9) g;
insert into public.children(id,user_id,name,dob) select ('f7000000-0000-4000-8000-0000000001'||lpad(g::text,2,'0'))::uuid,('f7000000-0000-4000-8000-0000000000'||lpad(g::text,2,'0'))::uuid,'Synthetic child '||g,'2021-01-01' from generate_series(1,10) g;

-- Signed in as family 1.
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"f7000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',true);
do $$ declare result jsonb; begin
 -- Invalid answers are rejected by the table.
 begin perform public.record_family_checkin('f7000000-0000-4000-8000-000000000101','f7000000-0000-4000-8000-000000000204','lots',5::smallint); raise exception 'Invalid answer accepted';
 exception when check_violation then null; end;
 result:=public.record_family_checkin('f7000000-0000-4000-8000-000000000101','f7000000-0000-4000-8000-000000000201','3-4',2::smallint);
 if result->>'status'<>'saved' then raise exception 'First check-in not saved: %', result; end if;
 -- A retried request returns the same row rather than a duplicate.
 result:=public.record_family_checkin('f7000000-0000-4000-8000-000000000101','f7000000-0000-4000-8000-000000000201','3-4',2::smallint);
 if result->>'status'<>'saved' or (select count(*) from public.family_checkins)<>1 then raise exception 'Retry duplicated a check-in'; end if;
 -- A second check-in within 10 days is not stored.
 result:=public.record_family_checkin('f7000000-0000-4000-8000-000000000101','f7000000-0000-4000-8000-000000000202','0',5::smallint);
 if result->>'status'<>'recent' then raise exception 'Check-ins were not spaced: %', result; end if;
 -- Another family's child is refused.
 begin perform public.record_family_checkin('f7000000-0000-4000-8000-000000000102','f7000000-0000-4000-8000-000000000203','0',5::smallint); raise exception 'Checked in for another family';
 exception when insufficient_privilege then null; end;
 -- Parents cannot write rows directly, and cannot run the aggregate.
 begin insert into public.family_checkins(id,child_id,user_id,hard_evenings,confidence) values(gen_random_uuid(),'f7000000-0000-4000-8000-000000000101','f7000000-0000-4000-8000-000000000001','0',5); raise exception 'Direct write allowed';
 exception when insufficient_privilege then null; end;
 begin perform public.parent_checkin_metrics(); raise exception 'Parent ran aggregate metrics';
 exception when insufficient_privilege then null; end;
end $$;
-- Family 2 sees nothing of family 1.
select set_config('request.jwt.claims','{"sub":"f7000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal1"}',true);
do $$ begin if exists(select 1 from public.family_checkins) then raise exception 'Check-ins leaked across families'; end if; end $$;
-- The family without consent cannot check in.
select set_config('request.jwt.claims','{"sub":"f7000000-0000-4000-8000-000000000010","role":"authenticated","aal":"aal1"}',true);
do $$ begin
 begin perform public.record_family_checkin('f7000000-0000-4000-8000-000000000110','f7000000-0000-4000-8000-000000000210','0',3::smallint); raise exception 'Check-in without consent';
 exception when insufficient_privilege then null; end;
end $$;
reset role;

set local role service_role;
-- Fewer than five families: every figure is suppressed.
do $$ declare m jsonb:=public.parent_checkin_metrics(); begin
 if m->>'families_checked_in'<>'<5' or m->>'fewer_hard_evenings_rate'<>'<5' then raise exception 'Small numbers were not suppressed: %', m; end if;
end $$;
-- Families 2-8: a first check-in 40 days ago and a later one now. 2-7 improve and feel surer; 8 gets worse.
-- Family 9 checks in again only 20 days later, so it is not paired. Family 10 (no consent) is excluded.
insert into public.family_checkins(id,child_id,user_id,hard_evenings,confidence,created_at)
 select gen_random_uuid(),('f7000000-0000-4000-8000-0000000001'||lpad(g::text,2,'0'))::uuid,('f7000000-0000-4000-8000-0000000000'||lpad(g::text,2,'0'))::uuid,'3-4',2,now()-interval '40 days' from generate_series(2,8) g;
insert into public.family_checkins(id,child_id,user_id,hard_evenings,confidence,created_at)
 select gen_random_uuid(),('f7000000-0000-4000-8000-0000000001'||lpad(g::text,2,'0'))::uuid,('f7000000-0000-4000-8000-0000000000'||lpad(g::text,2,'0'))::uuid,case when g=8 then '5+' else '1-2' end,case when g=8 then 2 else 4 end,now() from generate_series(2,8) g;
insert into public.family_checkins(id,child_id,user_id,hard_evenings,confidence,created_at) values
 (gen_random_uuid(),'f7000000-0000-4000-8000-000000000109','f7000000-0000-4000-8000-000000000009','3-4',2,now()-interval '20 days'),
 (gen_random_uuid(),'f7000000-0000-4000-8000-000000000109','f7000000-0000-4000-8000-000000000009','0',5,now()),
 (gen_random_uuid(),'f7000000-0000-4000-8000-000000000110','f7000000-0000-4000-8000-000000000010','5+',1,now()-interval '40 days'),
 (gen_random_uuid(),'f7000000-0000-4000-8000-000000000110','f7000000-0000-4000-8000-000000000010','0',5,now());
do $$ declare m jsonb:=public.parent_checkin_metrics(); begin
 if (m->>'families_checked_in')::int<>9 then raise exception 'Consented families with check-ins: %', m; end if;
 if (m->>'families_with_followup')::int<>7 then raise exception 'Pairs need 28 days: %', m; end if;
 if (m->>'fewer_hard_evenings_rate')::numeric<>0.857 then raise exception 'Fewer hard evenings: %', m; end if;
 if (m->>'more_confident_rate')::numeric<>0.857 then raise exception 'More confident: %', m; end if;
 -- Only one family got worse: a figure resting on fewer than five families stays hidden.
 if m->>'more_hard_evenings_rate'<>'<5' then raise exception 'Single-family figure exposed: %', m; end if;
 if m::text ~ 'f7000000' then raise exception 'Identifiers in aggregate output'; end if;
end $$;
reset role;
rollback;
