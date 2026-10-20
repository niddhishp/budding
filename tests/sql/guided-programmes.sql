begin;
-- Ten families (one child each): 1-9 consented, 10 without consent. IDs end in a two-digit family number.
-- Enrolment receipts are f8000000-...-0000000002NN.
insert into auth.users(id,email) select ('f8000000-0000-4000-8000-0000000000'||lpad(g::text,2,'0'))::uuid, 'programme'||g||'@example.invalid' from generate_series(1,10) g;
insert into public.consents(user_id,policy_version) select ('f8000000-0000-4000-8000-0000000000'||lpad(g::text,2,'0'))::uuid,'2026-10-05' from generate_series(1,9) g;
insert into public.children(id,user_id,name,dob) select ('f8000000-0000-4000-8000-0000000001'||lpad(g::text,2,'0'))::uuid,('f8000000-0000-4000-8000-0000000000'||lpad(g::text,2,'0'))::uuid,'Synthetic child '||g,'2023-06-01' from generate_series(1,10) g;

-- Signed in as family 1.
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"f8000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',true);
do $$ declare result jsonb; potty uuid:='f8000000-0000-4000-8000-000000000201'; screens uuid:='f8000000-0000-4000-8000-000000000203'; begin
 -- Ratings and programme ids are validated by the table.
 begin perform public.start_programme('f8000000-0000-4000-8000-000000000101','f8000000-0000-4000-8000-000000000290','potty-training',6::smallint); raise exception 'Rating 6 accepted';
 exception when check_violation then null; end;
 begin perform public.start_programme('f8000000-0000-4000-8000-000000000101','f8000000-0000-4000-8000-000000000291','Potty Training!',3::smallint); raise exception 'Invalid programme id accepted';
 exception when check_violation then null; end;
 begin perform public.start_programme('f8000000-0000-4000-8000-000000000101','f8000000-0000-4000-8000-000000000292','potty-training',null); raise exception 'Missing baseline accepted';
 exception when not_null_violation then null; end;

 result:=public.start_programme('f8000000-0000-4000-8000-000000000101',potty,'potty-training',4::smallint);
 if result->>'status'<>'saved' or result->'enrolment'->>'status'<>'active' or (result->'enrolment'->>'baseline')::int<>4 then raise exception 'Start not saved: %', result; end if;
 if (result->'enrolment'->>'started_on')::date<>(now() at time zone 'Asia/Kolkata')::date then raise exception 'Start date is not the India date: %', result; end if;
 -- A retried start returns the same row.
 result:=public.start_programme('f8000000-0000-4000-8000-000000000101',potty,'potty-training',4::smallint);
 if result->>'status'<>'saved' or (select count(*) from public.programme_enrolments)<>1 then raise exception 'Retry duplicated a start'; end if;
 -- A second start of the same programme for the same child returns the active one.
 result:=public.start_programme('f8000000-0000-4000-8000-000000000101','f8000000-0000-4000-8000-000000000202','potty-training',2::smallint);
 if result->>'status'<>'active' or (result->'enrolment'->>'id')::uuid<>potty or (select count(*) from public.programme_enrolments)<>1 then raise exception 'Two active enrolments for one programme: %', result; end if;
 -- A receipt cannot be reused for a different programme.
 begin perform public.start_programme('f8000000-0000-4000-8000-000000000101',potty,'screen-off',2::smallint); raise exception 'Receipt reused across programmes';
 exception when insufficient_privilege then null; end;
 -- A different programme can run at the same time.
 result:=public.start_programme('f8000000-0000-4000-8000-000000000101',screens,'screen-off',3::smallint);
 if result->>'status'<>'saved' then raise exception 'Second programme not started: %', result; end if;

 -- Ticking a day bumps the revision; a retry of the same tick does not.
 result:=public.mark_programme_day(potty,1::smallint,true,0);
 if result->>'status'<>'saved' or not (result->'enrolment'->'progress' ? '1') or (result->'enrolment'->>'revision')::int<>1 then raise exception 'Day 1 not ticked: %', result; end if;
 if result->'enrolment'->'progress'->>'1'<>((now() at time zone 'Asia/Kolkata')::date)::text then raise exception 'Tick date is not the India date: %', result; end if;
 result:=public.mark_programme_day(potty,1::smallint,true,0);
 if result->>'status'<>'saved' or (result->'enrolment'->>'revision')::int<>1 then raise exception 'Retried tick changed the row: %', result; end if;
 -- A stale revision is a conflict, not an overwrite.
 result:=public.mark_programme_day(potty,2::smallint,true,0);
 if result->>'status'<>'conflict' or (result->'enrolment'->'progress' ? '2') then raise exception 'Stale tick applied: %', result; end if;
 -- Day bounds.
 begin perform public.mark_programme_day(potty,15::smallint,true,1); raise exception 'Day 15 accepted';
 exception when invalid_parameter_value then null; end;
 begin perform public.mark_programme_day(potty,0::smallint,true,1); raise exception 'Day 0 accepted';
 exception when invalid_parameter_value then null; end;
 -- Unticking.
 result:=public.mark_programme_day(potty,2::smallint,true,1);
 result:=public.mark_programme_day(potty,1::smallint,false,2);
 if result->>'status'<>'saved' or (result->'enrolment'->'progress' ? '1') or not (result->'enrolment'->'progress' ? '2') or (result->'enrolment'->>'revision')::int<>3 then raise exception 'Untick failed: %', result; end if;

 -- Finishing needs a valid rating and the current revision; finishing twice keeps the first.
 result:=public.finish_programme(potty,2::smallint,0);
 if result->>'status'<>'conflict' then raise exception 'Stale finish applied: %', result; end if;
 begin perform public.finish_programme(potty,9::smallint,3); raise exception 'Final rating 9 accepted';
 exception when check_violation then null; end;
 begin perform public.finish_programme(potty,null,3); raise exception 'Finish without a rating accepted';
 exception when check_violation then null; end;
 result:=public.finish_programme(potty,2::smallint,3);
 if result->>'status'<>'saved' or result->'enrolment'->>'status'<>'completed' or (result->'enrolment'->>'final')::int<>2 then raise exception 'Finish failed: %', result; end if;
 result:=public.finish_programme(potty,5::smallint,4);
 if (result->'enrolment'->>'final')::int<>2 then raise exception 'Second finish overwrote the rating: %', result; end if;
 if public.mark_programme_day(potty,3::smallint,true,4)->>'status'<>'completed' then raise exception 'Completed programme accepted a tick'; end if;
 if public.stop_programme(potty)->>'status'<>'completed' then raise exception 'Completed programme was stopped'; end if;
 -- After finishing, the same programme can be run again.
 result:=public.start_programme('f8000000-0000-4000-8000-000000000101','f8000000-0000-4000-8000-000000000204','potty-training',3::smallint);
 if result->>'status'<>'saved' or (result->'enrolment'->>'id')::uuid<>'f8000000-0000-4000-8000-000000000204'::uuid then raise exception 'Restart after finishing failed: %', result; end if;

 -- Stopping is idempotent and a stopped programme cannot be finished.
 if public.stop_programme(screens)->>'status'<>'stopped' or public.stop_programme(screens)->>'status'<>'stopped' then raise exception 'Stop failed'; end if;
 if public.finish_programme(screens,1::smallint,1)->>'status'<>'stopped' then raise exception 'Stopped programme was finished'; end if;

 -- Parents cannot write rows directly, and cannot run the aggregate.
 begin insert into public.programme_enrolments(id,user_id,child_id,programme_id,started_on,baseline) values(gen_random_uuid(),'f8000000-0000-4000-8000-000000000001','f8000000-0000-4000-8000-000000000101','body-talk-young',current_date,3); raise exception 'Direct insert allowed';
 exception when insufficient_privilege then null; end;
 begin update public.programme_enrolments set final=1; raise exception 'Direct update allowed';
 exception when insufficient_privilege then null; end;
 begin perform public.programme_metrics(); raise exception 'Parent ran programme metrics';
 exception when insufficient_privilege then null; end;
 begin perform private.own_enrolment(potty); raise exception 'Parent called the internal lock helper';
 exception when insufficient_privilege then null; end;
