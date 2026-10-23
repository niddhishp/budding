begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('d3000000-0000-4000-8000-000000000001','log-a@example.invalid',now()),
 ('d3000000-0000-4000-8000-000000000002','log-b@example.invalid',now());
insert into public.consents(user_id,policy_version) values
 ('d3000000-0000-4000-8000-000000000001','2026-10-05'),('d3000000-0000-4000-8000-000000000002','2026-10-05');
insert into public.children(id,user_id,name,dob) values
 ('d3000000-0000-4000-8000-000000000011','d3000000-0000-4000-8000-000000000001','Log child','2020-01-01'),
 ('d3000000-0000-4000-8000-000000000021','d3000000-0000-4000-8000-000000000002','Other family','2020-01-01');
insert into public.context_logs(id,child_id,user_id,content,log_type) values
 ('d3000000-0000-4000-8000-000000000031','d3000000-0000-4000-8000-000000000011','d3000000-0000-4000-8000-000000000001','Settles with a song after the park. Started at the new creche.','observation'),
 ('d3000000-0000-4000-8000-000000000032','d3000000-0000-4000-8000-000000000021','d3000000-0000-4000-8000-000000000002','Other family note','observation');
insert into public.memories(user_id,child_id,kind,content,source,confidence,sensitive,confirmed_at) values
 ('d3000000-0000-4000-8000-000000000001','d3000000-0000-4000-8000-000000000011','preference','Settles with a song','parent_said',1,false,now());

-- Parents cannot call the commit function themselves.
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"d3000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',true);
do $$ begin
 begin
  perform public.propose_log_memories('d3000000-0000-4000-8000-000000000031','d3000000-0000-4000-8000-000000000001','[]');
  raise exception 'Parent executed the worker function';
 exception when insufficient_privilege then null; end;
end $$;
reset role;

set local role service_role;
do $$ declare added integer; begin
 -- Ownership: the log must belong to the user the worker names.
 begin
  perform public.propose_log_memories('d3000000-0000-4000-8000-000000000032','d3000000-0000-4000-8000-000000000001','[{"kind":"fact","content":"Cross family","source":"parent_said","confidence":1,"sensitive":false}]');
  raise exception 'Cross-family log accepted';
 exception when insufficient_privilege then null; end;
 -- Bounds and shape.
 begin
  perform public.propose_log_memories('d3000000-0000-4000-8000-000000000031','d3000000-0000-4000-8000-000000000001',
   '[{"kind":"fact","content":"1","source":"parent_said","confidence":1,"sensitive":false},{"kind":"fact","content":"2","source":"parent_said","confidence":1,"sensitive":false},{"kind":"fact","content":"3","source":"parent_said","confidence":1,"sensitive":false},{"kind":"fact","content":"4","source":"parent_said","confidence":1,"sensitive":false},{"kind":"fact","content":"5","source":"parent_said","confidence":1,"sensitive":false}]');
  raise exception 'More than four suggestions accepted';
 exception when others then if sqlerrm<>'Invalid memories' then raise; end if; end;
 begin
  perform public.propose_log_memories('d3000000-0000-4000-8000-000000000031','d3000000-0000-4000-8000-000000000001','[{"kind":"fact","content":"Forged provenance","source":"log","confidence":1,"sensitive":false}]');
  raise exception 'Worker chose the provenance itself';
 exception when others then if sqlerrm<>'Invalid memories' then raise; end if; end;
 -- Suggestions: unconfirmed, 30-day review, parent statements as "log", inferences capped, duplicates skipped.
 select public.propose_log_memories('d3000000-0000-4000-8000-000000000031','d3000000-0000-4000-8000-000000000001',
  '[{"kind":"fact","content":"Started at the new creche","source":"parent_said","confidence":1,"sensitive":false},
    {"kind":"pattern","content":"Transitions after the park are hard","source":"ai_inferred","confidence":0.95,"sensitive":false},
    {"kind":"preference","content":"settles with a SONG","source":"parent_said","confidence":1,"sensitive":false}]') into added;
 if added<>2 then raise exception 'Expected two new suggestions, got %', added; end if;
 if not exists(select 1 from public.memories where child_id='d3000000-0000-4000-8000-000000000011' and content='Started at the new creche' and source='log' and confidence=1 and confirmed_at is null and decode_id is null and expires_at between now()+interval '29 days' and now()+interval '31 days') then raise exception 'Parent-stated suggestion wrong'; end if;
 if not exists(select 1 from public.memories where child_id='d3000000-0000-4000-8000-000000000011' and content='Transitions after the park are hard' and source='ai_inferred' and confidence between 0.69 and 0.71 and confirmed_at is null) then raise exception 'Inference not capped or confirmed'; end if;
 if (select count(*) from public.memories where child_id='d3000000-0000-4000-8000-000000000011' and lower(content)='settles with a song')<>1 then raise exception 'Duplicate memory created'; end if;
 -- Retry is idempotent.
 select public.propose_log_memories('d3000000-0000-4000-8000-000000000031','d3000000-0000-4000-8000-000000000001',
  '[{"kind":"fact","content":"Started at the new creche","source":"parent_said","confidence":1,"sensitive":false}]') into added;
 if added<>0 then raise exception 'Retry duplicated a suggestion'; end if;
 -- Pause at commit time: nothing is written, no error.
 update public.children set memory_enabled=false where id='d3000000-0000-4000-8000-000000000011';
 select public.propose_log_memories('d3000000-0000-4000-8000-000000000031','d3000000-0000-4000-8000-000000000001',
  '[{"kind":"fact","content":"Paused extraction","source":"parent_said","confidence":1,"sensitive":false}]') into added;
 if added<>0 or exists(select 1 from public.memories where content='Paused extraction') then raise exception 'Paused child received a suggestion'; end if;
 update public.children set memory_enabled=true where id='d3000000-0000-4000-8000-000000000011';
 -- Withdrawn consent at commit time.
 delete from public.consents where user_id='d3000000-0000-4000-8000-000000000001';
 begin
  perform public.propose_log_memories('d3000000-0000-4000-8000-000000000031','d3000000-0000-4000-8000-000000000001','[{"kind":"fact","content":"After consent","source":"parent_said","confidence":1,"sensitive":false}]');
  raise exception 'Suggestion saved without consent';
 exception when insufficient_privilege then null; end;
end $$;
reset role;

-- The parent sees the suggestions as theirs to review; the other family sees nothing.
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"d3000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal1"}',true);
do $$ begin
 if exists(select 1 from public.memories where child_id='d3000000-0000-4000-8000-000000000011') then raise exception 'Cross-family suggestion visible'; end if;
end $$;
reset role;

-- Erasure: the account removal cascades through the note and its suggestions.
delete from auth.users where id='d3000000-0000-4000-8000-000000000001';
do $$ begin
 if exists(select 1 from public.context_logs where user_id='d3000000-0000-4000-8000-000000000001') or exists(select 1 from public.memories where user_id='d3000000-0000-4000-8000-000000000001') then raise exception 'Erasure left log data'; end if;
end $$;
rollback;
