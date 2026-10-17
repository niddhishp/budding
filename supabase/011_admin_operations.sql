-- Additive operational tools. Existing family records and request IDs are preserved.
set local lock_timeout='5s';
create temporary table admin_operations_preservation(relation_name text primary key,fingerprint text) on commit drop;
do $$ declare r record; digest text; projection text; begin
  for r in select schemaname,tablename from pg_tables where schemaname='public'
    or (schemaname='auth' and tablename in ('users','identities','sessions','mfa_factors'))
    or (schemaname='storage' and tablename in ('buckets','objects')) order by schemaname,tablename loop
    execute format('lock table %I.%I in share mode',r.schemaname,r.tablename);
    projection:=case when r.schemaname='public' and r.tablename='expert_requests' then 'to_jsonb(t) - ''{expert_id,scheduled_at,duration_minutes,version,updated_at}''::text[]' else 'to_jsonb(t)' end;
    execute format('select md5(coalesce(string_agg(h, '''' order by h),'''')) from (select md5((%s)::text) h from %I.%I t) s',projection,r.schemaname,r.tablename) into digest;
    insert into admin_operations_preservation values(format('%I.%I',r.schemaname,r.tablename),digest);
  end loop;
end $$;
create table public.experts (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 120),
  title text not null check (length(trim(title)) between 2 and 120),
  qualifications text not null check (length(trim(qualifications)) between 2 and 1000),
  registration text not null default '' check (length(registration)<=200),
  specialties text not null check (length(trim(specialties)) between 2 and 500),
  languages text not null check (length(trim(languages)) between 2 and 300),
  age_min integer not null default 0 check (age_min between 0 and 18),
  age_max integer not null default 18 check (age_max between 0 and 18 and age_max>=age_min),
  pregnancy_support boolean not null default false,
  bio text not null default '' check (length(bio)<=2000),
  email text not null default '' check (length(email)<=320),
  phone text not null default '' check (length(phone)<=30),
  availability text not null default '' check (length(availability)<=1000),
  fee_inr integer not null default 0 check (fee_inr between 0 and 100000),
  session_minutes integer not null default 45 check (session_minutes between 15 and 180),
  active boolean not null default true,
  verification_note text not null default '' check (length(verification_note)<=1000),
  verified_at timestamptz,
  verified_by uuid references auth.users on delete set null,
  staff_user_id uuid unique references auth.users on delete set null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.experts enable row level security;
revoke all on public.experts from public, anon, authenticated;
grant select on public.experts to authenticated;

alter table public.expert_requests
  add column expert_id uuid references public.experts on delete restrict,
  add column scheduled_at timestamptz,
  add column duration_minutes integer not null default 45 check(duration_minutes between 15 and 180),
  add column version integer not null default 1,
  add column updated_at timestamptz not null default now();
create index expert_requests_expert_idx on public.expert_requests(expert_id,scheduled_at);

create table public.consultation_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.expert_requests on delete cascade,
  actor_id uuid references auth.users on delete set null,
  action text not null,
  note text not null default '' check(length(note)<=2000),
  details jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);
create index consultation_events_request_idx on public.consultation_events(request_id,occurred_at);
alter table public.consultation_events enable row level security;
revoke all on public.consultation_events from public,anon,authenticated;
grant select on public.consultation_events to authenticated;

create function private.operations_access() returns boolean language sql stable security definer set search_path='' as $$
  select coalesce(private.admin_session()->>'aal'='aal2' and private.admin_session()->>'role' in ('owner','operations'),false);
$$;
create function private.consultation_access(target uuid) returns boolean language sql stable security definer set search_path='' as $$
  select private.operations_access() or coalesce(
    private.admin_session() @> '{"role":"therapist","aal":"aal2"}'::jsonb
    and exists(select 1 from public.expert_requests r join public.experts e on e.id=r.expert_id
      where r.id=target and e.staff_user_id=auth.uid() and e.active),false);
