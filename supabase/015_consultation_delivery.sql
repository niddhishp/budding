-- Additive concierge delivery controls. Existing records and schedules are preserved.
set local lock_timeout='5s';
alter table public.experts
 add column accepting_new boolean not null default true,
 add column max_open_requests integer not null default 10 check(max_open_requests between 1 and 100),
 add column daily_session_limit integer not null default 4 check(daily_session_limit between 1 and 24),
 add column buffer_minutes integer not null default 15 check(buffer_minutes between 0 and 120);
alter table public.expert_requests add column next_follow_up_at timestamptz;
create function private.consultation_due(r public.expert_requests) returns timestamptz
language sql immutable security invoker set search_path='' as $$
 select case when r.status in ('completed','cancelled') then null else coalesce(r.next_follow_up_at,
 case when r.status='scheduled' then r.scheduled_at+make_interval(mins=>r.duration_minutes) else r.created_at+interval '24 hours' end) end;
$$;
revoke all on function private.consultation_due(public.expert_requests) from public,anon,authenticated;

create table public.consultation_alerts (
 request_id uuid primary key references public.expert_requests on delete cascade,
 state text not null default 'pending' check(state in ('pending','sending','accepted','failed','blocked','needs_review','cancelled')),
 attempts integer not null default 0 check(attempts between 0 and 5),
 lease uuid, lease_until timestamptz, first_attempt_at timestamptz,
 payload jsonb, provider_id text, last_error text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.consultation_alerts enable row level security;
revoke all on public.consultation_alerts from public,anon,authenticated;
grant select on public.consultation_alerts to authenticated;
grant all on public.consultation_alerts to service_role;
create policy "alerts: operations only" on public.consultation_alerts for select to authenticated using ((select private.operations_access()));
create function private.queue_consultation_alert() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.consultation_alerts(request_id) values(new.id); return new; end $$;
revoke all on function private.queue_consultation_alert() from public,anon,authenticated;
create trigger consultation_alert_created after insert on public.expert_requests for each row execute function private.queue_consultation_alert();

create or replace function private.save_expert(payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$
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
    accepting_new=coalesce((payload->>'accepting_new')::boolean,current_row.accepting_new,true),
    max_open_requests=coalesce((payload->>'max_open_requests')::integer,current_row.max_open_requests,10),
    daily_session_limit=coalesce((payload->>'daily_session_limit')::integer,current_row.daily_session_limit,4),
    buffer_minutes=coalesce((payload->>'buffer_minutes')::integer,current_row.buffer_minutes,15),
    availability=coalesce(payload->>'availability',''),fee_inr=(payload->>'fee_inr')::integer,session_minutes=(payload->>'session_minutes')::integer,
    active=(payload->>'active')::boolean,staff_user_id=linked,verification_note=coalesce(payload->>'verification_note',''),
    verified_at=case when reviewed then case when current_row.qualifications is distinct from payload->>'qualifications' or current_row.registration is distinct from coalesce(payload->>'registration','') or current_row.verification_note is distinct from coalesce(payload->>'verification_note','') then now() else coalesce(current_row.verified_at,now()) end end,
    verified_by=case when reviewed then case when current_row.qualifications is distinct from payload->>'qualifications' or current_row.registration is distinct from coalesce(payload->>'registration','') or current_row.verification_note is distinct from coalesce(payload->>'verification_note','') then auth.uid() else coalesce(current_row.verified_by,auth.uid()) end end,
    version=coalesce(current_row.version,0)+1, updated_at=now()
    where id=eid;
  insert into public.admin_audit_events(actor_id,action,details) values(auth.uid(),'expert.saved',jsonb_build_object('expert_id',eid,'active',payload->'active','reviewed',reviewed));
  return eid;
end $$;

create or replace function private.admin_experts() returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if not private.operations_access() then raise insufficient_privilege; end if;
  return (select coalesce(jsonb_agg(to_jsonb(e)||jsonb_build_object('staff_email',coalesce(u.email,''),'open_requests',(select count(*) from public.expert_requests r where r.expert_id=e.id and r.status in ('new','contacted','scheduled')),'sessions_today',(select count(*) from public.expert_requests r where r.expert_id=e.id and r.status in ('scheduled','completed') and (r.scheduled_at at time zone 'Asia/Kolkata')::date=(now() at time zone 'Asia/Kolkata')::date)) order by e.active desc,e.name,e.id),'[]'::jsonb)
    from public.experts e left join auth.users u on u.id=e.staff_user_id);
end $$;

create or replace function private.update_consultation(payload jsonb) returns void language plpgsql security definer set search_path='' as $$
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
  if eid is not null and eid is distinct from r.expert_id and proposed_status in ('new','contacted','scheduled') then
    if not e.accepting_new then raise exception 'This expert is not accepting new requests.'; end if;
    if (select count(*) from public.expert_requests other where other.expert_id=eid and other.id<>r.id and other.status in ('new','contacted','scheduled'))>=e.max_open_requests then raise exception 'This expert has reached their open request limit.'; end if;
  end if;
  if proposed_status='scheduled' then
    if eid is null or proposed_time is null then raise exception 'Choose an expert and a session time.'; end if;
    if (r.status<>'scheduled' or proposed_time is distinct from r.scheduled_at or eid is distinct from r.expert_id) and proposed_time<=now() then raise exception 'Choose a future session time.'; end if;
    if (r.status<>'scheduled' or proposed_time is distinct from r.scheduled_at or eid is distinct from r.expert_id) and exists(select 1 from public.expert_requests other where other.expert_id=eid and other.id<>r.id and other.status='scheduled'
      and tstzrange(other.scheduled_at,other.scheduled_at+make_interval(mins=>other.duration_minutes+e.buffer_minutes),'[)') &&
        tstzrange(proposed_time,proposed_time+make_interval(mins=>case when r.status='scheduled' and eid=r.expert_id then r.duration_minutes else e.session_minutes end+e.buffer_minutes),'[)'))
      then raise exception 'This expert already has a session at that time.'; end if;
  end if;
  if proposed_status='scheduled' and (r.status<>'scheduled' or proposed_time is distinct from r.scheduled_at or eid is distinct from r.expert_id) and
    (select count(*) from public.expert_requests other where other.expert_id=eid and other.id<>r.id and other.status in ('scheduled','completed') and (other.scheduled_at at time zone 'Asia/Kolkata')::date=(proposed_time at time zone 'Asia/Kolkata')::date)>=e.daily_session_limit
    then raise exception 'This expert has reached their daily session limit.'; end if;
  if proposed_status in ('new','contacted') then proposed_time:=null; end if;
  if proposed_status=r.status and eid is not distinct from r.expert_id and proposed_time is not distinct from r.scheduled_at and memo='' then raise exception 'No changes to save.'; end if;
  update public.expert_requests set status=proposed_status,expert_id=eid,scheduled_at=proposed_time,
    duration_minutes=case when proposed_status='scheduled' and (r.status<>'scheduled' or eid is distinct from r.expert_id) then e.session_minutes else r.duration_minutes end,
    next_follow_up_at=case when proposed_status in ('completed','cancelled') then null
      when proposed_status='scheduled' and (r.status<>'scheduled' or proposed_time is distinct from r.scheduled_at or eid is distinct from r.expert_id) then proposed_time+make_interval(mins=>case when r.status='scheduled' and eid=r.expert_id then r.duration_minutes else e.session_minutes end)
      when proposed_status<>r.status then now()+interval '24 hours' else r.next_follow_up_at end,
    version=version+1,updated_at=now() where id=r.id;
  insert into public.consultation_events(request_id,actor_id,action,note,details) values(r.id,auth.uid(),'updated',memo,
    jsonb_build_object('from',r.status,'to',proposed_status,'expert_id',eid,'expert_name',e.name,'scheduled_at',proposed_time,'version',r.version+1,'actor_role',private.admin_session()->>'role'));
  insert into public.admin_audit_events(actor_id,action,details) values(auth.uid(),'consultation.updated',jsonb_build_object('request_id',r.id,'from',r.status,'to',proposed_status));
end $$;

create or replace function private.admin_consultations(filter_status text default '', search_text text default '', page_number integer default 1)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; total integer;
begin
  if not (private.operations_access() or coalesce(private.admin_session() @> '{"role":"therapist","aal":"aal2"}'::jsonb,false)) then raise insufficient_privilege; end if;
  if page_number is null or page_number<1 or page_number>100000 or length(search_text)>100 or filter_status not in ('','new','contacted','scheduled','completed','cancelled','overdue','unassigned','delivery') then raise exception 'Invalid filter'; end if;
  select count(*) into total from public.expert_requests r left join auth.users u on u.id=r.user_id
    where private.consultation_access(r.id) and (filter_status='' or r.status=filter_status or (filter_status='overdue' and private.consultation_due(r)<now()) or (filter_status='unassigned' and r.expert_id is null and r.status in ('new','contacted','scheduled')) or (filter_status='delivery' and r.status in ('new','contacted','scheduled') and private.operations_access() and exists(select 1 from public.consultation_alerts a where a.request_id=r.id and a.state not in ('accepted','cancelled'))))
      and (search_text='' or strpos(lower(coalesce(u.email,'')||' '||r.phone||' '||r.id::text),lower(search_text))>0);
  select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) into result from (
    select r.id,r.status,r.source,r.preferred_language,r.created_at,r.scheduled_at,r.expert_id,r.version,private.consultation_due(r) as next_due_at,private.consultation_due(r)<now() as overdue,
      u.email as parent_email,e.name as expert_name
    from public.expert_requests r left join auth.users u on u.id=r.user_id left join public.experts e on e.id=r.expert_id
    where private.consultation_access(r.id) and (filter_status='' or r.status=filter_status or (filter_status='overdue' and private.consultation_due(r)<now()) or (filter_status='unassigned' and r.expert_id is null and r.status in ('new','contacted','scheduled')) or (filter_status='delivery' and r.status in ('new','contacted','scheduled') and private.operations_access() and exists(select 1 from public.consultation_alerts a where a.request_id=r.id and a.state not in ('accepted','cancelled'))))
      and (search_text='' or strpos(lower(coalesce(u.email,'')||' '||r.phone||' '||r.id::text),lower(search_text))>0)
    order by case when private.consultation_due(r)<now() then 0 else 1 end,private.consultation_due(r) nulls last,case when r.status='new' then 0 when r.status='contacted' then 1 when r.status='scheduled' then 2 else 3 end,
      case when r.source='safety' and r.status in ('new','contacted') then 0 else 1 end,r.created_at,r.id
    limit 25 offset (page_number-1)*25
  ) q;
  return jsonb_build_object('requests',result,'total',total,'page',page_number);
end $$;

create or replace function private.admin_overview() returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if not (private.operations_access() or coalesce(private.admin_session() @> '{"role":"therapist","aal":"aal2"}'::jsonb,false)) then raise insufficient_privilege; end if;
  return jsonb_build_object('counts',(select jsonb_build_object(
    'new',count(*) filter(where status='new'),'contacted',count(*) filter(where status='contacted'),
    'scheduled',count(*) filter(where status='scheduled'),'completed',count(*) filter(where status='completed'),
    'cancelled',count(*) filter(where status='cancelled'),
    'needs_follow_up',count(*) filter(where private.consultation_due(r)<now()),
    'safety',count(*) filter(where source='safety' and status in ('new','contacted','scheduled')))
    from public.expert_requests r where private.consultation_access(r.id)),
    'alert_attention',case when private.operations_access() then (select count(*) from public.consultation_alerts a join public.expert_requests r on r.id=a.request_id where a.state not in ('accepted','cancelled') and r.status in ('new','contacted','scheduled')) else null end,
    'ready_experts',case when private.operations_access() then (select count(*) from public.experts where active and verified_at is not null and accepting_new and (select count(*) from public.expert_requests r where r.expert_id=experts.id and r.status in ('new','contacted','scheduled'))<max_open_requests) else null end);
end $$;

create or replace function private.admin_consultation(target uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  if not private.consultation_access(target) then raise insufficient_privilege; end if;
  select to_jsonb(r)||jsonb_build_object('next_due_at',private.consultation_due(r),'overdue',private.consultation_due(r)<now(),'alert',case when private.operations_access() then (select to_jsonb(a)-array['payload','lease'] from public.consultation_alerts a where a.request_id=r.id) else null end,'parent_email',u.email,'child_name',c.name,'child_dob',c.dob,
    'expert_name',e.name,'consent_current',exists(select 1 from public.consents co where co.user_id=r.user_id and co.policy_version='2026-10-05'),
    'events',(select coalesce(jsonb_agg(to_jsonb(ev) order by (ev.details->>'version')::integer desc,ev.occurred_at desc),'[]'::jsonb) from public.consultation_events ev where ev.request_id=r.id))
    into result from public.expert_requests r join auth.users u on u.id=r.user_id
    left join public.children c on c.id=r.child_id and c.user_id=r.user_id left join public.experts e on e.id=r.expert_id where r.id=target;
  if result is null then raise no_data_found; end if;
  insert into public.admin_audit_events(actor_id,action,details) values(auth.uid(),'consultation.viewed',jsonb_build_object('request_id',target));
  return result;
end $$;

create function private.record_consultation_contact(payload jsonb) returns void language plpgsql security definer set search_path='' as $$
declare r public.expert_requests; eid uuid:=(payload->>'event_id')::uuid; channel text:=payload->>'channel'; outcome text:=payload->>'outcome'; follow_up timestamptz:=nullif(payload->>'follow_up_at','')::timestamptz; memo text:=trim(coalesce(payload->>'note','')); previous public.consultation_events; new_status text;
begin
 if not private.consultation_access((payload->>'id')::uuid) then raise insufficient_privilege; end if;
 select * into r from public.expert_requests where id=(payload->>'id')::uuid for update;
 if not found then raise no_data_found; end if;
 if not private.consultation_access(r.id) then raise insufficient_privilege; end if;
 if not exists(select 1 from public.consents where user_id=r.user_id and policy_version='2026-10-05') then raise exception 'Parent consent is withdrawn. Only cancellation is available.'; end if;
 select * into previous from public.consultation_events where id=eid;
 if found then
   if previous.request_id=r.id and previous.actor_id=auth.uid() and previous.details->>'fingerprint'=md5(payload::text) then return; end if;
   raise exception 'This contact receipt has already been used.';
 end if;
 if (payload->>'version')::integer is distinct from r.version then raise exception 'This request changed. Reload before saving.' using errcode='40001'; end if;
 if r.status in ('completed','cancelled') then raise exception 'Closed requests cannot receive new contact attempts.'; end if;
 if channel is null or channel not in ('phone','email','whatsapp','coordination') or outcome is null or outcome not in ('reached','no_answer','message_left','failed','session_missed') or length(memo)>2000 or eid is null then raise exception 'Invalid contact details.'; end if;
 if follow_up is null or follow_up<=now() then raise exception 'Choose a future follow-up time.'; end if;
 new_status:=case when r.status='new' and outcome='reached' and private.operations_access() then 'contacted' else r.status end;
 update public.expert_requests set status=new_status,next_follow_up_at=follow_up,version=version+1,updated_at=now() where id=r.id;
 insert into public.consultation_events(id,request_id,actor_id,action,note,details) values(eid,r.id,auth.uid(),'contact',memo,jsonb_build_object('from',r.status,'to',new_status,'channel',channel,'outcome',outcome,'follow_up_at',follow_up,'version',r.version+1,'actor_role',private.admin_session()->>'role','fingerprint',md5(payload::text)));
 insert into public.admin_audit_events(actor_id,action,details) values(auth.uid(),'consultation.contact_recorded',jsonb_build_object('request_id',r.id,'event_id',eid,'channel',channel,'outcome',outcome));
end $$;
create function public.record_consultation_contact(payload jsonb) returns void language sql security invoker set search_path='' as $$ select private.record_consultation_contact(payload); $$;
revoke all on function private.record_consultation_contact(jsonb),public.record_consultation_contact(jsonb) from public,anon;
grant execute on function private.record_consultation_contact(jsonb),public.record_consultation_contact(jsonb) to authenticated;

-- The server claims one specific notification; no client can bypass delivery leases.
create function public.claim_consultation_alert(target uuid, envelope jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare a public.consultation_alerts; r public.expert_requests; token uuid:=gen_random_uuid();
begin
 select * into r from public.expert_requests where id=target;
 if not found then return null; end if;
 select * into a from public.consultation_alerts where request_id=target for update;
 if not found or a.state in ('accepted','cancelled','needs_review') or (a.state='sending' and a.lease_until>now()) then return null; end if;
 if r.status in ('completed','cancelled') or not exists(select 1 from public.consents where user_id=r.user_id and policy_version='2026-10-05') then
  update public.consultation_alerts set state='cancelled',updated_at=now() where request_id=target; return null;
 end if;
 if a.attempts>=5 or a.first_attempt_at<now()-interval '23 hours' then
  update public.consultation_alerts set state='needs_review',last_error='Check provider history before any further send.',updated_at=now() where request_id=target; return null;
 end if;
 if envelope is null then
  update public.consultation_alerts set state='blocked',last_error='Operations email is not configured.',updated_at=now() where request_id=target; return null;
 end if;
 update public.consultation_alerts set state='sending',lease=token,lease_until=now()+interval '90 seconds',attempts=attempts+1,first_attempt_at=coalesce(first_attempt_at,now()),payload=coalesce(payload,envelope),last_error=null,updated_at=now() where request_id=target returning * into a;
 return jsonb_build_object('requestId',a.request_id,'lease',token,'payload',a.payload);
end $$;
create function public.finish_consultation_alert(target uuid, token uuid, accepted_id text, failure text) returns void language plpgsql security invoker set search_path='' as $$
begin
 update public.consultation_alerts set state=case when accepted_id is not null then 'accepted' else 'failed' end,provider_id=accepted_id,last_error=left(failure,200),lease_until=null,updated_at=now()
 where request_id=target and lease=token and state='sending';
 if not found then raise exception 'Delivery lease unavailable'; end if;
end $$;
revoke all on function public.claim_consultation_alert(uuid,jsonb),public.finish_consultation_alert(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.claim_consultation_alert(uuid,jsonb),public.finish_consultation_alert(uuid,uuid,text,text) to service_role;
