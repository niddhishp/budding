-- Server-authoritative generation receipts. No prompts or outputs are kept here.
create table public.guidance_requests (
 id uuid primary key, user_id uuid not null references auth.users on delete cascade,
 child_id uuid not null references public.children on delete cascade,
 kind text not null check(kind in ('decode','story','report','share')),
 fingerprint text not null, refines uuid references public.decodes on delete cascade,
 charged boolean not null default true,
 state text not null default 'pending' check(state in ('pending','complete','failed')),
 lease uuid not null default gen_random_uuid(), expires_at timestamptz not null default now()+interval '90 seconds',
 result_id uuid, attempts integer not null default 1,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index guidance_usage_idx on public.guidance_requests(user_id,kind,created_at desc);
alter table public.guidance_requests enable row level security;
revoke all on public.guidance_requests from public, anon, authenticated;
grant all on public.guidance_requests to service_role;

-- A queued job references an owned source; it never duplicates a conversation.
create table public.guidance_jobs (
 decode_id uuid primary key references public.decodes on delete cascade,
 user_id uuid not null references auth.users on delete cascade,
 child_id uuid not null references public.children on delete cascade,
 state text not null default 'pending' check(state in ('pending','running','complete','failed')),
 attempts integer not null default 0, lease uuid,
 available_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index guidance_jobs_due_idx on public.guidance_jobs(state,available_at);
alter table public.guidance_jobs enable row level security;
revoke all on public.guidance_jobs from public,anon,authenticated;
grant all on public.guidance_jobs to service_role;

alter table public.week_guides add column reviewed_at timestamptz, add column reviewed_by uuid references auth.users on delete set null;
drop policy "week_guides: signed-in read" on public.week_guides;
create policy "week_guides: reviewed read" on public.week_guides for select to authenticated using (reviewed_at is not null);

create function public.reserve_guidance(p_id uuid,p_user uuid,p_child uuid,p_kind text,p_fingerprint text,p_refines uuid default null,p_free boolean default false)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.guidance_requests; plus boolean; lim integer; used integer; pending integer; since_at timestamptz; root public.decodes; token uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,821));
 if not exists(select 1 from public.consents where user_id=p_user and policy_version='2026-10-05')
 or not exists(select 1 from public.children where id=p_child and user_id=p_user) then raise insufficient_privilege; end if;
 select * into r from public.guidance_requests where id=p_id for update;
 if found then
  if r.user_id<>p_user or r.child_id<>p_child or r.kind<>p_kind or r.fingerprint<>p_fingerprint or r.refines is distinct from p_refines then return jsonb_build_object('status','conflict'); end if;
  if r.state='complete' then return jsonb_build_object('status','complete','resultId',r.result_id); end if;
  if r.state='pending' and r.expires_at>now() then return jsonb_build_object('status','busy'); end if;
  if r.attempts>=3 then return jsonb_build_object('status','attempt_limit'); end if;
 end if;
 select exists(select 1 from public.subscriptions where user_id=p_user and (status in ('authenticated','active','pending') or (status='cancelled' and current_period_end>now()))) into plus;
 -- Failed generations remain free, but repeated provider attempts have a bounded budget.
 if (select coalesce(sum(attempts),0) from public.guidance_requests where user_id=p_user and created_at>now()-interval '1 day') >= (case when plus then 100 else 20 end) then return jsonb_build_object('status','processing_limit'); end if;
 since_at:=case when plus then now()-interval '1 day' else now()-interval '7 days' end;
 if p_refines is not null then
  select * into root from public.decodes where id=p_refines and user_id=p_user and child_id=p_child and refines is null and created_at>now()-interval '30 minutes';
  if not found or root.analysis->'clarify' is null or root.analysis->'clarify'='null'::jsonb then return jsonb_build_object('status','invalid_refinement'); end if;
  if (select count(*) from public.guidance_requests where refines=p_refines and id<>p_id and (state='complete' or (state='pending' and expires_at>now())))>=2 then return jsonb_build_object('status','refinement_limit'); end if;
 end if;
 if p_kind='decode' then
  lim:=case when plus then 10 else 3 end;
  select count(*) into used from public.decodes where user_id=p_user and safety_category='none' and refines is null and created_at>=since_at;
 elsif p_kind='story' then
  lim:=case when plus then 3 else 1 end;
  if not plus then since_at:='1970-01-01'; end if;
  select count(*) into used from public.stories where user_id=p_user and created_at>=since_at;
 elsif p_kind='report' then
  if not plus then return jsonb_build_object('status','limit','plus',false); end if;
  lim:=1; since_at:=now()-interval '1 day';
  select count(*) into used from public.reports where user_id=p_user and child_id=p_child and created_at>=since_at;
 elsif p_kind='share' then
  lim:=case when plus then 20 else 5 end; since_at:=now()-interval '1 day';
  select count(*) into used from public.guidance_requests where user_id=p_user and kind='share' and state='complete' and created_at>=since_at;
 else raise exception 'Unsupported generation'; end if;
 select count(*) into pending from public.guidance_requests where user_id=p_user and kind=p_kind and charged and state='pending' and expires_at>now() and id<>p_id and (p_kind<>'report' or child_id=p_child);
 if not p_free and p_refines is null and used+pending>=lim then return jsonb_build_object('status','limit','plus',plus,'limit',lim); end if;
 -- An account cannot fan out many simultaneous provider calls, including free refinements.
 if (select count(*) from public.guidance_requests where user_id=p_user and state='pending' and expires_at>now() and id<>p_id)>=2 then return jsonb_build_object('status','busy'); end if;
 token:=gen_random_uuid();
 insert into public.guidance_requests(id,user_id,child_id,kind,fingerprint,refines,charged,lease)
 values(p_id,p_user,p_child,p_kind,p_fingerprint,p_refines,not p_free and p_refines is null,token)
 on conflict(id) do update set state='pending',lease=token,expires_at=now()+interval '90 seconds',attempts=guidance_requests.attempts+1,updated_at=now();
 return jsonb_build_object('status','reserved','lease',token);
