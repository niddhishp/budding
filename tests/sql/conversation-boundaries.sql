begin;
insert into auth.users(id,email) values ('f5000000-0000-4000-8000-000000000001','conversation@example.invalid');
insert into public.consents(user_id,policy_version) values ('f5000000-0000-4000-8000-000000000001','2026-10-05');
insert into public.children(id,user_id,name,dob) values
 ('f5000000-0000-4000-8000-000000000011','f5000000-0000-4000-8000-000000000001','Synthetic child','2015-01-01');
insert into public.decodes(id,user_id,child_id,scenario,analysis,safety_category,risk_level) values
 ('f5000000-0000-4000-8000-000000000031','f5000000-0000-4000-8000-000000000001','f5000000-0000-4000-8000-000000000011','Fictional phone conversation','{"sayThis":"Fictional practice reply: No","conversation":{"mode":"rehearse"}}','none','none'),
 ('f5000000-0000-4000-8000-000000000032','f5000000-0000-4000-8000-000000000001','f5000000-0000-4000-8000-000000000011','A difficult day','{"sayThis":"What would help?","conversation":{"mode":"talk"}}','parent_distress','low');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"f5000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',true);
do $$ begin
 begin
  perform public.record_decode_outcome('f5000000-0000-4000-8000-000000000031','worked');
  raise exception 'Fiction converted into outcome';
 exception when check_violation then null; end;
 begin
  insert into public.memories(child_id,decode_id,kind,content,source)
  values ('f5000000-0000-4000-8000-000000000011','f5000000-0000-4000-8000-000000000031','fact','Fiction treated as fact','parent_said');
  raise exception 'Fiction converted into memory';
 exception when check_violation then null; end;
 if exists(select 1 from public.memories where child_id='f5000000-0000-4000-8000-000000000011') then raise exception 'Conversation memory escaped'; end if;
end $$;
reset role;
set local role service_role;
do $$ begin
 begin
  insert into public.decodes(user_id,child_id,scenario,analysis,safety_category,risk_level,continuation_of) values
  ('f5000000-0000-4000-8000-000000000001','f5000000-0000-4000-8000-000000000011','Real situation','{}','none','none','f5000000-0000-4000-8000-000000000031');
  raise exception 'Fiction linked to real situation';
 exception when insufficient_privilege then null; end;
 insert into public.decodes(user_id,child_id,scenario,analysis,safety_category,risk_level,continuation_of) values
 ('f5000000-0000-4000-8000-000000000001','f5000000-0000-4000-8000-000000000011','Continue talking','{"conversation":{"mode":"talk"}}','none','none','f5000000-0000-4000-8000-000000000032');
 -- Even a faulty background worker cannot store a conversation as child memory.
 insert into public.guidance_jobs(decode_id,user_id,child_id,state,lease) values
 ('f5000000-0000-4000-8000-000000000031','f5000000-0000-4000-8000-000000000001','f5000000-0000-4000-8000-000000000011','running','f5000000-0000-4000-8000-000000000041');
 begin
  perform public.finish_guidance_job('f5000000-0000-4000-8000-000000000031','f5000000-0000-4000-8000-000000000041',
   '[{"kind":"fact","content":"Fiction extracted","source":"parent_said","confidence":1,"sensitive":false}]');
  raise exception 'Worker stored fictional memory';
 exception when check_violation then null; end;
 perform public.finish_guidance_job('f5000000-0000-4000-8000-000000000031','f5000000-0000-4000-8000-000000000041','[]');
end $$;
reset role;
rollback;
