begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('d3000000-0000-4000-8000-000000000001','guide-a@example.invalid',now()),
 ('d3000000-0000-4000-8000-000000000002','guide-b@example.invalid',now());
insert into public.consents(user_id,policy_version) values ('d3000000-0000-4000-8000-000000000001','2026-10-05');
insert into public.children(id,user_id,name,dob) values
 ('d3000000-0000-4000-8000-000000000021','d3000000-0000-4000-8000-000000000002','Other family','2015-01-01');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"d3000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',true);
do $$ declare own_id uuid; affected integer; before_row jsonb; begin
 insert into public.children(name,dob,puberty_guide) values('Profile test','2015-01-01','girls') returning id into own_id;
 if (select gender is not null from public.children where id=own_id) then raise exception 'Legacy profile inferred'; end if;
 select to_jsonb(c)-'gender' into before_row from public.children c where id=own_id;
 update public.children set gender='girl' where id=own_id;
 if (select gender from public.children where id=own_id) <> 'girl' then raise exception 'Own preference not persisted'; end if;
 if (select to_jsonb(c)-'gender' from public.children c where id=own_id) <> before_row then raise exception 'Unrelated profile fields changed'; end if;
 update public.children set gender='boy' where id=own_id;
 if (select gender from public.children where id=own_id) <> 'boy' then raise exception 'Preference not editable'; end if;
 update public.children set gender=null where id=own_id;
 update public.children set gender='girl' where id='d3000000-0000-4000-8000-000000000021';
 get diagnostics affected=row_count;
 if affected <> 0 then raise exception 'Cross-parent preference update'; end if;
 begin
   update public.children set gender='guess' where id=own_id;
   raise exception 'Invalid preference accepted';
 exception when check_violation then null; end;
end $$;
reset role;
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
do $$ declare affected integer; begin
 begin
   update public.children set gender='girl';
   get diagnostics affected=row_count;
   if affected <> 0 then raise exception 'Anonymous write accepted'; end if;
 exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"d3000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal1"}',true);
do $$ declare affected integer; begin
 begin
   update public.children set gender='girl' where id='d3000000-0000-4000-8000-000000000021';
   get diagnostics affected=row_count;
   if affected <> 0 then raise exception 'Unconsented write accepted'; end if;
 exception when insufficient_privilege then null; end;
end $$;
rollback;
