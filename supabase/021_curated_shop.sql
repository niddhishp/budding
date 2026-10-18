-- Additive, created with Supabase CLI. Writes are validated by server APIs;
-- service-only functions additionally enforce consent, ownership and revisions.
grant usage on schema private to service_role;
create table public.shop_records (
 id uuid primary key, user_id uuid not null references auth.users on delete cascade,
 child_id uuid not null references public.children on delete cascade,
 kind text not null check(kind in ('preferences','gift','feedback')),
 value jsonb not null check(jsonb_typeof(value)='object' and octet_length(value::text)<8000),
 revision integer not null default 1, updated_at timestamptz not null default now()
);
create index shop_records_owner on public.shop_records(user_id,child_id);
create unique index shop_one_preference on public.shop_records(child_id) where kind='preferences';
create unique index shop_one_feedback on public.shop_records(child_id,(value->>'productId')) where kind='feedback';
alter table public.shop_records enable row level security;
revoke all on public.shop_records from public,anon,authenticated;
grant select on public.shop_records to authenticated;
grant all on public.shop_records to service_role;
create policy "shop own records" on public.shop_records for select to authenticated using(user_id=(select auth.uid()));

create table public.shop_catalog (
 id uuid primary key,kind text not null check(kind in ('product','finance','recipe','settlement')),
 value jsonb not null check(jsonb_typeof(value)='object' and octet_length(value::text)<16000),
 revision integer not null default 1, updated_at timestamptz not null default now()
);
create unique index shop_unique_asin on public.shop_catalog((value->>'asin')) where kind='product';
alter table public.shop_catalog enable row level security;
revoke all on public.shop_catalog from public,anon,authenticated;
grant all on public.shop_catalog to service_role;
-- Internal evidence, arrangements and reconciliation are never exposed through RLS.

create table public.shop_discovery_runs (
 recipe_id uuid primary key references public.shop_catalog on delete cascade,
 attempted_at timestamptz not null default now(), finished_at timestamptz,
 added integer not null default 0, error text
);
alter table public.shop_discovery_runs enable row level security;
revoke all on public.shop_discovery_runs from public,anon,authenticated;
grant all on public.shop_discovery_runs to service_role;