end $$;

-- Family 2 sees nothing of family 1 and cannot act on its child or enrolments.
select set_config('request.jwt.claims','{"sub":"f8000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal1"}',true);
do $$ begin
 if exists(select 1 from public.programme_enrolments) then raise exception 'Enrolments leaked across families'; end if;
 begin perform public.start_programme('f8000000-0000-4000-8000-000000000101','f8000000-0000-4000-8000-000000000205','potty-training',3::smallint); raise exception 'Started a programme for another family';
 exception when insufficient_privilege then null; end;
 begin perform public.mark_programme_day('f8000000-0000-4000-8000-000000000204',1::smallint,true,0); raise exception 'Ticked another family''s day';
 exception when insufficient_privilege then null; end;
 begin perform public.stop_programme('f8000000-0000-4000-8000-000000000204'); raise exception 'Stopped another family''s programme';
 exception when insufficient_privilege then null; end;
 begin perform public.finish_programme('f8000000-0000-4000-8000-000000000204',1::smallint,0); raise exception 'Finished another family''s programme';
 exception when insufficient_privilege then null; end;
 -- Even a guessed receipt id cannot be used to read another family's row.
 begin perform public.start_programme('f8000000-0000-4000-8000-000000000102','f8000000-0000-4000-8000-000000000204','potty-training',3::smallint); raise exception 'Receipt from another family returned';
 exception when insufficient_privilege then null; end;