end $$;
revoke all on function public.reserve_guidance(uuid,uuid,uuid,text,text,uuid,boolean) from public,anon,authenticated;
grant execute on function public.reserve_guidance(uuid,uuid,uuid,text,text,uuid,boolean) to service_role;

-- Completion and saved output are one transaction. Expired workers cannot commit late.
create function public.complete_guidance(p_id uuid,p_lease uuid,p_payload jsonb) returns uuid
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
  insert into public.decodes(id,user_id,child_id,scenario,analysis,risk_level,safety_category,model,refines,channel)
  values(output_id,r.user_id,r.child_id,p_payload->>'scenario',p_payload->'analysis',p_payload->>'risk_level',p_payload->>'safety_category',p_payload->>'model',r.refines,coalesce(p_payload->>'channel','app'));
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

-- Keep authenticated reads and outcome updates; generation is server-only.
revoke insert on public.decodes,public.stories,public.reports from authenticated;

create function public.claim_guidance_job(p_user uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare j public.guidance_jobs; token uuid;
begin
 select * into j from public.guidance_jobs where user_id=p_user and attempts<3 and available_at<=now() and (state in ('pending','failed') or (state='running' and updated_at<now()-interval '2 minutes')) order by available_at for update skip locked limit 1;
 if not found then return null; end if;
 token:=gen_random_uuid();
 update public.guidance_jobs set state='running',lease=token,attempts=attempts+1,updated_at=now() where decode_id=j.decode_id;
 return jsonb_build_object('decodeId',j.decode_id,'childId',j.child_id,'lease',token);
end $$;
revoke all on function public.claim_guidance_job(uuid) from public,anon,authenticated;
grant execute on function public.claim_guidance_job(uuid) to service_role;

create function public.finish_guidance_job(p_decode uuid,p_lease uuid,p_memories jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare j public.guidance_jobs; m jsonb;
begin
 select * into j from public.guidance_jobs where decode_id=p_decode and state='running' and lease=p_lease for update;
 if not found then raise exception 'Job lease expired'; end if;
 perform 1 from public.consents where user_id=j.user_id and policy_version='2026-10-05' for share;
 if not found then raise insufficient_privilege; end if;
 if jsonb_typeof(p_memories)<>'array' or jsonb_array_length(p_memories)>4 then raise exception 'Invalid memories'; end if;
 for m in select value from jsonb_array_elements(p_memories) loop
  if not exists(select 1 from public.memories where child_id=j.child_id and lower(content)=lower(m->>'content')) then
   insert into public.memories(user_id,child_id,decode_id,kind,content,source,confidence,sensitive)
   values(j.user_id,j.child_id,j.decode_id,m->>'kind',m->>'content',m->>'source',case when m->>'source'='parent_said' then 1 else least((m->>'confidence')::numeric,0.7) end,(m->>'sensitive')::boolean);
  end if;
 end loop;
 update public.guidance_jobs set state='complete',updated_at=now() where decode_id=j.decode_id;
end $$;
revoke all on function public.finish_guidance_job(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.finish_guidance_job(uuid,uuid,jsonb) to service_role;

-- Atomic feedback and its derived memory; no delete/insert gap or duplicate outcome memory.
create function public.record_decode_outcome(p_id uuid,p_outcome text) returns void language plpgsql security invoker set search_path='' as $$
declare d public.decodes; begin
 if p_outcome not in ('worked','partly','did_not_work') then raise exception 'Invalid outcome'; end if;
 select * into d from public.decodes where id=p_id and user_id=auth.uid() for update;
 if not found then raise insufficient_privilege; end if;
 update public.decodes set outcome=p_outcome,outcome_at=now() where id=p_id;
 delete from public.memories where decode_id=p_id and source='decode_outcome';
 if d.safety_category='none' and d.analysis->>'sayThis' is not null then
  insert into public.memories(user_id,child_id,decode_id,kind,content,source,confidence,sensitive)
  values(d.user_id,d.child_id,p_id,case when p_outcome='did_not_work' then 'what_didnt' else 'what_worked' end,
   left(left(d.scenario,90)||' → '||(d.analysis->>'sayThis')||case when p_outcome='partly' then ' (partly)' else '' end,480),'decode_outcome',1,false);
 end if;
end $$;
revoke all on function public.record_decode_outcome(uuid,text) from public,anon;
grant execute on function public.record_decode_outcome(uuid,text) to authenticated;

create index guidance_requests_child_idx on public.guidance_requests(child_id);
create index guidance_requests_refines_idx on public.guidance_requests(refines) where refines is not null;
create index guidance_jobs_user_idx on public.guidance_jobs(user_id);
create index guidance_jobs_child_idx on public.guidance_jobs(child_id);
create index week_guides_reviewer_idx on public.week_guides(reviewed_by) where reviewed_by is not null;