$$;
revoke all on function private.operations_access(),private.consultation_access(uuid) from public,anon;
grant execute on function private.operations_access(),private.consultation_access(uuid) to authenticated;
create policy "experts: authorized team" on public.experts for select to authenticated using (
  (select private.operations_access()) or (staff_user_id=(select auth.uid()) and active and
    (select private.admin_session()) @> '{"role":"therapist","aal":"aal2"}'::jsonb)
);
create policy "requests: authorized team" on public.expert_requests for select to authenticated using (private.consultation_access(id));
create policy "consultation events: authorized team" on public.consultation_events for select to authenticated using (private.consultation_access(request_id));

-- Parents can only insert the fields they supply, never assign themselves or forge a workflow state.
revoke insert,update,delete on public.expert_requests from anon,authenticated;
grant insert(user_id,child_id,concern,phone,preferred_language,preferred_time,source) on public.expert_requests to authenticated;
create function private.guard_open_request() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is not null and new.user_id<>auth.uid() then raise insufficient_privilege; end if;
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text,11));
  if exists(select 1 from public.expert_requests where user_id=new.user_id and status in ('new','contacted','scheduled')) then
    raise unique_violation using message='An open consultation already exists';
  end if;
  return new;
end $$;
revoke all on function private.guard_open_request() from public,anon,authenticated;
create trigger guard_open_request before insert on public.expert_requests for each row execute function private.guard_open_request();

