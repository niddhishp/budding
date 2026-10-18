-- Synthetic fixtures only, no external transport.
begin;
set local statement_timeout='30s';
insert into auth.users(id,email,email_confirmed_at)
select ('b0000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'delivery-'||n||'@example.invalid',now() from generate_series(1,7) n;
insert into auth.sessions(id,user_id,aal) values ('b0000000-0000-4000-8001-000000000001','b0000000-0000-4000-8000-000000000001','aal2');
insert into public.admin_memberships(user_id,role) values ('b0000000-0000-4000-8000-000000000001','owner');
insert into public.consents(user_id,policy_version) select id,'2026-10-05' from auth.users where email like 'delivery-%' and email<>'delivery-1@example.invalid';
insert into public.expert_requests(id,user_id,concern,phone,created_at)
select ('b0000000-0000-4000-8002-'||lpad(n::text,12,'0'))::uuid,('b0000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'Synthetic delivery case','1234567890',now()-interval '2 days' from generate_series(2,7) n;
create function pg_temp.expect_error(command text,expected text) returns void language plpgsql as $$ begin
 begin execute command; exception when others then if sqlstate=expected or sqlerrm=expected then return; end if; raise; end;
 raise exception 'Unexpected success: %',command;
end $$;
select set_config('request.jwt.claims','{"sub":"b0000000-0000-4000-8000-000000000001","session_id":"b0000000-0000-4000-8001-000000000001","role":"authenticated","aal":"aal2"}',true);
set local role authenticated;
do $$ declare eid uuid; p jsonb; r jsonb; begin
 if (public.admin_consultations('overdue')->>'total')::int<>6 then raise exception 'Missing overdue requests'; end if;
 if (public.admin_overview()->'counts'->>'needs_follow_up')::int<>6 then raise exception 'Missing overview follow-ups'; end if;
 if (public.admin_consultations('delivery')->>'total')::int<>6 then raise exception 'Missing pending alerts'; end if;
 eid:=public.save_expert('{"name":"Capacity test","title":"Psychologist","qualifications":"Test","specialties":"Support","languages":"English","age_min":0,"age_max":18,"pregnancy_support":false,"fee_inr":1000,"session_minutes":45,"active":true,"reviewed":true,"verification_note":"Test review","max_open_requests":1,"daily_session_limit":1,"buffer_minutes":15}');
 perform set_config('test.expert',eid::text,true);
 perform public.update_consultation(jsonb_build_object('id','b0000000-0000-4000-8002-000000000002','version',1,'status','contacted','expert_id',eid,'note','Assignment'));
 p:=jsonb_build_object('id','b0000000-0000-4000-8002-000000000003','version',1,'status','contacted','expert_id',eid,'note','Second assignment');
 perform pg_temp.expect_error(format('select public.update_consultation(%L)',p),'This expert has reached their open request limit.');
 perform public.update_consultation(jsonb_build_object('id','b0000000-0000-4000-8002-000000000002','version',2,'status','scheduled','expert_id',eid,'scheduled_at','2050-01-01T10:00:00Z','note','Confirmed time'));
 -- Notes on an existing booking remain possible while at capacity.
 perform public.update_consultation(jsonb_build_object('id','b0000000-0000-4000-8002-000000000002','version',3,'status','scheduled','expert_id',eid,'scheduled_at','2050-01-01T10:00:00Z','note','Existing booking retained'));
 -- Failed contact never claims the parent was reached. Replayed receipt is a no-op.
 p:=jsonb_build_object('id','b0000000-0000-4000-8002-000000000004','event_id','b0000000-0000-4000-8003-000000000004','version',1,'channel','phone','outcome','no_answer','follow_up_at',now()+interval '2 hours','note','Try again later');
 perform public.record_consultation_contact(p); perform public.record_consultation_contact(p);
 r:=public.admin_consultation('b0000000-0000-4000-8002-000000000004');
 if r->>'status'<>'new' or (r->>'version')::int<>2 or jsonb_array_length(r->'events')<>1 then raise exception 'Contact replay or status failure'; end if;
 perform pg_temp.expect_error(format('select public.record_consultation_contact(%L)',p||'{"note":"Different receipt"}'),'This contact receipt has already been used.');
 p:=p||'{"event_id":"b0000000-0000-4000-8003-000000000005","outcome":"reached"}';
 perform pg_temp.expect_error(format('select public.record_consultation_contact(%L)',p),'40001');
 p:=p||'{"version":2}';
 perform pg_temp.expect_error(format('select public.record_consultation_contact(%L)',p||jsonb_build_object('follow_up_at',now()-interval '1 minute')),'Choose a future follow-up time.');
 perform public.record_consultation_contact(p);
 if public.admin_consultation('b0000000-0000-4000-8002-000000000004')->>'status'<>'contacted' then raise exception 'Reached status missing'; end if;
 perform pg_temp.expect_error('select public.claim_consultation_alert(''b0000000-0000-4000-8002-000000000002'',''{}'')','42501');
end $$;
reset role;
update public.experts set max_open_requests=10,accepting_new=false where id=current_setting('test.expert')::uuid;
set local role authenticated;
select pg_temp.expect_error(format('select public.update_consultation(%L)',jsonb_build_object('id','b0000000-0000-4000-8002-000000000003','version',1,'status','contacted','expert_id',current_setting('test.expert'))),'This expert is not accepting new requests.');
reset role;
update public.experts set accepting_new=true where id=current_setting('test.expert')::uuid;
set local role authenticated;
do $$ declare p jsonb; begin
 p:=jsonb_build_object('id','b0000000-0000-4000-8002-000000000003','version',1,'status','contacted','expert_id',current_setting('test.expert'));
 perform public.update_consultation(p);
 p:=p||'{"version":2,"status":"scheduled","scheduled_at":"2050-01-01T10:50:00Z"}';
 perform pg_temp.expect_error(format('select public.update_consultation(%L)',p),'This expert already has a session at that time.');
 perform pg_temp.expect_error(format('select public.update_consultation(%L)',p||'{"scheduled_at":"2050-01-01T11:00:00Z"}'),'This expert has reached their daily session limit.');
 -- 18:30 UTC is a new day in India, despite the same UTC date.
 perform public.update_consultation(p||'{"scheduled_at":"2050-01-01T18:30:00Z"}');
end $$;
reset role;
do $$ declare j jsonb; old_token uuid; begin
 if (select count(*) from public.consultation_alerts)<>6 then raise exception 'Missing creation trigger'; end if;
 if public.claim_consultation_alert('b0000000-0000-4000-8002-000000000002',null) is not null then raise exception 'Missing config must block'; end if;
 if not exists(select 1 from public.consultation_alerts where state='blocked' and attempts=0) then raise exception 'Blocked consumed attempt'; end if;
 j:=public.claim_consultation_alert('b0000000-0000-4000-8002-000000000002','{"to":"synthetic@example.invalid"}'); old_token:=(j->>'lease')::uuid;
 if j is null then raise exception 'Missing claim'; end if;
 if public.claim_consultation_alert('b0000000-0000-4000-8002-000000000002','{}') is not null then raise exception 'Live lease claimed twice'; end if;
 update public.consultation_alerts set lease_until=now()-interval '1 second' where request_id='b0000000-0000-4000-8002-000000000002';
 j:=public.claim_consultation_alert('b0000000-0000-4000-8002-000000000002','{"to":"changed@example.invalid"}');
 if j->'payload'->>'to'<>'synthetic@example.invalid' then raise exception 'Retry mutated payload'; end if;
 perform pg_temp.expect_error(format('select public.finish_consultation_alert(%L,%L,null,null)','b0000000-0000-4000-8002-000000000002',old_token),'Delivery lease unavailable');
 perform public.finish_consultation_alert('b0000000-0000-4000-8002-000000000002',(j->>'lease')::uuid,'synthetic-provider-id',null);
 if public.claim_consultation_alert('b0000000-0000-4000-8002-000000000002','{}') is not null then raise exception 'Accepted resent'; end if;
 update public.consultation_alerts set first_attempt_at=now()-interval '24 hours',attempts=1,state='failed' where request_id='b0000000-0000-4000-8002-000000000003';
 perform public.claim_consultation_alert('b0000000-0000-4000-8002-000000000003','{}');
 if not exists(select 1 from public.consultation_alerts where request_id='b0000000-0000-4000-8002-000000000003' and state='needs_review' and attempts=1) then raise exception 'Unsafe retry window'; end if;
 update public.consultation_alerts set attempts=5,state='failed' where request_id='b0000000-0000-4000-8002-000000000004';
 perform public.claim_consultation_alert('b0000000-0000-4000-8002-000000000004','{}');
 if not exists(select 1 from public.consultation_alerts where request_id='b0000000-0000-4000-8002-000000000004' and state='needs_review') then raise exception 'Unbounded attempts'; end if;
 delete from public.consents where user_id='b0000000-0000-4000-8000-000000000005';
 if public.claim_consultation_alert('b0000000-0000-4000-8002-000000000005','{}') is not null then raise exception 'Withdrawn consent alerted'; end if;
 if not exists(select 1 from public.consultation_alerts where request_id='b0000000-0000-4000-8002-000000000005' and state='cancelled') then raise exception 'Withdrawn alert not cancelled'; end if;
end $$;
set local role authenticated;
select pg_temp.expect_error('select public.record_consultation_contact(''{"id":"b0000000-0000-4000-8002-000000000005","event_id":"b0000000-0000-4000-8003-000000000007","version":1,"channel":"phone","outcome":"reached","follow_up_at":"2050-01-01T10:00:00Z"}'')','Parent consent is withdrawn. Only cancellation is available.');
select set_config('request.jwt.claims','{"sub":"b0000000-0000-4000-8000-000000000006","role":"authenticated","aal":"aal1"}',true);
do $$ begin if exists(select 1 from public.consultation_alerts) then raise exception 'Parent saw ops alerts'; end if; end $$;
select pg_temp.expect_error('select public.record_consultation_contact(''{"id":"b0000000-0000-4000-8002-000000000006"}'')','42501');
reset role;
delete from auth.users where id='b0000000-0000-4000-8000-000000000002';
do $$ begin if exists(select 1 from public.consultation_alerts where request_id='b0000000-0000-4000-8002-000000000002') then raise exception 'Erasure retained alert'; end if; end $$;
rollback;
