-- A chat or practice conversation uses one Ask turn when it starts. Later messages in the same
-- conversation (continuation_of set, conversation analysis present) no longer count towards the
-- allowance. The application caps a conversation's length and marks those turns as uncharged; the
-- existing daily processing ceiling and concurrency limit still bound provider use.
-- No existing rows are rewritten.
set local lock_timeout='5s';
do $$ declare definition text;
 old text:='safety_category=''none'' and refines is null and created_at>=since_at';
begin
 select pg_get_functiondef('public.reserve_guidance(uuid,uuid,uuid,text,text,uuid,boolean)'::regprocedure) into definition;
 if position(old in definition)=0 then raise exception 'Unexpected guidance usage definition'; end if;
 execute replace(definition,old,'safety_category=''none'' and refines is null and not coalesce(continuation_of is not null and analysis ? ''conversation'',false) and created_at>=since_at');
end $$;