create function private.save_expert(payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare eid uuid := nullif(payload->>'id','')::uuid; current_row public.experts; linked uuid; reviewed boolean;
begin
  if not private.operations_access() then raise insufficient_privilege; end if;
  if eid is not null then
    select * into current_row from public.experts where id=eid for update;
    if not found then raise no_data_found; end if;
    if (payload->>'version')::integer is distinct from current_row.version then raise exception 'This expert changed. Reload before saving.' using errcode='40001'; end if;
  end if;
  if nullif(trim(payload->>'staff_email'),'') is not null then
    select u.id into linked from auth.users u join public.admin_memberships m on m.user_id=u.id
      where lower(u.email)=lower(trim(payload->>'staff_email')) and u.email_confirmed_at is not null and m.active and m.role='therapist';
    if linked is null then raise exception 'Link an active therapist team member with a verified email first.'; end if;
  end if;
  reviewed := coalesce((payload->>'reviewed')::boolean,false);
  if reviewed and length(trim(coalesce(payload->>'verification_note','')))<5 then raise exception 'Record how credentials were checked.'; end if;
  if eid is null then
    insert into public.experts(name,title,qualifications,specialties,languages) values(payload->>'name',payload->>'title',payload->>'qualifications',payload->>'specialties',payload->>'languages') returning id into eid;
  end if;
  update public.experts set
    name=payload->>'name', title=payload->>'title', qualifications=payload->>'qualifications',
    registration=coalesce(payload->>'registration',''), specialties=payload->>'specialties', languages=payload->>'languages',
    age_min=(payload->>'age_min')::integer,age_max=(payload->>'age_max')::integer,pregnancy_support=(payload->>'pregnancy_support')::boolean,
    bio=coalesce(payload->>'bio',''),email=coalesce(payload->>'email',''),phone=coalesce(payload->>'phone',''),
    availability=coalesce(payload->>'availability',''),fee_inr=(payload->>'fee_inr')::integer,session_minutes=(payload->>'session_minutes')::integer,
    active=(payload->>'active')::boolean,staff_user_id=linked,verification_note=coalesce(payload->>'verification_note',''),
    verified_at=case when reviewed then case when current_row.qualifications is distinct from payload->>'qualifications' or current_row.registration is distinct from coalesce(payload->>'registration','') or current_row.verification_note is distinct from coalesce(payload->>'verification_note','') then now() else coalesce(current_row.verified_at,now()) end end,
    verified_by=case when reviewed then case when current_row.qualifications is distinct from payload->>'qualifications' or current_row.registration is distinct from coalesce(payload->>'registration','') or current_row.verification_note is distinct from coalesce(payload->>'verification_note','') then auth.uid() else coalesce(current_row.verified_by,auth.uid()) end end,
    version=coalesce(current_row.version,0)+1, updated_at=now()
    where id=eid;
  insert into public.admin_audit_events(actor_id,action,details) values(auth.uid(),'expert.saved',jsonb_build_object('expert_id',eid,'active',payload->'active','reviewed',reviewed));
  return eid;
end $$;

create function private.admin_experts() returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if not private.operations_access() then raise insufficient_privilege; end if;
  return (select coalesce(jsonb_agg(to_jsonb(e)||jsonb_build_object('staff_email',coalesce(u.email,'')) order by e.active desc,e.name,e.id),'[]'::jsonb)
    from public.experts e left join auth.users u on u.id=e.staff_user_id);
end $$;

create function private.admin_consultations(filter_status text default '', search_text text default '', page_number integer default 1)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; total integer;
begin
  if not (private.operations_access() or coalesce(private.admin_session() @> '{"role":"therapist","aal":"aal2"}'::jsonb,false)) then raise insufficient_privilege; end if;
  if page_number is null or page_number<1 or page_number>100000 or length(search_text)>100 or filter_status not in ('','new','contacted','scheduled','completed','cancelled') then raise exception 'Invalid filter'; end if;
  select count(*) into total from public.expert_requests r left join auth.users u on u.id=r.user_id
    where private.consultation_access(r.id) and (filter_status='' or r.status=filter_status)
      and (search_text='' or strpos(lower(coalesce(u.email,'')||' '||r.phone||' '||r.id::text),lower(search_text))>0);
  select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) into result from (
    select r.id,r.status,r.source,r.preferred_language,r.created_at,r.scheduled_at,r.expert_id,r.version,
      u.email as parent_email,e.name as expert_name
    from public.expert_requests r left join auth.users u on u.id=r.user_id left join public.experts e on e.id=r.expert_id
    where private.consultation_access(r.id) and (filter_status='' or r.status=filter_status)
      and (search_text='' or strpos(lower(coalesce(u.email,'')||' '||r.phone||' '||r.id::text),lower(search_text))>0)
    order by case when r.status='new' then 0 when r.status='contacted' then 1 when r.status='scheduled' then 2 else 3 end,
      case when r.source='safety' and r.status in ('new','contacted') then 0 else 1 end,r.created_at,r.id
    limit 25 offset (page_number-1)*25
  ) q;
  return jsonb_build_object('requests',result,'total',total,'page',page_number);
end $$;

create function private.admin_overview() returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if not (private.operations_access() or coalesce(private.admin_session() @> '{"role":"therapist","aal":"aal2"}'::jsonb,false)) then raise insufficient_privilege; end if;
  return jsonb_build_object('counts',(select jsonb_build_object(
    'new',count(*) filter(where status='new'),'contacted',count(*) filter(where status='contacted'),
    'scheduled',count(*) filter(where status='scheduled'),'completed',count(*) filter(where status='completed'),
    'cancelled',count(*) filter(where status='cancelled'),
    'needs_follow_up',count(*) filter(where (status='new' and created_at<now()-interval '1 day') or (status='scheduled' and scheduled_at<now())),
    'safety',count(*) filter(where source='safety' and status in ('new','contacted','scheduled')))
    from public.expert_requests r where private.consultation_access(r.id)),
    'ready_experts',case when private.operations_access() then (select count(*) from public.experts where active and verified_at is not null) else null end);
end $$;

