-- Two allowance changes, applied with the same guarded text replacement as 017, 018 and 025:
-- 1. An Ask answer saved without its explanation because Kahiye could not write or check it
--    (analysis.detailUnavailable) no longer counts. A parent who leaves after the words are shown
--    (analysis.detailCancelled) is still counted.
-- 2. Free families get 10 Ask turns a week while paid plans are not open (was 3).
-- No rows are rewritten.
set local lock_timeout='5s';
do $$ declare definition text;
 usage_old text:='and not coalesce(continuation_of is not null and analysis ? ''conversation'',false) and created_at>=since_at';
 limit_old text:='lim:=case when plus then 10 else 3 end;';
begin
 select pg_get_functiondef('public.reserve_guidance(uuid,uuid,uuid,text,text,uuid,boolean)'::regprocedure) into definition;
 if position(usage_old in definition)=0 or position(limit_old in definition)=0 then raise exception 'Unexpected guidance allowance definition'; end if;
 definition:=replace(definition,usage_old,'and not coalesce(continuation_of is not null and analysis ? ''conversation'',false) and analysis->>''detailUnavailable'' is null and created_at>=since_at');
 execute replace(definition,limit_old,'lim:=case when plus then 10 else 10 end;');
end $$;
