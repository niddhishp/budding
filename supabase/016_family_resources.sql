set local lock_timeout='5s';
create table public.child_care_state (
 child_id uuid primary key references public.children on delete cascade,
 user_id uuid not null references auth.users on delete cascade,
 revision integer not null default 1,
 value jsonb not null default '{}',
 updated_at timestamptz not null default now(),
 check(jsonb_typeof(value)='object' and octet_length(value::text)<=20000)
);
create table public.growth_entries (
 id uuid primary key, child_id uuid not null references public.children on delete cascade,
 user_id uuid not null references auth.users on delete cascade,
 measured_on date not null,
 weight_kg numeric check(weight_kg between 0.3 and 300),
 length_cm numeric check(length_cm between 20 and 250),
 head_cm numeric check(head_cm between 15 and 80),
 method text not null check(method in ('lying','standing')),
 note text not null default '' check(length(note)<=300),
 archived boolean not null default false, revision integer not null default 1,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(weight_kg is not null or length_cm is not null or head_cm is not null)
);
create index growth_entries_child_date on public.growth_entries(child_id,measured_on,id);
alter table public.child_care_state enable row level security;
alter table public.growth_entries enable row level security;
revoke all on public.child_care_state,public.growth_entries from public,anon,authenticated;
grant select on public.child_care_state,public.growth_entries to authenticated;
grant all on public.child_care_state,public.growth_entries to service_role;
create policy "care: own read" on public.child_care_state for select to authenticated using(user_id=(select auth.uid()));
create policy "growth: own read" on public.growth_entries for select to authenticated using(user_id=(select auth.uid()));

create function private.save_child_care(target uuid,expected integer,content jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare current_row public.child_care_state; result public.child_care_state;
begin
 if auth.uid() is null or not exists(select 1 from public.consents where user_id=auth.uid() and policy_version='2026-10-05') then raise insufficient_privilege; end if;
 perform 1 from public.children where id=target and user_id=auth.uid() for update;
 if not found then raise insufficient_privilege; end if;
 if content is null or jsonb_typeof(content)<>'object' or octet_length(content::text)>20000 then raise exception 'Invalid care settings'; end if;
 select * into current_row from public.child_care_state where child_id=target;
 if coalesce(current_row.revision,0) is distinct from expected then raise exception 'Care settings changed. Reload before saving.' using errcode='40001'; end if;
 insert into public.child_care_state(child_id,user_id,revision,value) values(target,auth.uid(),1,content)
 on conflict(child_id) do update set value=excluded.value,revision=child_care_state.revision+1,updated_at=now() returning * into result;
 return to_jsonb(result);
end $$;
create function public.save_child_care(target uuid,expected integer,content jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.save_child_care(target,expected,content); $$;
revoke all on function private.save_child_care(uuid,integer,jsonb),public.save_child_care(uuid,integer,jsonb) from public,anon;
grant execute on function private.save_child_care(uuid,integer,jsonb),public.save_child_care(uuid,integer,jsonb) to authenticated;

create function private.save_growth_entry(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare current_row public.growth_entries; result public.growth_entries; cid uuid:=(payload->>'child_id')::uuid; rid uuid:=(payload->>'id')::uuid; born date; measured date:=(payload->>'measured_on')::date;
begin
 if auth.uid() is null or not exists(select 1 from public.consents where user_id=auth.uid() and policy_version='2026-10-05') then raise insufficient_privilege; end if;
 select dob into born from public.children where id=cid and user_id=auth.uid() for update;
 if not found then raise insufficient_privilege; end if;
 if born is null or measured is null or measured<born or measured>(now() at time zone 'Asia/Kolkata')::date then raise exception 'Choose a measurement date between birth and today.'; end if;
 select * into current_row from public.growth_entries where id=rid for update;
 if found and (current_row.user_id<>auth.uid() or current_row.child_id<>cid) then raise insufficient_privilege; end if;
 -- Identical create receipts can be retried after a lost response.
 if found and (payload->>'revision')::integer=0 and current_row.revision=1 and
  current_row.measured_on=measured and current_row.weight_kg is not distinct from (payload->>'weight_kg')::numeric and
  current_row.length_cm is not distinct from (payload->>'length_cm')::numeric and current_row.head_cm is not distinct from (payload->>'head_cm')::numeric and
  current_row.method=payload->>'method' and current_row.note=coalesce(payload->>'note','') and not current_row.archived then return to_jsonb(current_row); end if;
 if coalesce(current_row.revision,0) is distinct from (payload->>'revision')::integer then raise exception 'This measurement changed. Reload before saving.' using errcode='40001'; end if;
 if current_row.id is null and (select count(*) from public.growth_entries where child_id=cid)>=1000 then raise exception 'Measurement limit reached.'; end if;
 insert into public.growth_entries(id,child_id,user_id,measured_on,weight_kg,length_cm,head_cm,method,note,archived)
 values(rid,cid,auth.uid(),measured,(payload->>'weight_kg')::numeric,(payload->>'length_cm')::numeric,(payload->>'head_cm')::numeric,payload->>'method',coalesce(payload->>'note',''),coalesce((payload->>'archived')::boolean,false))
 on conflict(id) do update set measured_on=excluded.measured_on,weight_kg=excluded.weight_kg,length_cm=excluded.length_cm,head_cm=excluded.head_cm,method=excluded.method,note=excluded.note,archived=excluded.archived,revision=growth_entries.revision+1,updated_at=now()
 where growth_entries.user_id=auth.uid() and growth_entries.child_id=cid and growth_entries.revision=(payload->>'revision')::integer returning * into result;
 if result.id is null then raise insufficient_privilege; end if;
 return to_jsonb(result);
end $$;
create function public.save_growth_entry(payload jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.save_growth_entry(payload); $$;
revoke all on function private.save_growth_entry(jsonb),public.save_growth_entry(jsonb) from public,anon;
grant execute on function private.save_growth_entry(jsonb),public.save_growth_entry(jsonb) to authenticated;
