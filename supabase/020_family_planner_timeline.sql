-- Created with Supabase CLI, numbered for this repository's migration runner.
set local lock_timeout='5s';
create table public.family_entries (
 id uuid primary key, user_id uuid not null references auth.users on delete cascade,
 child_id uuid references public.children on delete cascade,
 kind text not null check(kind in ('event','goal','memory')),
 value jsonb not null check(jsonb_typeof(value)='object' and octet_length(value::text)<12000),
 revision integer not null default 1 check(revision>0), photo_ready boolean not null default false,
 updated_at timestamptz not null default now(), check(kind<>'memory' or child_id is not null)
);
create index family_entries_owner on public.family_entries(user_id);
create index family_entries_child on public.family_entries(child_id);
alter table public.family_entries enable row level security;
revoke all on public.family_entries from public,anon,authenticated;
grant select on public.family_entries to authenticated;
grant all on public.family_entries to service_role;
create policy "family entries own read" on public.family_entries for select to authenticated using(user_id=(select auth.uid()));
insert into storage.buckets(id,name,public) values('family-photos','family-photos',false);
-- No direct storage policies: bytes are served only by an ownership-checked API.

create function private.save_family_entry(target uuid, child uuid, entry_kind text, expected integer, content jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare old public.family_entries; result public.family_entries; d date; born date; k text;
begin
 if auth.uid() is null or not exists(select 1 from public.consents where user_id=auth.uid() and policy_version='2026-10-05') then raise insufficient_privilege;end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,20));
 if target is null or expected is null or expected<0 or entry_kind is null or entry_kind not in ('event','goal','memory') then raise exception 'Invalid entry';end if;
 if child is not null then select dob into born from public.children where id=child and user_id=auth.uid() for update; if not found then raise insufficient_privilege;end if;end if;
 if content is null or jsonb_typeof(content)<>'object' or not(content ?& array['title','date','note','archived','category','cost','saved','monthly','inflation','annualReturn','photoHash']) or
 jsonb_typeof(content->'title') is distinct from 'string' or length(trim(content->>'title')) not between 1 and 100 or
 jsonb_typeof(content->'note') is distinct from 'string' or length(content->>'note')>1500 or
 jsonb_typeof(content->'archived') is distinct from 'boolean' or
 jsonb_typeof(content->'date') is distinct from 'string' or content->>'date' !~ '^\d{4}-\d{2}-\d{2}$' or
 coalesce(content->>'category','') not in ('school','activity','celebration','care','other') then raise exception 'Invalid fields';end if;
 if exists(select 1 from jsonb_object_keys(content) as keys(field) where keys.field not in ('title','date','note','archived','category','cost','saved','monthly','inflation','annualReturn','photoHash')) then raise exception 'Unknown field';end if;
 d:=(content->>'date')::date;
 if d<'1900-01-01' or d>'2200-01-01' then raise exception 'Invalid date';end if;
 foreach k in array array['cost','saved','monthly','inflation','annualReturn'] loop
  if jsonb_typeof(content->k) is distinct from 'number' then raise exception 'Invalid amount';end if;
 end loop;
 if (content->>'cost')::numeric not between 0 and 1000000000 or (content->>'saved')::numeric not between 0 and 1000000000 or
 (content->>'monthly')::numeric not between 0 and 10000000 or (content->>'inflation')::numeric not between 0 and 20 or (content->>'annualReturn')::numeric not between -20 and 20 then raise exception 'Amount out of range';end if;
 if entry_kind<>'goal' and exists(select 1 from unnest(array['cost','saved','monthly','inflation','annualReturn']) as nums(field) where (content->>nums.field)::numeric<>0) then raise exception 'Unexpected amounts';end if;
 if entry_kind='goal' and (content->>'cost')::numeric<=0 then raise exception 'Add a goal cost';end if;
 if entry_kind='memory' then
  if child is null or d>(now() at time zone 'Asia/Kolkata')::date or (born is not null and d<born) or
  jsonb_typeof(content->'photoHash') is distinct from 'string' or content->>'photoHash' !~ '^[a-f0-9]{64}$' then raise exception 'Invalid photo memory';end if;
 elsif jsonb_typeof(content->'photoHash') is distinct from 'null' then raise exception 'Unexpected photo';end if;
 select * into old from public.family_entries where id=target for update;
 if found then
  if old.user_id<>auth.uid() or old.kind<>entry_kind or old.child_id is distinct from child then raise insufficient_privilege;end if;
  if entry_kind='memory' and old.value->>'photoHash' is distinct from content->>'photoHash' then raise exception 'A saved photo cannot be replaced';end if;
  if old.revision=expected+1 and old.value=content then return to_jsonb(old);end if;
  if old.revision<>expected then raise exception 'Changed elsewhere' using errcode='40001';end if;
 else
  if expected<>0 then raise exception 'Changed elsewhere' using errcode='40001';end if;
  if entry_kind='goal' and d<=(now() at time zone 'Asia/Kolkata')::date then raise exception 'Choose a future goal date';end if;
  if (select count(*) from public.family_entries where user_id=auth.uid())>=2000 then raise exception 'Family record limit reached';end if;
  if entry_kind='memory' and (select count(*) from public.family_entries where user_id=auth.uid() and kind='memory')>=500 then raise exception 'Photo limit reached';end if;
 end if;
 insert into public.family_entries(id,user_id,child_id,kind,value) values(target,auth.uid(),child,entry_kind,content)
 on conflict(id) do update set value=excluded.value,revision=family_entries.revision+1,updated_at=now() returning * into result;
 return to_jsonb(result);
end $$;
create function public.save_family_entry(target uuid,child uuid,entry_kind text,expected integer,content jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.save_family_entry(target,child,entry_kind,expected,content); $$;
revoke all on function private.save_family_entry(uuid,uuid,text,integer,jsonb),public.save_family_entry(uuid,uuid,text,integer,jsonb) from public,anon;
grant execute on function private.save_family_entry(uuid,uuid,text,integer,jsonb),public.save_family_entry(uuid,uuid,text,integer,jsonb) to authenticated;

-- Erasure recovery also covers an upload already in flight during account deletion.
create table public.family_photo_cleanup(path text primary key, not_before timestamptz not null default now()+interval '10 minutes');
alter table public.family_photo_cleanup enable row level security;
revoke all on public.family_photo_cleanup from public,anon,authenticated;
grant all on public.family_photo_cleanup to service_role;
create function private.queue_family_photo_cleanup() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.kind='memory' then insert into public.family_photo_cleanup(path) values(old.user_id::text||'/'||old.id::text||'-'||(old.value->>'photoHash')||'.jpg') on conflict(path) do nothing;end if;
 return old;
end $$;
revoke all on function private.queue_family_photo_cleanup() from public,anon,authenticated;
create trigger family_photo_erasure after delete on public.family_entries for each row execute function private.queue_family_photo_cleanup();
