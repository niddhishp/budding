begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('d0000000-0000-4000-8000-000000000001','quiz-a@example.invalid',now()),
 ('d0000000-0000-4000-8000-000000000002','quiz-b@example.invalid',now());
insert into public.consents(user_id,policy_version) values ('d0000000-0000-4000-8000-000000000001','2026-10-05');
insert into public.children(id,user_id,name,dob) values ('d0000000-0000-4000-8000-000000000021','d0000000-0000-4000-8000-000000000002','Other family','2020-01-01');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"d0000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',true);
do $$ declare own_id uuid; affected integer; begin
 insert into public.children(name,dob,intake_answered) values('Optional intake','2020-01-01','{}') returning id into own_id;
 if (select cardinality(intake_answered) from public.children where id=own_id) <> 0 then raise exception 'Unknown answers lost'; end if;
 update public.children set intake_answered=array['flexibility','persistence'] where id=own_id;
 update public.children set intake_answered='{}' where id='d0000000-0000-4000-8000-000000000021';
 get diagnostics affected=row_count;
 if affected <> 0 then raise exception 'Cross-parent quiz update'; end if;
 begin
   update public.children set intake_answered=array['made_up'] where id=own_id;
   raise exception 'Invalid trait accepted';
 exception when check_violation then null; end;
 begin
   update public.children set intake_answered=array[null]::text[] where id=own_id;
   raise exception 'Null trait accepted';
 exception when check_violation then null; end;
end $$;
rollback;
