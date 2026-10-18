-- Generated with Supabase CLI; numbered for this repository's migration runner.
set local lock_timeout='5s';
create table public.child_profile_notebooks (
 child_id uuid not null references public.children on delete cascade,
 user_id uuid not null references auth.users on delete cascade,
 section text not null check(section in ('health','interests')),
 value jsonb not null check(jsonb_typeof(value)='object' and octet_length(value::text)<=1000000),
 revision integer not null default 1 check(revision>0),
 updated_at timestamptz not null default now(), primary key(child_id,section)
);
create index child_profile_notebooks_owner on public.child_profile_notebooks(user_id);
alter table public.child_profile_notebooks enable row level security;
revoke all on public.child_profile_notebooks from public,anon,authenticated;
grant select on public.child_profile_notebooks to authenticated;
grant all on public.child_profile_notebooks to service_role;
create policy "profile notebooks: own read" on public.child_profile_notebooks for select to authenticated using(user_id=(select auth.uid()));

create function private.save_profile_notebook(target uuid,section_name text,expected integer,content jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare current_row public.child_profile_notebooks; result public.child_profile_notebooks; e jsonb; born date; ids uuid[]:='{}'; rid uuid; recorded date; next_date date; a jsonb;
begin
 if auth.uid() is null or not exists(select 1 from public.consents where user_id=auth.uid() and policy_version='2026-10-05') then raise insufficient_privilege;end if;
 select dob into born from public.children where id=target and user_id=auth.uid() for update;
 if not found then raise insufficient_privilege;end if;
 if section_name is null or section_name not in ('health','interests') or expected is null or expected<0 or content is null or jsonb_typeof(content)<>'object' or octet_length(content::text)>1000000 then raise exception 'Invalid notebook';end if;
 if section_name='health' then
  if born is null or jsonb_typeof(content->'entries') is distinct from 'array' then raise exception 'Invalid health records';end if;
  if jsonb_array_length(content->'entries')>200 then raise exception 'Record limit reached';end if;
  for e in select * from jsonb_array_elements(content->'entries') loop
   if jsonb_typeof(e)<>'object' or not(e ?& array['id','kind','title','status','date','nextDate','instructions','note','referenceId']) or
    jsonb_typeof(e->'title') is distinct from 'string' or length(trim(e->>'title')) not between 1 and 100 or
    jsonb_typeof(e->'instructions') is distinct from 'string' or length(e->>'instructions')>1000 or
    jsonb_typeof(e->'note') is distinct from 'string' or length(e->>'note')>1000 or
    coalesce(e->>'kind','') not in ('vaccination','medication','checkup') or
    coalesce(e->>'status','') not in ('planned','ongoing','done','not_applicable') or
    (e->>'status'='ongoing' and e->>'kind'<>'medication') or
    (e ? 'archived' and jsonb_typeof(e->'archived') is distinct from 'boolean') or
    (e->>'referenceId' is not null and (jsonb_typeof(e->'referenceId')<>'string' or length(e->>'referenceId')>60)) then raise exception 'Invalid health record';end if;
   rid:=(e->>'id')::uuid; if rid is null or rid=any(ids) then raise exception 'Duplicate or invalid record';end if;ids:=array_append(ids,rid);
   if (e->>'date' is not null and e->>'date' !~ '^\d{4}-\d{2}-\d{2}$') or (e->>'nextDate' is not null and e->>'nextDate' !~ '^\d{4}-\d{2}-\d{2}$') then raise exception 'Invalid date';end if;
   recorded:=(e->>'date')::date;next_date:=(e->>'nextDate')::date;
   if recorded<born or next_date<born or next_date<recorded or (e->>'status'='done' and (recorded is null or recorded>(now() at time zone 'Asia/Kolkata')::date)) then raise exception 'Check health record dates';end if;
  end loop;
 else
  if not(content ?& array['selected','answers','note','updatedOn','band']) or jsonb_typeof(content->'selected') is distinct from 'array' or jsonb_typeof(content->'answers') is distinct from 'array' or jsonb_typeof(content->'note') is distinct from 'string' or length(content->>'note')>1500 then raise exception 'Invalid interests';end if;
  if jsonb_array_length(content->'selected')>8 or jsonb_array_length(content->'answers')>3 or (content->>'band' is not null and content->>'band' not in ('baby','preschool','school','teen')) then raise exception 'Invalid interests';end if;
  if content->>'updatedOn' is not null then perform (content->>'updatedOn')::date;end if;
  for a in select content->'selected' union all select * from jsonb_array_elements(content->'answers') loop
   if jsonb_typeof(a)<>'array' then raise exception 'Invalid interest choices';end if;
   if jsonb_array_length(a)>8 or exists(select 1 from jsonb_array_elements_text(a) v where v not in ('art','movement','music','patterns','making','words','nature','other')) or (select count(*) from jsonb_array_elements_text(a))<>(select count(distinct v) from jsonb_array_elements_text(a) v) then raise exception 'Invalid interest choices';end if;
  end loop;
 end if;
 select * into current_row from public.child_profile_notebooks where child_id=target and section=section_name;
 -- Lost-response retry is safe only when it repeats the immediately preceding write.
 if current_row.revision=expected+1 and current_row.value=content then return to_jsonb(current_row);end if;
 if coalesce(current_row.revision,0) is distinct from expected then raise exception 'Notebook changed' using errcode='40001';end if;
 insert into public.child_profile_notebooks(child_id,user_id,section,value) values(target,auth.uid(),section_name,content)
 on conflict(child_id,section) do update set value=excluded.value,revision=child_profile_notebooks.revision+1,updated_at=now() returning * into result;
 return to_jsonb(result);
end $$;
create function public.save_profile_notebook(target uuid,section_name text,expected integer,content jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.save_profile_notebook(target,section_name,expected,content);$$;
revoke all on function private.save_profile_notebook(uuid,text,integer,jsonb),public.save_profile_notebook(uuid,text,integer,jsonb) from public,anon;
grant execute on function private.save_profile_notebook(uuid,text,integer,jsonb),public.save_profile_notebook(uuid,text,integer,jsonb) to authenticated;
