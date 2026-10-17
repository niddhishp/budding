-- Synthetic fixtures only; every assertion and fixture is rolled back.
-- Run as the migration/database owner. A failure aborts the transaction.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
insert into auth.users(id,email,email_confirmed_at) values
 ('f0000000-0000-4000-8000-000000000001','security-parent-a@example.invalid',now()),
 ('f0000000-0000-4000-8000-000000000002','security-parent-b@example.invalid',now()),
 ('f0000000-0000-4000-8000-000000000003','security-no-consent@example.invalid',now());
insert into auth.sessions(id,user_id,aal) values
 ('f0000000-0000-4000-8000-000000000011','f0000000-0000-4000-8000-000000000001','aal2'),
 ('f0000000-0000-4000-8000-000000000012','f0000000-0000-4000-8000-000000000002','aal2');
insert into public.consents(user_id,policy_version) values
 ('f0000000-0000-4000-8000-000000000001','2026-10-05'),
 ('f0000000-0000-4000-8000-000000000002','2026-10-05');
insert into public.children(id,user_id,name,dob) values
 ('f0000000-0000-4000-8000-000000000021','f0000000-0000-4000-8000-000000000001','Synthetic A','2020-01-01'),
 ('f0000000-0000-4000-8000-000000000022','f0000000-0000-4000-8000-000000000002','Synthetic B','2020-01-01');
insert into public.decodes(id,user_id,child_id,scenario,analysis) values
 ('f0000000-0000-4000-8000-000000000031','f0000000-0000-4000-8000-000000000002','f0000000-0000-4000-8000-000000000022','Synthetic scenario','{}');
insert into public.admin_memberships(user_id,role) values
 ('f0000000-0000-4000-8000-000000000001','owner'),
 ('f0000000-0000-4000-8000-000000000002','operations');

set local role anon;
select set_config('request.jwt.claims','{}',true);
do $$ begin
  if exists(select 1 from public.children) then raise exception 'FAIL: anonymous family access'; end if;
  begin
    perform public.admin_session();
    raise exception 'FAIL: anonymous admin RPC';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"f0000000-0000-4000-8000-000000000003","role":"authenticated","aal":"aal1"}',true);
do $$ begin
  begin
    insert into public.children(name,dob) values('Blocked without consent','2020-01-01');
    raise exception 'FAIL: consent bypass';
  exception when insufficient_privilege then null; end;
  if public.admin_session() is not null then raise exception 'FAIL: parent gained admin'; end if;
  begin
    insert into public.admin_memberships(user_id,role) values(auth.uid(),'owner');
    raise exception 'FAIL: membership self-grant';
  exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claims','{"sub":"f0000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1","session_id":"f0000000-0000-4000-8000-000000000011"}',true);
do $$ declare affected integer; begin
  if (select count(*) from public.children) <> 1 then raise exception 'FAIL: cross-parent child read'; end if;
  update public.children set name='Must not change' where id='f0000000-0000-4000-8000-000000000022';
  get diagnostics affected=row_count;
  if affected <> 0 then raise exception 'FAIL: cross-parent child update'; end if;
  delete from public.children where id='f0000000-0000-4000-8000-000000000022';
  get diagnostics affected=row_count;
  if affected <> 0 then raise exception 'FAIL: cross-parent child delete'; end if;
  begin
    insert into public.expert_requests(child_id,concern,phone) values('f0000000-0000-4000-8000-000000000022','Synthetic concern','1234567890');
    raise exception 'FAIL: cross-parent expert child';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.memories(child_id,kind,content,source,decode_id) values('f0000000-0000-4000-8000-000000000021','fact','Synthetic','parent_said','f0000000-0000-4000-8000-000000000031');
    raise exception 'FAIL: cross-parent memory source';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.decodes(child_id,scenario,analysis,refines) values('f0000000-0000-4000-8000-000000000021','Synthetic','{}','f0000000-0000-4000-8000-000000000031');
    raise exception 'FAIL: cross-parent refinement';
  exception when insufficient_privilege then null; end;
  begin
    perform public.admin_staff();
    raise exception 'FAIL: owner bypassed MFA';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.admin_audit_events(action) values('forged');
    raise exception 'FAIL: audit forged';
  exception when insufficient_privilege then null; end;
  -- A positive control proves legitimate parent writes still work.
  insert into public.expert_requests(child_id,concern,phone) values('f0000000-0000-4000-8000-000000000021','Synthetic own concern','1234567890');
