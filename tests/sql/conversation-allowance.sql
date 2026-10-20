begin;
insert into auth.users(id,email) values ('f6000000-0000-4000-8000-000000000001','allowance@example.invalid');
insert into public.consents(user_id,policy_version) values ('f6000000-0000-4000-8000-000000000001','2026-10-05');
insert into public.children(id,user_id,name,dob) values
 ('f6000000-0000-4000-8000-000000000011','f6000000-0000-4000-8000-000000000001','Synthetic child','2018-01-01');
set local role service_role;
-- Two conversations started on Free, the first continued with five more messages.
insert into public.decodes(id,user_id,child_id,scenario,analysis,safety_category,risk_level) values
 ('f6000000-0000-4000-8000-000000000021','f6000000-0000-4000-8000-000000000001','f6000000-0000-4000-8000-000000000011','Start talk','{"conversation":{"mode":"talk"}}','none','none'),
 ('f6000000-0000-4000-8000-000000000022','f6000000-0000-4000-8000-000000000001','f6000000-0000-4000-8000-000000000011','Start practice','{"conversation":{"mode":"rehearse"}}','none','none');
insert into public.decodes(id,user_id,child_id,scenario,analysis,safety_category,risk_level,continuation_of) values
 ('f6000000-0000-4000-8000-000000000031','f6000000-0000-4000-8000-000000000001','f6000000-0000-4000-8000-000000000011','Reply 2','{"conversation":{"mode":"talk"}}','none','none','f6000000-0000-4000-8000-000000000021'),
 ('f6000000-0000-4000-8000-000000000032','f6000000-0000-4000-8000-000000000001','f6000000-0000-4000-8000-000000000011','Reply 3','{"conversation":{"mode":"talk"}}','none','none','f6000000-0000-4000-8000-000000000031'),
 ('f6000000-0000-4000-8000-000000000033','f6000000-0000-4000-8000-000000000001','f6000000-0000-4000-8000-000000000011','Reply 4','{"conversation":{"mode":"talk"}}','none','none','f6000000-0000-4000-8000-000000000032'),
 ('f6000000-0000-4000-8000-000000000034','f6000000-0000-4000-8000-000000000001','f6000000-0000-4000-8000-000000000011','Reply 5','{"conversation":{"mode":"talk"}}','none','none','f6000000-0000-4000-8000-000000000033'),
 ('f6000000-0000-4000-8000-000000000035','f6000000-0000-4000-8000-000000000001','f6000000-0000-4000-8000-000000000011','Reply 6','{"conversation":{"mode":"talk"}}','none','none','f6000000-0000-4000-8000-000000000034');
do $$ declare result jsonb; begin
 -- Seven saved messages, but only two conversation starts: a third turn is still available.
 result:=public.reserve_guidance('f6000000-0000-4000-8000-000000000041','f6000000-0000-4000-8000-000000000001','f6000000-0000-4000-8000-000000000011','decode','fingerprint-a');
 if result->>'status'<>'reserved' then raise exception 'Continued conversation messages consumed the allowance: %', result; end if;
 update public.guidance_requests set state='failed' where id='f6000000-0000-4000-8000-000000000041';
end $$;
-- Free allows 10 a week. Seven more ordinary answers make nine; an answer saved without its explanation
-- because Kahiye could not check it does not count, and a parent-cancelled one does.
insert into public.decodes(user_id,child_id,scenario,analysis,safety_category,risk_level)
 select 'f6000000-0000-4000-8000-000000000001','f6000000-0000-4000-8000-000000000011','Ordinary guidance '||g,'{"sayThis":"Try this"}','none','none' from generate_series(1,7) g;
insert into public.decodes(user_id,child_id,scenario,analysis,safety_category,risk_level) values
 ('f6000000-0000-4000-8000-000000000001','f6000000-0000-4000-8000-000000000011','Kahiye could not add the why','{"sayThis":"Try this","detailUnavailable":true}','none','none');
do $$ declare result jsonb; begin
 result:=public.reserve_guidance('f6000000-0000-4000-8000-000000000044','f6000000-0000-4000-8000-000000000001','f6000000-0000-4000-8000-000000000011','decode','fingerprint-d');
 if result->>'status'<>'reserved' then raise exception 'Answer missing its explanation through Kahiye''s failure was counted: %', result; end if;
 update public.guidance_requests set state='failed' where id='f6000000-0000-4000-8000-000000000044';
end $$;
insert into public.decodes(id,user_id,child_id,scenario,analysis,safety_category,risk_level) values
 ('f6000000-0000-4000-8000-000000000023','f6000000-0000-4000-8000-000000000001','f6000000-0000-4000-8000-000000000011','Parent left early','{"sayThis":"Try this","detailCancelled":true}','none','none');
do $$ declare result jsonb; begin
 result:=public.reserve_guidance('f6000000-0000-4000-8000-000000000042','f6000000-0000-4000-8000-000000000001','f6000000-0000-4000-8000-000000000011','decode','fingerprint-b');
 if result->>'status'<>'limit' or (result->>'limit')::int<>10 then raise exception 'Free allowance of 10 was not enforced: %', result; end if;
 -- The application marks an included conversation message as free; it is still reserved.
 result:=public.reserve_guidance('f6000000-0000-4000-8000-000000000043','f6000000-0000-4000-8000-000000000001','f6000000-0000-4000-8000-000000000011','decode','fingerprint-c',null,true);
 if result->>'status'<>'reserved' then raise exception 'Included conversation message was refused: %', result; end if;
 if (select charged from public.guidance_requests where id='f6000000-0000-4000-8000-000000000043') then raise exception 'Included message was charged'; end if;
end $$;
-- A share language can only be recorded on a caregiver share.
do $$ begin
 begin
  update public.guidance_requests set share_language='Hindi' where id='f6000000-0000-4000-8000-000000000043';
  raise exception 'Share language stored on guidance';
 exception when check_violation then null; end;
end $$;
reset role;
rollback;
