begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('d1000000-0000-4000-8000-000000000001','guide-a@example.invalid',now()),
 ('d1000000-0000-4000-8000-000000000002','guide-b@example.invalid',now());
insert into public.consents(user_id,policy_version) values ('d1000000-0000-4000-8000-000000000001','2026-10-05');
insert into public.children(id,user_id,name,dob) values
 ('d1000000-0000-4000-8000-000000000021','d1000000-0000-4000-8000-000000000002','Other family','2015-01-01');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"d1000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',true);
do $$ declare own_id uuid; affected integer; before_row jsonb; begin
 insert into public.children(name,dob) values('Guide test','2015-01-01') returning id into own_id;
 if (select puberty_guide is not null from public.children where id=own_id) then raise exception 'Legacy profile inferred'; end if;
 select to_jsonb(c)-'puberty_guide' into before_row from public.children c where id=own_id;
 update public.children set puberty_guide='girls' where id=own_id;
 if (select puberty_guide from public.children where id=own_id) <> 'girls' then raise exception 'Own preference not persisted'; end if;
 if (select to_jsonb(c)-'puberty_guide' from public.children c where id=own_id) <> before_row then raise exception 'Unrelated profile fields changed'; end if;
 update public.children set puberty_guide='boys' where id=own_id;
 if (select puberty_guide from public.children where id=own_id) <> 'boys' then raise exception 'Preference not editable'; end if;
 update public.children set puberty_guide=null where id=own_id;
 update public.children set puberty_guide='girls' where id='d1000000-0000-4000-8000-000000000021';
 get diagnostics affected=row_count;
 if affected <> 0 then raise exception 'Cross-parent preference update'; end if;
 begin
   update public.children set puberty_guide='guess' where id=own_id;
   raise exception 'Invalid preference accepted';
 exception when check_violation then null; end;
end $$;
reset role;
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
do $$ declare affected integer; begin
 begin
   update public.children set puberty_guide='girls';
   get diagnostics affected=row_count;
   if affected <> 0 then raise exception 'Anonymous write accepted'; end if;
 exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"d1000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal1"}',true);
do $$ declare affected integer; begin
 begin
   update public.children set puberty_guide='girls' where id='d1000000-0000-4000-8000-000000000021';
   get diagnostics affected=row_count;
   if affected <> 0 then raise exception 'Unconsented write accepted'; end if;
 exception when insufficient_privilege then null; end;
end $$;
rollback;