end $$;
-- The family without consent cannot start.
select set_config('request.jwt.claims','{"sub":"f8000000-0000-4000-8000-000000000010","role":"authenticated","aal":"aal1"}',true);
do $$ begin
 begin perform public.start_programme('f8000000-0000-4000-8000-000000000110','f8000000-0000-4000-8000-000000000210','potty-training',3::smallint); raise exception 'Started without consent';
 exception when insufficient_privilege then null; end;
end $$;
-- Anonymous callers are refused.
reset role;
set local role anon;
do $$ begin
 begin perform public.start_programme('f8000000-0000-4000-8000-000000000101','f8000000-0000-4000-8000-000000000211','potty-training',3::smallint); raise exception 'Anonymous start';
 exception when insufficient_privilege then null; end;
end $$;
reset role;

-- Progress stays a small, well-formed object even for privileged writers.
do $$ begin
 begin insert into public.programme_enrolments(id,user_id,child_id,programme_id,started_on,baseline,progress) values(gen_random_uuid(),'f8000000-0000-4000-8000-000000000003','f8000000-0000-4000-8000-000000000103','screen-off',current_date,3,'{"15":"2026-10-21"}'); raise exception 'Day 15 progress stored';
 exception when check_violation then null; end;
 begin insert into public.programme_enrolments(id,user_id,child_id,programme_id,started_on,baseline,progress) values(gen_random_uuid(),'f8000000-0000-4000-8000-000000000003','f8000000-0000-4000-8000-000000000103','screen-off',current_date,3,'{"1":"yesterday"}'); raise exception 'Free text progress stored';
 exception when check_violation then null; end;
 begin insert into public.programme_enrolments(id,user_id,child_id,programme_id,started_on,baseline,progress) values(gen_random_uuid(),'f8000000-0000-4000-8000-000000000003','f8000000-0000-4000-8000-000000000103','screen-off',current_date,3,'[1,2]'); raise exception 'Array progress stored';
 exception when check_violation then null; end;
 begin insert into public.programme_enrolments(id,user_id,child_id,programme_id,started_on,baseline,status) values(gen_random_uuid(),'f8000000-0000-4000-8000-000000000003','f8000000-0000-4000-8000-000000000103','screen-off',current_date,3,'completed'); raise exception 'Completed without a final rating';
 exception when check_violation then null; end;
 -- The database itself holds the one-active rule, not only the function.
 begin insert into public.programme_enrolments(id,user_id,child_id,programme_id,started_on,baseline) values(gen_random_uuid(),'f8000000-0000-4000-8000-000000000001','f8000000-0000-4000-8000-000000000101','potty-training',current_date,3); raise exception 'Second active enrolment stored';
 exception when unique_violation then null; end;