end $$;

select set_config('request.jwt.claims','{"sub":"f0000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal2","session_id":"f0000000-0000-4000-8000-000000000012","user_metadata":{"role":"owner"}}',true);
do $$ begin
  if public.admin_session()->>'role' <> 'operations' then raise exception 'FAIL: editable metadata authorization'; end if;
  begin
    perform public.set_admin_membership('security-parent-b@example.invalid','owner',true);
    raise exception 'FAIL: operations escalated';
  exception when insufficient_privilege then null; end;
  if exists(select 1 from public.admin_audit_events) then raise exception 'FAIL: operations read audit'; end if;
end $$;

select set_config('request.jwt.claims','{"sub":"f0000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2","session_id":"f0000000-0000-4000-8000-000000000011"}',true);
do $$ begin
  if public.admin_session()->>'aal' <> 'aal2' then raise exception 'FAIL: valid owner session rejected'; end if;
  if jsonb_array_length(public.admin_staff()) < 2 then raise exception 'FAIL: owner cannot see team'; end if;
  perform public.set_admin_membership('security-parent-b@example.invalid','therapist',true);
  if not exists(select 1 from public.admin_audit_events where target_id='f0000000-0000-4000-8000-000000000002' and details->>'role'='therapist') then raise exception 'FAIL: missing role-change audit'; end if;
end $$;

-- Revoke the session while the original elevated JWT remains unchanged.
reset role;
update auth.sessions set aal='aal1' where id='f0000000-0000-4000-8000-000000000011';
set local role authenticated;
do $$ begin
  if public.admin_session()->>'aal' <> 'aal1' then raise exception 'FAIL: downgraded session retained MFA'; end if;
  begin
    perform public.admin_staff();
    raise exception 'FAIL: stale MFA token read team';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
delete from auth.sessions where id='f0000000-0000-4000-8000-000000000011';
set local role authenticated;
do $$ begin
  if public.admin_session() is not null then raise exception 'FAIL: revoked session still authorized'; end if;
  begin
    perform public.admin_staff();
    raise exception 'FAIL: revoked session read team';
  exception when insufficient_privilege then null; end;
  delete from public.consents where user_id=auth.uid();
  if not exists(select 1 from public.consent_events where user_id=auth.uid() and action='withdrawn') then raise exception 'FAIL: no withdrawal receipt'; end if;
  begin
    insert into public.context_logs(child_id,content) values('f0000000-0000-4000-8000-000000000021','Must be blocked after withdrawal');
    raise exception 'FAIL: withdrawal bypass';
  exception when insufficient_privilege then null; end;
  if (select count(*) from public.children) <> 1 then raise exception 'FAIL: withdrawal blocks access to own data'; end if;
end $$;

reset role;
-- Test final-owner protection without modifying any existing owner: count all
-- active owners and attempt to remove the final one only in an isolated database.
do $$ begin
  if (select count(*) from public.admin_memberships where role='owner' and active)=1 then
    begin
      delete from public.admin_memberships where user_id='f0000000-0000-4000-8000-000000000001';
      raise exception 'FAIL: final owner removed';
    exception when raise_exception then
      if sqlerrm <> 'Keep at least one active owner' then raise; end if;
    end;
  end if;
end $$;
-- Revoked membership denies a still-valid session.
update public.admin_memberships set active=false where user_id='f0000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"f0000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal2","session_id":"f0000000-0000-4000-8000-000000000012"}',true);
do $$ begin
  if public.admin_session() is not null then raise exception 'FAIL: paused member still authorized'; end if;
end $$;
reset role;
-- Non-owner account erasure must cascade staff membership and consent receipts.
delete from auth.users where id='f0000000-0000-4000-8000-000000000002';
do $$ begin
  if exists(select 1 from public.consent_events where user_id='f0000000-0000-4000-8000-000000000002') then raise exception 'FAIL: consent receipt survived erasure'; end if;
end $$;
rollback;