create function public.save_shop_record(target uuid,owner uuid,child uuid,record_kind text,expected integer,content jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare old public.shop_records; result public.shop_records;
begin
 if owner is null or not exists(select 1 from public.consents where user_id=owner and policy_version='2026-10-05') then raise insufficient_privilege;end if;
 perform pg_advisory_xact_lock(hashtextextended(owner::text,21));
 perform 1 from public.children where id=child and user_id=owner for update;if not found then raise insufficient_privilege;end if;
 if target is null or expected is null or expected<0 then raise exception 'Invalid revision';end if;
 select * into old from public.shop_records where id=target for update;
 if found then
  if old.user_id<>owner or old.child_id<>child or old.kind<>record_kind then raise insufficient_privilege;end if;
  if old.revision=expected+1 and old.value=content then return to_jsonb(old);end if;
  if old.revision<>expected then raise serialization_failure;end if;
 else
  if expected<>0 then raise serialization_failure;end if;
  if (select count(*) from public.shop_records where user_id=owner)>=2000 then raise exception 'Record limit';end if;
 end if;
 if record_kind='feedback' and not exists(select 1 from public.shop_catalog where id=(content->>'productId')::uuid and kind='product') then raise exception 'Unknown product';end if;
 insert into public.shop_records(id,user_id,child_id,kind,value) values(target,owner,child,record_kind,content)
 on conflict(id) do update set value=excluded.value,revision=shop_records.revision+1,updated_at=now() returning * into result;
 return to_jsonb(result);
end $$;
create function private.shop_staff(actor uuid,actor_session uuid) returns boolean language sql security definer set search_path='' as $$
 select exists(select 1 from public.admin_memberships m join auth.sessions s on s.user_id=m.user_id where m.user_id=actor and m.active and m.role in ('owner','operations') and s.id=actor_session and s.aal::text='aal2' and (s.not_after is null or s.not_after>now()));
$$;
revoke all on function private.shop_staff(uuid,uuid) from public,anon,authenticated;
grant execute on function private.shop_staff(uuid,uuid) to service_role;
create function public.save_shop_catalog(target uuid,actor uuid,actor_session uuid,record_kind text,expected integer,content jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare old public.shop_catalog; result public.shop_catalog;
begin
 if not private.shop_staff(actor,actor_session) then raise insufficient_privilege;end if;
 perform pg_advisory_xact_lock(72910421);
 if target is null or expected is null or expected<0 then raise exception 'Invalid revision';end if;
 select * into old from public.shop_catalog where id=target for update;
 if found then
  if old.kind<>record_kind then raise exception 'Immutable kind';end if;
  if old.revision=expected+1 and old.value=content then return to_jsonb(old);end if;
  if old.revision<>expected then raise serialization_failure;end if;
 else
  if expected<>0 then raise serialization_failure;end if;
  if (select count(*) from public.shop_catalog)>=3000 then raise exception 'Catalogue limit';end if;
 end if;
 if content->>'state'='published' and (coalesce(content->>'evidence','')='' or (content->>'reviewUntil')::date<(now() at time zone 'Asia/Kolkata')::date or content->>'reviewUntil' is null) then raise exception 'Review required';end if;
 insert into public.shop_catalog(id,kind,value) values(target,record_kind,content)
 on conflict(id) do update set value=excluded.value,revision=shop_catalog.revision+1,updated_at=now() returning * into result;
 insert into public.admin_audit_events(actor_id,action,details) values(actor,'shop.'||record_kind||'.saved',jsonb_build_object('id',target,'revision',result.revision,'state',content->>'state'));
 return to_jsonb(result);
end $$;
create function public.claim_shop_discovery(target uuid) returns boolean language plpgsql security invoker set search_path='' as $$
begin
 perform pg_advisory_xact_lock(72910422);
 if exists(select 1 from public.shop_discovery_runs where attempted_at>now()-interval '1 minute') then return false;end if;
 if exists(select 1 from public.shop_discovery_runs where recipe_id=target and attempted_at>now()-interval '1 hour') then return false;end if;
 insert into public.shop_discovery_runs(recipe_id) values(target) on conflict(recipe_id) do update set attempted_at=now(),finished_at=null,added=0,error=null;
 return true;
end $$;
revoke all on function public.save_shop_record(uuid,uuid,uuid,text,integer,jsonb),public.save_shop_catalog(uuid,uuid,uuid,text,integer,jsonb),public.claim_shop_discovery(uuid) from public,anon,authenticated;
grant execute on function public.save_shop_record(uuid,uuid,uuid,text,integer,jsonb),public.save_shop_catalog(uuid,uuid,uuid,text,integer,jsonb),public.claim_shop_discovery(uuid) to service_role;

-- Aggregate demand only. Three distinct families are required before a cohort
-- appears in admin; no child identifiers, exact birthdays or notes are returned.
create function public.shop_demand() returns table(age_band text,interest text,families bigint)
language sql security invoker set search_path='' as $$
 with choices as (
 select r.user_id,case when age((now() at time zone 'Asia/Kolkata')::date,c.dob)<interval '3 years' then 'baby'
 when age((now() at time zone 'Asia/Kolkata')::date,c.dob)<interval '6 years' then 'preschool'
 when age((now() at time zone 'Asia/Kolkata')::date,c.dob)<interval '12 years' then 'school' else 'teen' end band,
 jsonb_array_elements_text(r.value->'interests') topic
 from public.shop_records r join public.children c on c.id=r.child_id and c.user_id=r.user_id
 join public.consents consent on consent.user_id=r.user_id and consent.policy_version='2026-10-05'
 where r.kind='preferences' and c.dob<=(now() at time zone 'Asia/Kolkata')::date and age((now() at time zone 'Asia/Kolkata')::date,c.dob)<interval '18 years')
 select band,topic,count(distinct user_id) from choices group by band,topic having count(distinct user_id)>=3 order by count(distinct user_id) desc,band,topic limit 50;
$$;
revoke all on function public.shop_demand() from public,anon,authenticated;
grant execute on function public.shop_demand() to service_role;
