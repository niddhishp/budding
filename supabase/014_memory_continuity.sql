-- Additive controls. Original content and all existing family records are preserved.
alter table public.children add column memory_enabled boolean not null default true;
alter table public.memories
 add column confirmed_at timestamptz,
 add column expires_at timestamptz,
 add column edited_at timestamptz,
 add column revision integer not null default 1 check (revision > 0);
alter table public.decodes add column continuation_of uuid references public.decodes on delete set null;
create index decodes_continuation_idx on public.decodes(continuation_of) where continuation_of is not null;

create function private.advance_memory_revision() returns trigger
language plpgsql security invoker set search_path='' as $$
begin new.revision:=old.revision+1; return new; end $$;
create trigger memory_revision before update on public.memories
for each row execute function private.advance_memory_revision();

create function private.check_decode_continuation() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if new.continuation_of is not null and (new.continuation_of=new.id or not exists(
  select 1 from public.decodes d where d.id=new.continuation_of and d.user_id=new.user_id and d.child_id=new.child_id and d.safety_category='none'
 )) then raise insufficient_privilege using message='Earlier situation unavailable'; end if;
 if TG_OP='UPDATE' and new.continuation_of is distinct from old.continuation_of and new.continuation_of is not null then
  raise exception 'Saved situation links are immutable';
 end if;
 return new;
end $$;
create trigger decode_continuation before insert or update of continuation_of on public.decodes
for each row execute function private.check_decode_continuation();

create or replace function public.complete_guidance(p_id uuid,p_lease uuid,p_payload jsonb) returns uuid
language plpgsql security invoker set search_path='' as $$
declare r public.guidance_requests; output_id uuid;
begin
 select * into r from public.guidance_requests where id=p_id;
 if not found then raise exception 'Request unavailable'; end if;
 perform pg_advisory_xact_lock(hashtextextended(r.user_id::text,821));
 select * into r from public.guidance_requests where id=p_id for update;
 if not found or r.state<>'pending' or r.lease<>p_lease or r.expires_at<now() then raise exception 'Generation lease expired'; end if;
 perform 1 from public.consents where user_id=r.user_id and policy_version='2026-10-05' for share;
 if not found or not exists(select 1 from public.children where id=r.child_id and user_id=r.user_id) then raise insufficient_privilege; end if;
 output_id:=gen_random_uuid();
 if r.kind='decode' then
  insert into public.decodes(id,user_id,child_id,scenario,analysis,risk_level,safety_category,model,refines,channel,continuation_of)
  values(output_id,r.user_id,r.child_id,p_payload->>'scenario',p_payload->'analysis',p_payload->>'risk_level',p_payload->>'safety_category',p_payload->>'model',r.refines,coalesce(p_payload->>'channel','app'),nullif(p_payload->>'continuation_of','')::uuid);
  if p_payload->>'safety_category'='none' then insert into public.guidance_jobs(decode_id,user_id,child_id) values(output_id,r.user_id,r.child_id); end if;
 elsif r.kind='story' then
  insert into public.stories(id,user_id,child_id,theme,language,title,body,moral,model)
  values(output_id,r.user_id,r.child_id,p_payload->>'theme',p_payload->>'language',p_payload->>'title',p_payload->>'body',p_payload->>'moral',p_payload->>'model');
 elsif r.kind='report' then
  insert into public.reports(id,user_id,child_id,period_start,period_end,report,model)
  values(output_id,r.user_id,r.child_id,(p_payload->>'period_start')::timestamptz,(p_payload->>'period_end')::timestamptz,p_payload->'report',p_payload->>'model');
 else output_id:=null; end if;
 update public.guidance_requests set state='complete',result_id=output_id,updated_at=now() where id=p_id;
 return output_id;
end $$;
revoke all on function public.complete_guidance(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.complete_guidance(uuid,uuid,jsonb) to service_role;

create or replace function public.finish_guidance_job(p_decode uuid,p_lease uuid,p_memories jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare j public.guidance_jobs; m jsonb;
begin
 select * into j from public.guidance_jobs where decode_id=p_decode and state='running' and lease=p_lease for update;
 if not found then raise exception 'Job lease expired'; end if;
 perform 1 from public.consents where user_id=j.user_id and policy_version='2026-10-05' for share;
 if not found then raise insufficient_privilege; end if;
 perform 1 from public.children where id=j.child_id and user_id=j.user_id and memory_enabled for share;
 if not found then
  update public.guidance_jobs set state='complete',updated_at=now() where decode_id=j.decode_id;
  return;
 end if;
 if jsonb_typeof(p_memories)<>'array' or jsonb_array_length(p_memories)>4 then raise exception 'Invalid memories'; end if;
 for m in select value from jsonb_array_elements(p_memories) loop
  if not exists(select 1 from public.memories where child_id=j.child_id and lower(content)=lower(m->>'content')) then
   insert into public.memories(user_id,child_id,decode_id,kind,content,source,confidence,sensitive,confirmed_at,expires_at)
   values(j.user_id,j.child_id,j.decode_id,m->>'kind',m->>'content',m->>'source',case when m->>'source'='parent_said' then 1 else least((m->>'confidence')::numeric,0.7) end,(m->>'sensitive')::boolean,null,now()+interval '30 days');
  end if;
 end loop;
 update public.guidance_jobs set state='complete',updated_at=now() where decode_id=j.decode_id;
end $$;
revoke all on function public.finish_guidance_job(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.finish_guidance_job(uuid,uuid,jsonb) to service_role;

-- Re-rating must never recreate an archived memory or overwrite a parent's correction.
create or replace function public.record_decode_outcome(p_id uuid,p_outcome text) returns void language plpgsql security invoker set search_path='' as $$
declare d public.decodes; memory_exists boolean; enabled boolean; note text; category text;
begin
 if p_outcome not in ('worked','partly','did_not_work') then raise exception 'Invalid outcome'; end if;
 select * into d from public.decodes where id=p_id and user_id=auth.uid() for update;
 if not found then raise insufficient_privilege; end if;
 update public.decodes set outcome=p_outcome,outcome_at=now() where id=p_id;
 if d.safety_category<>'none' or d.analysis->>'sayThis' is null then return; end if;
 category:=case when p_outcome='did_not_work' then 'what_didnt' else 'what_worked' end;
 note:=left(left(d.scenario,90)||' → '||(d.analysis->>'sayThis')||case when p_outcome='partly' then ' (partly)' else '' end,480);
 select exists(select 1 from public.memories where decode_id=p_id and source='decode_outcome') into memory_exists;
 if memory_exists then
  update public.memories set kind=category,content=note where decode_id=p_id and source='decode_outcome' and edited_at is null;
 else
  select memory_enabled into enabled from public.children where id=d.child_id and user_id=d.user_id for share;
  if enabled then
   insert into public.memories(user_id,child_id,decode_id,kind,content,source,confidence,sensitive,confirmed_at,expires_at)
   values(d.user_id,d.child_id,p_id,category,note,'decode_outcome',1,false,now(),now()+interval '90 days');
  end if;
 end if;
end $$;
revoke all on function public.record_decode_outcome(uuid,text) from public,anon;
grant execute on function public.record_decode_outcome(uuid,text) to authenticated;