create function private.admin_consultation(target uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  if not private.consultation_access(target) then raise insufficient_privilege; end if;
  select to_jsonb(r)||jsonb_build_object('parent_email',u.email,'child_name',c.name,'child_dob',c.dob,
    'expert_name',e.name,'consent_current',exists(select 1 from public.consents co where co.user_id=r.user_id and co.policy_version='2026-10-05'),
    'events',(select coalesce(jsonb_agg(to_jsonb(ev) order by (ev.details->>'version')::integer desc,ev.occurred_at desc),'[]'::jsonb) from public.consultation_events ev where ev.request_id=r.id))
    into result from public.expert_requests r join auth.users u on u.id=r.user_id
    left join public.children c on c.id=r.child_id and c.user_id=r.user_id left join public.experts e on e.id=r.expert_id where r.id=target;
  if result is null then raise no_data_found; end if;
  insert into public.admin_audit_events(actor_id,action,details) values(auth.uid(),'consultation.viewed',jsonb_build_object('request_id',target));
  return result;
end $$;

create function private.update_consultation(payload jsonb) returns void language plpgsql security definer set search_path='' as $$
declare r public.expert_requests; e public.experts; eid uuid; proposed_time timestamptz; proposed_status text; memo text; manager boolean;
begin
  if not private.consultation_access((payload->>'id')::uuid) then raise insufficient_privilege; end if;
  select * into r from public.expert_requests where id=(payload->>'id')::uuid for update;
  if not found then raise no_data_found; end if;
  -- Recheck after obtaining the row lock, including reassignment while waiting.
  if not private.consultation_access(r.id) then raise insufficient_privilege; end if;
  if (payload->>'version')::integer is distinct from r.version then raise exception 'This request changed. Reload before saving.' using errcode='40001'; end if;
  manager:=private.operations_access();
  proposed_status:=payload->>'status'; eid:=nullif(payload->>'expert_id','')::uuid;
  proposed_time:=nullif(payload->>'scheduled_at','')::timestamptz; memo:=trim(coalesce(payload->>'note',''));
  if length(memo)>2000 or proposed_status is null or proposed_status not in ('new','contacted','scheduled','completed','cancelled') then raise exception 'Invalid update'; end if;
  if not exists(select 1 from public.consents where user_id=r.user_id and policy_version='2026-10-05') and proposed_status<>'cancelled' then raise exception 'Parent consent is withdrawn. Only cancellation is available.'; end if;
  if not manager and (eid is distinct from r.expert_id or proposed_time is distinct from r.scheduled_at or
    (proposed_status<>r.status and not(r.status='scheduled' and proposed_status='completed'))) then raise insufficient_privilege; end if;
  if proposed_status<>r.status and not (
    (r.status='new' and proposed_status in ('contacted','cancelled')) or
    (r.status='contacted' and proposed_status in ('scheduled','cancelled')) or
    (r.status='scheduled' and proposed_status in ('contacted','completed','cancelled'))
  ) then raise exception 'That status transition is not available.'; end if;
  if r.status in ('completed','cancelled') and (eid is distinct from r.expert_id or proposed_time is distinct from r.scheduled_at) then raise exception 'Closed requests keep their assignment and schedule.'; end if;
  if proposed_status<>r.status and proposed_status in ('completed','cancelled') and length(memo)<5 then raise exception 'Add a short completion or cancellation note.'; end if;
  if eid is not null then
    select * into e from public.experts where id=eid for update;
    if not found then raise exception 'Expert not found.'; end if;
    if (eid is distinct from r.expert_id or proposed_status='scheduled') and (not e.active or e.verified_at is null) then raise exception 'Choose an active expert with reviewed credentials.'; end if;
  end if;
  if proposed_status='scheduled' then
    if eid is null or proposed_time is null then raise exception 'Choose an expert and a session time.'; end if;
    if (r.status<>'scheduled' or proposed_time is distinct from r.scheduled_at or eid is distinct from r.expert_id) and proposed_time<=now() then raise exception 'Choose a future session time.'; end if;
    if exists(select 1 from public.expert_requests other where other.expert_id=eid and other.id<>r.id and other.status='scheduled'
      and tstzrange(other.scheduled_at,other.scheduled_at+make_interval(mins=>other.duration_minutes),'[)') &&
        tstzrange(proposed_time,proposed_time+make_interval(mins=>case when r.status='scheduled' and eid=r.expert_id then r.duration_minutes else e.session_minutes end),'[)'))
      then raise exception 'This expert already has a session at that time.'; end if;
  end if;
  if proposed_status in ('new','contacted') then proposed_time:=null; end if;
  if proposed_status=r.status and eid is not distinct from r.expert_id and proposed_time is not distinct from r.scheduled_at and memo='' then raise exception 'No changes to save.'; end if;
  update public.expert_requests set status=proposed_status,expert_id=eid,scheduled_at=proposed_time,
    duration_minutes=case when proposed_status='scheduled' and (r.status<>'scheduled' or eid is distinct from r.expert_id) then e.session_minutes else r.duration_minutes end,
    version=version+1,updated_at=now() where id=r.id;
  insert into public.consultation_events(request_id,actor_id,action,note,details) values(r.id,auth.uid(),'updated',memo,
    jsonb_build_object('from',r.status,'to',proposed_status,'expert_id',eid,'expert_name',e.name,'scheduled_at',proposed_time,'version',r.version+1,'actor_role',private.admin_session()->>'role'));
  insert into public.admin_audit_events(actor_id,action,details) values(auth.uid(),'consultation.updated',jsonb_build_object('request_id',r.id,'from',r.status,'to',proposed_status));
end $$;

-- Public invoker wrappers; privileged implementations remain outside the Data API schema.
create function public.save_expert(payload jsonb) returns uuid language sql security invoker set search_path='' as $$ select private.save_expert(payload); $$;
create function public.admin_experts() returns jsonb language sql security invoker set search_path='' as $$ select private.admin_experts(); $$;
create function public.admin_consultations(filter_status text default '',search_text text default '',page_number integer default 1) returns jsonb language sql security invoker set search_path='' as $$ select private.admin_consultations(filter_status,search_text,page_number); $$;
create function public.admin_overview() returns jsonb language sql security invoker set search_path='' as $$ select private.admin_overview(); $$;
create function public.admin_consultation(target uuid) returns jsonb language sql security invoker set search_path='' as $$ select private.admin_consultation(target); $$;
create function public.update_consultation(payload jsonb) returns void language sql security invoker set search_path='' as $$ select private.update_consultation(payload); $$;
revoke all on function private.save_expert(jsonb),public.save_expert(jsonb),private.admin_experts(),public.admin_experts(),private.admin_consultations(text,text,integer),public.admin_consultations(text,text,integer),private.admin_overview(),public.admin_overview(),private.admin_consultation(uuid),public.admin_consultation(uuid),private.update_consultation(jsonb),public.update_consultation(jsonb) from public,anon;
grant execute on function private.save_expert(jsonb),public.save_expert(jsonb),private.admin_experts(),public.admin_experts(),private.admin_consultations(text,text,integer),public.admin_consultations(text,text,integer),private.admin_overview(),public.admin_overview(),private.admin_consultation(uuid),public.admin_consultation(uuid),private.update_consultation(jsonb),public.update_consultation(jsonb) to authenticated;

do $$ declare r record; digest text; projection text; begin
  for r in select * from admin_operations_preservation loop
    projection:=case when r.relation_name='public.expert_requests' then 'to_jsonb(t) - ''{expert_id,scheduled_at,duration_minutes,version,updated_at}''::text[]' else 'to_jsonb(t)' end;
    execute format('select md5(coalesce(string_agg(h, '''' order by h),'''')) from (select md5((%s)::text) h from %s t) s',projection,r.relation_name) into digest;
    if digest is distinct from r.fingerprint then raise exception 'Preservation check failed for %',r.relation_name; end if;
  end loop;
end $$;
