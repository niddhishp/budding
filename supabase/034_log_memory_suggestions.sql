-- Saved moments ("Log a moment") can suggest memories, the same way an Ask message does.
-- The note itself is never injected into guidance: since migration 014, only memories the parent
-- has reviewed shape an answer. Instead, the background worker runs the note through the memory
-- write gate and commits the result here as unconfirmed suggestions, which the parent reviews in
-- "What Kahiye remembers". Consent and the per-child pause are checked again at commit time, so a
-- parent who pauses memory after saving the note gets no suggestion. Service-role only, like
-- finish_guidance_job. Additive; no existing rows change.
set local lock_timeout='5s';

create function public.propose_log_memories(p_log uuid, p_user uuid, p_memories jsonb) returns integer
language plpgsql security invoker set search_path='' as $$
declare l public.context_logs; m jsonb; added integer := 0;
begin
 select * into l from public.context_logs where id=p_log and user_id=p_user for share;
 if not found then raise insufficient_privilege; end if;
 perform 1 from public.consents where user_id=l.user_id and policy_version='2026-10-05' for share;
 if not found then raise insufficient_privilege; end if;
 perform 1 from public.children where id=l.child_id and user_id=l.user_id and memory_enabled for share;
 if not found then return 0; end if;
 if jsonb_typeof(p_memories)<>'array' or jsonb_array_length(p_memories)>4 then raise exception 'Invalid memories'; end if;
 for m in select value from jsonb_array_elements(p_memories) loop
  if m->>'source' not in ('parent_said','ai_inferred') or coalesce(m->>'content','')='' then raise exception 'Invalid memories'; end if;
  if not exists(select 1 from public.memories where child_id=l.child_id and lower(content)=lower(m->>'content')) then
   insert into public.memories(user_id,child_id,decode_id,kind,content,source,confidence,sensitive,confirmed_at,expires_at)
   values(l.user_id,l.child_id,null,m->>'kind',m->>'content',
    case when m->>'source'='parent_said' then 'log' else 'ai_inferred' end,
    case when m->>'source'='parent_said' then 1 else least((m->>'confidence')::numeric,0.7) end,
    coalesce((m->>'sensitive')::boolean,false),null,now()+interval '30 days');
   added:=added+1;
  end if;
 end loop;
 return added;
end $$;
revoke all on function public.propose_log_memories(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.propose_log_memories(uuid,uuid,jsonb) to service_role;
