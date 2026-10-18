begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('d1000000-0000-4000-8000-000000000001','memory-a@example.invalid',now()),
 ('d1000000-0000-4000-8000-000000000002','memory-b@example.invalid',now());
insert into public.consents(user_id,policy_version) values
 ('d1000000-0000-4000-8000-000000000001','2026-10-05'),('d1000000-0000-4000-8000-000000000002','2026-10-05');
insert into public.children(id,user_id,name,dob) values
 ('d1000000-0000-4000-8000-000000000011','d1000000-0000-4000-8000-000000000001','Memory child','2020-01-01'),
 ('d1000000-0000-4000-8000-000000000012','d1000000-0000-4000-8000-000000000001','Sibling','2020-01-01'),
 ('d1000000-0000-4000-8000-000000000021','d1000000-0000-4000-8000-000000000002','Other family','2020-01-01');
insert into public.decodes(id,user_id,child_id,scenario,analysis,safety_category,risk_level) values
 ('d1000000-0000-4000-8000-000000000031','d1000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000011','Park transition','{"sayThis":"Let us pause"}','none','none'),
 ('d1000000-0000-4000-8000-000000000032','d1000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000011','Next park visit','{"sayThis":"We can try again"}','none','none'),
 ('d1000000-0000-4000-8000-000000000033','d1000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000011','Sensitive situation','{}','medical','low');
-- Service-only writes still enforce continuity boundaries.
set local role service_role;
do $$ begin
 begin
  insert into public.decodes(user_id,child_id,scenario,analysis,safety_category,risk_level,continuation_of) values
  ('d1000000-0000-4000-8000-000000000002','d1000000-0000-4000-8000-000000000021','Wrong parent','{}','none','none','d1000000-0000-4000-8000-000000000031');
  raise exception 'Cross-family continuity accepted';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.decodes(user_id,child_id,scenario,analysis,safety_category,risk_level,continuation_of) values
  ('d1000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000012','Wrong child','{}','none','none','d1000000-0000-4000-8000-000000000031');
  raise exception 'Cross-child continuity accepted';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.decodes(user_id,child_id,scenario,analysis,safety_category,risk_level,continuation_of) values
  ('d1000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000011','Sensitive continuation','{}','none','none','d1000000-0000-4000-8000-000000000033');
  raise exception 'Sensitive continuity accepted';
 exception when insufficient_privilege then null; end;
 insert into public.decodes(user_id,child_id,scenario,analysis,safety_category,risk_level,continuation_of) values
 ('d1000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000011','Valid continuation','{}','none','none','d1000000-0000-4000-8000-000000000031');
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"d1000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',true);
do $$ declare mid uuid; affected integer; begin
 perform public.record_decode_outcome('d1000000-0000-4000-8000-000000000031','worked');
 select id into mid from public.memories where decode_id='d1000000-0000-4000-8000-000000000031';
 if mid is null or not exists(select 1 from public.memories where id=mid and confirmed_at is not null and expires_at>now()) then raise exception 'Rating memory missing'; end if;
 update public.memories set archived=true where id=mid and revision=1;
 update public.memories set content='Stale overwrite' where id=mid and revision=1;
 get diagnostics affected=row_count;
 if affected<>0 then raise exception 'Stale revision accepted'; end if;
 perform public.record_decode_outcome('d1000000-0000-4000-8000-000000000031','did_not_work');
 if not exists(select 1 from public.memories where id=mid and archived and kind='what_didnt' and revision=3) then raise exception 'Stopped memory recreated or lost'; end if;
 update public.memories set content='Parent correction',edited_at=now(),sensitive=true,expires_at=now()-interval '1 day' where id=mid;
 perform public.record_decode_outcome('d1000000-0000-4000-8000-000000000031','partly');
 if not exists(select 1 from public.memories where id=mid and content='Parent correction' and sensitive and archived and expires_at<now()) then raise exception 'Parent control overwritten by rating'; end if;
 update public.children set memory_enabled=false where id='d1000000-0000-4000-8000-000000000011';
 perform public.record_decode_outcome('d1000000-0000-4000-8000-000000000032','worked');
 if exists(select 1 from public.memories where decode_id='d1000000-0000-4000-8000-000000000032') then raise exception 'Paused memory inserted'; end if;
 update public.children set memory_enabled=false where id='d1000000-0000-4000-8000-000000000021';
 get diagnostics affected=row_count;
 if affected<>0 then raise exception 'Cross-parent pause'; end if;
 begin
  insert into public.memories(child_id,kind,content,source) values('d1000000-0000-4000-8000-000000000021','fact','Foreign memory','parent_said');
  raise exception 'Cross-parent memory inserted';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
insert into public.guidance_jobs(decode_id,user_id,child_id,state,lease) values
 ('d1000000-0000-4000-8000-000000000031','d1000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000011','running','d1000000-0000-4000-8000-000000000041'),
 ('d1000000-0000-4000-8000-000000000032','d1000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000011','running','d1000000-0000-4000-8000-000000000042');
set local role service_role;
select public.finish_guidance_job('d1000000-0000-4000-8000-000000000031','d1000000-0000-4000-8000-000000000041','[{"kind":"fact","content":"Paused extraction","source":"parent_said","confidence":1,"sensitive":false}]');
do $$ begin if exists(select 1 from public.memories where content='Paused extraction') then raise exception 'Paused job saved memory'; end if; end $$;
update public.children set memory_enabled=true where id='d1000000-0000-4000-8000-000000000011';
select public.finish_guidance_job('d1000000-0000-4000-8000-000000000032','d1000000-0000-4000-8000-000000000042','[{"kind":"fact","content":"New suggestion","source":"parent_said","confidence":1,"sensitive":false}]');
do $$ begin
 if not exists(select 1 from public.memories where content='New suggestion' and confirmed_at is null and expires_at>now()) then raise exception 'Extraction did not require review'; end if;
end $$;
rollback;

