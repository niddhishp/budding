-- Authoritative access controls. No parent records are granted to staff roles.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create function private.has_current_consent() returns boolean
language sql stable security invoker set search_path = '' as $$
  select exists(select 1 from public.consents where user_id = (select auth.uid()) and policy_version = '2026-10-05');
$$;
revoke all on function private.has_current_consent() from public, anon;
grant execute on function private.has_current_consent() to authenticated;

-- Restrictive policies AND with existing ownership policies, including direct SDK writes.
do $$
declare tbl text;
begin
  foreach tbl in array array['children','context_logs','decodes','memories','reports','stories','expert_requests'] loop
    execute format('create policy "consent: insert" on public.%I as restrictive for insert to authenticated with check ((select private.has_current_consent()))', tbl);
    execute format('create policy "consent: update" on public.%I as restrictive for update to authenticated using ((select private.has_current_consent())) with check ((select private.has_current_consent()))', tbl);
  end loop;
end $$;
drop policy "expert_requests: owner insert" on public.expert_requests;
create policy "expert_requests: owner insert" on public.expert_requests for insert to authenticated with check (
  user_id = (select auth.uid()) and (child_id is null or exists (
    select 1 from public.children c where c.id = child_id and c.user_id = (select auth.uid())
  ))
);
create policy "memories: owned decode" on public.memories as restrictive for all to authenticated
using (true) with check (decode_id is null or exists (
  select 1 from public.decodes d where d.id = decode_id and d.user_id = (select auth.uid()) and d.child_id = memories.child_id
));
create policy "decodes: owned refinement" on public.decodes as restrictive for insert to authenticated
with check (refines is null or exists (
  select 1 from public.decodes d where d.id = refines and d.user_id = (select auth.uid()) and d.child_id = decodes.child_id
));

create table public.consent_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  policy_version text not null,
  action text not null check (action in ('accepted','withdrawn')),
  occurred_at timestamptz not null default now()
);
alter table public.consent_events enable row level security;
revoke all on public.consent_events from public, anon, authenticated;
grant select on public.consent_events to authenticated;
grant all on public.consent_events to service_role;
create policy "consent events: own read" on public.consent_events for select to authenticated using (user_id = (select auth.uid()));
create index consent_events_user_idx on public.consent_events(user_id, occurred_at desc);

create function private.stamp_consent() returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.policy_version <> '2026-10-05' then raise exception 'Unsupported consent version'; end if;
  new.agreed_at := now();
  return new;
end $$;
create function private.record_consent() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Auth-user cascade deletion must not recreate a receipt for a deleted identity.
  if tg_op = 'DELETE' then
    if exists(select 1 from auth.users where id=old.user_id) then
      insert into public.consent_events(user_id,policy_version,action) values(old.user_id,old.policy_version,'withdrawn');
    end if;
    return old;
  end if;
  insert into public.consent_events(user_id,policy_version,action) values(new.user_id,new.policy_version,'accepted');
  return new;
end $$;
revoke all on function private.stamp_consent(), private.record_consent() from public, anon, authenticated;
create trigger consent_server_time before insert or update on public.consents for each row execute function private.stamp_consent();
create trigger consent_receipt after insert or update or delete on public.consents for each row execute function private.record_consent();
grant delete on public.consents to authenticated;
create policy "consents: owner withdraw" on public.consents for delete to authenticated using (user_id = (select auth.uid()));

create table public.admin_memberships (
  user_id uuid primary key references auth.users on delete restrict,
  role text not null check(role in ('owner','operations','therapist','content_reviewer')),
  active boolean not null default true,
  updated_at timestamptz not null default now()
);
create table public.admin_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users on delete set null,
  target_id uuid references auth.users on delete set null,
  action text not null,
  details jsonb not null default '{}',
  occurred_at timestamptz not null default now()
);
alter table public.admin_memberships enable row level security;
alter table public.admin_audit_events enable row level security;
revoke all on public.admin_memberships, public.admin_audit_events from public, anon, authenticated;
grant select on public.admin_memberships, public.admin_audit_events to authenticated;
grant all on public.admin_memberships, public.admin_audit_events to service_role;
create index admin_audit_time_idx on public.admin_audit_events(occurred_at desc);
create index admin_audit_actor_idx on public.admin_audit_events(actor_id);
create index admin_audit_target_idx on public.admin_audit_events(target_id);

