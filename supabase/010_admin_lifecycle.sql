-- Protect the last owner even through service-role writes and account deletion.
alter table public.admin_memberships drop constraint admin_memberships_user_id_fkey;
alter table public.admin_memberships add constraint admin_memberships_user_id_fkey foreign key(user_id) references auth.users on delete cascade;

create function private.protect_last_owner() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(72910417);
  if old.role='owner' and old.active
    and (tg_op='DELETE' or new.role <> 'owner' or not new.active)
    and (select count(*) from public.admin_memberships where role='owner' and active) <= 1 then
    raise exception 'Keep at least one active owner';
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
revoke all on function private.protect_last_owner() from public, anon, authenticated;
create trigger protect_last_owner before update or delete on public.admin_memberships for each row execute function private.protect_last_owner();

create or replace function private.admin_session() returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('role',m.role,'aal',case when auth.jwt()->>'aal'='aal2' and s.aal::text='aal2' then 'aal2' else 'aal1' end)
  from public.admin_memberships m join auth.sessions s on s.user_id=m.user_id
  where m.user_id=(select auth.uid()) and m.active and s.id::text=auth.jwt()->>'session_id'
    and (s.not_after is null or s.not_after > now());
$$;