end $$;

set local role service_role;
-- One family so far: every figure is suppressed.
do $$ declare m jsonb:=public.programme_metrics(); p jsonb; begin
 select x into p from jsonb_array_elements(m->'programmes') x where x->>'programme_id'='potty-training';
 if p->>'families'<>'<5' or p->>'enrolments'<>'<5' or p->>'completion_rate'<>'<5' or p->>'improved_rate'<>'<5' then raise exception 'Small numbers were not suppressed: %', m; end if;
end $$;
reset role;
-- Families 2-8 started potty training 30 days ago and finished it: 2-7 found it easier (4 -> 2), 8 harder (4 -> 5).
-- Family 9 started today and is still going. Family 10 (no consent) is excluded.
insert into public.programme_enrolments(id,user_id,child_id,programme_id,started_on,baseline,final,status,progress,created_at)
 select gen_random_uuid(),('f8000000-0000-4000-8000-0000000000'||lpad(g::text,2,'0'))::uuid,('f8000000-0000-4000-8000-0000000001'||lpad(g::text,2,'0'))::uuid,
  'potty-training',current_date-30,4,case when g=8 then 5 else 2 end,'completed','{"1":"2026-09-21","2":"2026-09-22"}',now()-interval '30 days' from generate_series(2,8) g;
insert into public.programme_enrolments(id,user_id,child_id,programme_id,started_on,baseline) values
 (gen_random_uuid(),'f8000000-0000-4000-8000-000000000009','f8000000-0000-4000-8000-000000000109','potty-training',current_date,5);
insert into public.programme_enrolments(id,user_id,child_id,programme_id,started_on,baseline,final,status,created_at) values
 (gen_random_uuid(),'f8000000-0000-4000-8000-000000000010','f8000000-0000-4000-8000-000000000110','potty-training',current_date-30,5,1,'completed',now()-interval '30 days');
set local role service_role;
do $$ declare m jsonb:=public.programme_metrics(); p jsonb; s jsonb; begin
 select x into p from jsonb_array_elements(m->'programmes') x where x->>'programme_id'='potty-training';
 select x into s from jsonb_array_elements(m->'programmes') x where x->>'programme_id'='screen-off';
 -- Families 1-9: family 1 has a completed and an active enrolment.
 if (p->>'families')::int<>9 or (p->>'enrolments')::int<>10 then raise exception 'Consented families and enrolments: %', p; end if;
 if (p->>'completed')::int<>8 then raise exception 'Completed: %', p; end if;
 if p->>'active'<>'<5' then raise exception 'Two active families exposed: %', p; end if;
 -- Completion counts only enrolments at least 14 days old: families 2-8, all completed.
 if (p->>'completion_rate')::numeric<>1 then raise exception 'Completion rate: %', p; end if;
 -- Improved: family 1 (4 -> 2) and families 2-7, of 8 completed.
 if (p->>'improved_rate')::numeric<>0.875 then raise exception 'Improved rate: %', p; end if;
 -- Screen-off rests on one family only.
 if s->>'families'<>'<5' or s->>'stopped'<>'<5' then raise exception 'Single-family programme exposed: %', s; end if;
 if m::text ~ 'f8000000' then raise exception 'Identifiers in aggregate output'; end if;
end $$;
reset role;
rollback;