-- Uses PostgREST-verified JWT claims AND the current session and membership rows.
-- Removing membership/session immediately denies access even with an unexpired JWT.
create function private.admin_session() returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('role',m.role,'aal',auth.jwt()->>'aal')
  from public.admin_memberships m
  where m.user_id=(select auth.uid()) and m.active
    and exists(select 1 from auth.sessions s where s.id::text=auth.jwt()->>'session_id'
      and s.user_id=(select auth.uid()) and (s.not_after is null or s.not_after > now()));
$$;
create function public.admin_session() returns jsonb language sql stable security invoker set search_path = '' as $$
  select private.admin_session();
$$;
revoke all on function private.admin_session(), public.admin_session() from public, anon;
grant execute on function private.admin_session(), public.admin_session() to authenticated;
create policy "memberships: self" on public.admin_memberships for select to authenticated using(user_id=(select auth.uid()));
create policy "audit: verified owner" on public.admin_audit_events for select to authenticated using (
  (select private.admin_session()) @> '{"role":"owner","aal":"aal2"}'::jsonb
);

create function private.audit_membership() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.admin_audit_events(actor_id,target_id,action,details)
  values(auth.uid(),new.user_id,'membership.' || lower(tg_op),jsonb_build_object(
    'role',new.role,'active',new.active,
    'previous_role',case when tg_op='UPDATE' then old.role end,
    'previous_active',case when tg_op='UPDATE' then old.active end
  ));
  return new;
end $$;
revoke all on function private.audit_membership() from public, anon, authenticated;
create trigger audit_membership after insert or update on public.admin_memberships for each row execute function private.audit_membership();

create function private.admin_staff() returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not coalesce(private.admin_session() @> '{"role":"owner","aal":"aal2"}'::jsonb,false) then
    raise insufficient_privilege using message='Owner access and MFA required';
  end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('user_id',m.user_id,'email',u.email,'role',m.role,'active',m.active) order by m.updated_at desc),'[]'::jsonb)
    from public.admin_memberships m join auth.users u on u.id=m.user_id);
end $$;
create function public.admin_staff() returns jsonb language sql security invoker set search_path = '' as $$ select private.admin_staff(); $$;

create function private.set_admin_membership(target_email text, desired_role text, enabled boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare target uuid;
begin
  -- Serialize role changes before checking authority and the final-owner invariant.
  perform pg_advisory_xact_lock(72910417);
  if not coalesce(private.admin_session() @> '{"role":"owner","aal":"aal2"}'::jsonb,false) then
    raise insufficient_privilege using message='Owner access and MFA required';
  end if;
  if desired_role is null or desired_role not in ('owner','operations','therapist','content_reviewer') or enabled is null then raise exception 'Invalid membership'; end if;
  select id into target from auth.users where lower(email)=lower(trim(target_email)) and email_confirmed_at is not null;
  if target is null then raise exception 'Person must sign in and verify their email first'; end if;
  if exists(select 1 from public.admin_memberships where user_id=target and role='owner' and active)
    and (desired_role <> 'owner' or not enabled)
    and (select count(*) from public.admin_memberships where role='owner' and active) <= 1 then
    raise exception 'Keep at least one active owner';
  end if;
  insert into public.admin_memberships(user_id,role,active) values(target,desired_role,enabled)
    on conflict(user_id) do update set role=excluded.role,active=excluded.active,updated_at=now();
end $$;
create function public.set_admin_membership(target_email text, desired_role text, enabled boolean) returns void
language sql security invoker set search_path = '' as $$ select private.set_admin_membership(target_email,desired_role,enabled); $$;
revoke all on function private.admin_staff(), public.admin_staff(), private.set_admin_membership(text,text,boolean), public.set_admin_membership(text,text,boolean) from public, anon;
grant execute on function private.admin_staff(), public.admin_staff(), private.set_admin_membership(text,text,boolean), public.set_admin_membership(text,text,boolean) to authenticated;
