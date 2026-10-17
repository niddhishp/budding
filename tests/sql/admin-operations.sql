-- Entirely synthetic, rolled back on completion. Never sends messages or payments.
begin;
set local statement_timeout='30s';
insert into auth.users(id,email,email_confirmed_at)
select ('a0000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'admin-test-'||n||'@example.invalid',now() from generate_series(1,7) n;
insert into auth.sessions(id,user_id,aal)
select ('a0000000-0000-4000-8001-'||lpad(n::text,12,'0'))::uuid,('a0000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'aal2' from generate_series(1,7) n;
insert into public.admin_memberships(user_id,role) values
('a0000000-0000-4000-8000-000000000001','owner'),('a0000000-0000-4000-8000-000000000002','operations'),
('a0000000-0000-4000-8000-000000000003','therapist'),('a0000000-0000-4000-8000-000000000004','therapist'),
('a0000000-0000-4000-8000-000000000005','content_reviewer');
insert into public.consents(user_id,policy_version) values ('a0000000-0000-4000-8000-000000000006','2026-10-05'),('a0000000-0000-4000-8000-000000000007','2026-10-05');
insert into public.expert_requests(id,user_id,concern,phone) values
('a0000000-0000-4000-8002-000000000001','a0000000-0000-4000-8000-000000000006','Synthetic concern A','1234567890'),
('a0000000-0000-4000-8002-000000000002','a0000000-0000-4000-8000-000000000007','Synthetic concern B','1234567890');

create function pg_temp.as_actor(n integer,level text default 'aal2') returns void language plpgsql as $$ begin
 perform set_config('request.jwt.claims',jsonb_build_object('sub','a0000000-0000-4000-8000-'||lpad(n::text,12,'0'),'session_id','a0000000-0000-4000-8001-'||lpad(n::text,12,'0'),'role','authenticated','aal',level)::text,true);
end $$;
create function pg_temp.expect_error(command text,expected text) returns void language plpgsql as $$ begin
 begin execute command; exception when others then
   if sqlstate=expected or sqlerrm=expected then return; end if; raise;
 end;
 raise exception 'FAIL: command unexpectedly succeeded: %',command;
end $$;

set local role anon;
select pg_temp.expect_error('select public.admin_overview()','42501');
select pg_temp.expect_error('select * from public.experts','42501');
reset role;
set local role authenticated;
select pg_temp.as_actor(6);
select pg_temp.expect_error('select public.admin_overview()','42501');
select pg_temp.expect_error('select public.admin_experts()','42501');
select pg_temp.expect_error('select public.admin_consultation(''a0000000-0000-4000-8002-000000000001'')','42501');
select pg_temp.expect_error('insert into public.expert_requests(concern,phone,status) values(''Forged request'',''1234567890'',''completed'')','42501');
select pg_temp.expect_error('insert into public.expert_requests(concern,phone) values(''Duplicate request'',''1234567890'')','23505');
do $$ begin
 if (select count(*) from public.expert_requests)<>1 then raise exception 'FAIL: parent isolation'; end if;
 if exists(select 1 from public.consultation_events) then raise exception 'FAIL: parent sees internal history'; end if;
end $$;
select pg_temp.as_actor(5);
select pg_temp.expect_error('select public.admin_consultations()','42501');
select pg_temp.as_actor(1,'aal1');
select pg_temp.expect_error('select public.admin_experts()','42501');
select pg_temp.as_actor(2);
do $$ declare eid uuid; payload jsonb; begin
 payload:='{"name":"Synthetic Expert","title":"Psychologist","qualifications":"Synthetic degree","specialties":"Parent support","languages":"English, Hindi","age_min":0,"age_max":18,"pregnancy_support":true,"fee_inr":1200,"session_minutes":45,"active":true,"reviewed":true,"verification_note":"Synthetic credential review","staff_email":"admin-test-3@example.invalid"}';
 eid:=public.save_expert(payload);
 perform set_config('test.expert_id',eid::text,true);
 if jsonb_array_length(public.admin_experts())<1 then raise exception 'FAIL: ops roster'; end if;
 perform public.save_expert(payload||jsonb_build_object('id',eid,'version',1));
 perform pg_temp.expect_error(format('select public.save_expert(%L::jsonb)',payload||jsonb_build_object('id',eid,'version',1)),'40001');
 perform pg_temp.expect_error(format('select public.save_expert(%L::jsonb)',payload||jsonb_build_object('id',eid,'version',2,'staff_email','admin-test-5@example.invalid')),'Link an active therapist team member with a verified email first.');
 perform public.update_consultation(jsonb_build_object('id','a0000000-0000-4000-8002-000000000001','version',1,'status','contacted','expert_id',eid,'note','Parent contacted'));
 perform public.update_consultation(jsonb_build_object('id','a0000000-0000-4000-8002-000000000001','version',2,'status','scheduled','expert_id',eid,'scheduled_at',now()+interval '2 days','note','Time confirmed'));
 perform public.update_consultation(jsonb_build_object('id','a0000000-0000-4000-8002-000000000002','version',1,'status','contacted','expert_id',eid,'note','Parent contacted'));
 perform pg_temp.expect_error(format('select public.update_consultation(%L::jsonb)',jsonb_build_object('id','a0000000-0000-4000-8002-000000000002','version',2,'status','scheduled','expert_id',eid,'scheduled_at',now()+interval '2 days 10 minutes','note','Overlapping test')),'This expert already has a session at that time.');
 perform pg_temp.expect_error(format('select public.update_consultation(%L::jsonb)',jsonb_build_object('id','a0000000-0000-4000-8002-000000000002','version',2,'status','scheduled','expert_id',eid,'scheduled_at',now()-interval '1 day','note','Past test')),'Choose a future session time.');
 perform pg_temp.expect_error(format('select public.update_consultation(%L::jsonb)',jsonb_build_object('id','a0000000-0000-4000-8002-000000000001','version',1,'status','cancelled','expert_id',eid,'note','Stale test')),'40001');
 -- Unassign request B so the linked therapist should see only A.
 perform public.update_consultation(jsonb_build_object('id','a0000000-0000-4000-8002-000000000002','version',2,'status','contacted','note','Unassigned for testing'));
end $$;
select pg_temp.as_actor(4);
do $$ begin if (public.admin_consultations()->>'total')::int<>0 then raise exception 'FAIL: unassigned therapist saw cases'; end if; end $$;
select pg_temp.expect_error('select public.admin_consultation(''a0000000-0000-4000-8002-000000000001'')','42501');
select pg_temp.as_actor(3);
do $$ declare r jsonb; begin
 if (public.admin_consultations()->>'total')::int<>1 then raise exception 'FAIL: assigned therapist scope'; end if;
 if (select count(*) from public.expert_requests)<>1 then raise exception 'FAIL: direct REST therapist scope'; end if;
 r:=public.admin_consultation('a0000000-0000-4000-8002-000000000001');
 perform pg_temp.expect_error(format('select public.update_consultation(%L::jsonb)',jsonb_build_object('id',r->>'id','version',3,'status','scheduled','expert_id',null,'scheduled_at',r->>'scheduled_at','note','Attempt unassign')),'42501');
 perform public.update_consultation(jsonb_build_object('id',r->>'id','version',3,'status','completed','expert_id',r->>'expert_id','scheduled_at',r->>'scheduled_at','note','Session completed; follow-up coordinated'));
 perform pg_temp.expect_error(format('select public.update_consultation(%L::jsonb)',jsonb_build_object('id',r->>'id','version',4,'status','scheduled','expert_id',r->>'expert_id','scheduled_at',r->>'scheduled_at','note','Attempt reopen')),'42501');
end $$;
select pg_temp.expect_error('select public.admin_experts()','42501');
select pg_temp.expect_error('update public.experts set name=''Tampered''','42501');
select pg_temp.expect_error('insert into public.consultation_events(request_id,action) values(''a0000000-0000-4000-8002-000000000001'',''forged'')','42501');
reset role;
update public.admin_memberships set active=false where user_id='a0000000-0000-4000-8000-000000000003';
set local role authenticated;
select pg_temp.expect_error('select public.admin_consultation(''a0000000-0000-4000-8002-000000000001'')','42501');
select pg_temp.as_actor(6);
do $$ begin if exists(select 1 from public.consultation_events) then raise exception 'FAIL: parent sees staff notes'; end if; end $$;
select pg_temp.as_actor(7);
delete from public.consents where user_id=auth.uid();
select pg_temp.as_actor(2);
select pg_temp.expect_error('select public.update_consultation(''{"id":"a0000000-0000-4000-8002-000000000002","version":3,"status":"contacted","note":"Forbidden coordination"}'')','Parent consent is withdrawn. Only cancellation is available.');
select public.update_consultation('{"id":"a0000000-0000-4000-8002-000000000002","version":3,"status":"cancelled","note":"Parent withdrew consent"}');
reset role;
do $$ begin
 if not exists(select 1 from public.admin_audit_events where action='consultation.updated' and actor_id='a0000000-0000-4000-8000-000000000003') then raise exception 'FAIL: missing audit'; end if;
 delete from auth.users where id='a0000000-0000-4000-8000-000000000006';
 if exists(select 1 from public.consultation_events where request_id='a0000000-0000-4000-8002-000000000001') then raise exception 'FAIL: erasure retained notes'; end if;
end $$;
rollback;
