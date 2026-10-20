-- Additive boundaries: conversations remain private history, not observed child behaviour.
-- Created with the Supabase CLI, then placed in the repository's numbered migration ledger.
create function private.guard_conversation_outcome() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if new.outcome is not null and new.analysis->'conversation' is not null then
  raise check_violation using message='Chat and practice cannot be rated as a real child outcome';
 end if;
 return new;
end $$;
create trigger conversation_outcome before insert or update on public.decodes
for each row execute function private.guard_conversation_outcome();

create function private.guard_conversation_memory() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if new.decode_id is not null and exists(
  select 1 from public.decodes d where d.id=new.decode_id and d.analysis->'conversation' is not null
 ) then raise check_violation using message='Chat and practice cannot create child memories'; end if;
 return new;
end $$;
create trigger conversation_memory before insert or update on public.memories
for each row execute function private.guard_conversation_memory();

create or replace function private.check_decode_continuation() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if new.continuation_of is not null and (new.continuation_of=new.id or not exists(
  select 1 from public.decodes d
  where d.id=new.continuation_of and d.user_id=new.user_id and d.child_id=new.child_id
   and coalesce(d.analysis->'conversation'->>'mode','guidance')=coalesce(new.analysis->'conversation'->>'mode','guidance')
   and (d.safety_category='none' or (
    d.safety_category='parent_distress' and d.risk_level in ('none','low')
    and d.analysis->'conversation'->>'mode' in ('talk','rehearse')
   ))
 )) then raise insufficient_privilege using message='Earlier situation unavailable'; end if;
 if TG_OP='UPDATE' and new.continuation_of is distinct from old.continuation_of and new.continuation_of is not null then
  raise exception 'Saved situation links are immutable';
 end if;
 return new;
end $$;
revoke all on function private.guard_conversation_outcome() from public,anon,authenticated;
revoke all on function private.guard_conversation_memory() from public,anon,authenticated;
