begin;
-- Parents 1-8 and 10 consented, 9 without consent; 99 is an operations member with an AAL2 session, 98 at AAL1.
insert into auth.users(id,email) select ('f8000000-0000-4000-8000-0000000000'||lpad(g::text,2,'0'))::uuid,'sponsor-'||g||'@example.invalid' from generate_series(1,10) g;
insert into auth.users(id,email) values('f8000000-0000-4000-8000-000000000099','sponsor-staff@example.invalid'),('f8000000-0000-4000-8000-000000000098','sponsor-aal1@example.invalid');
insert into auth.sessions(id,user_id,aal) values('f8000000-0000-4000-8001-000000000099','f8000000-0000-4000-8000-000000000099','aal2'),('f8000000-0000-4000-8001-000000000098','f8000000-0000-4000-8000-000000000098','aal1');
insert into public.admin_memberships(user_id,role) values('f8000000-0000-4000-8000-000000000099','operations'),('f8000000-0000-4000-8000-000000000098','operations');
insert into public.consents(user_id,policy_version) select ('f8000000-0000-4000-8000-0000000000'||lpad(g::text,2,'0'))::uuid,'2026-10-05' from generate_series(1,10) g where g<>9;
insert into public.children(id,user_id,name,dob) select ('f8000000-0000-4000-8002-0000000000'||lpad(g::text,2,'0'))::uuid,('f8000000-0000-4000-8000-0000000000'||lpad(g::text,2,'0'))::uuid,'Synthetic child '||g,'2019-01-01' from generate_series(1,10) g;
create function pg_temp.parent(n int) returns uuid language sql immutable as $$ select ('f8000000-0000-4000-8000-0000000000'||lpad(n::text,2,'0'))::uuid $$;
create function pg_temp.child(n int) returns uuid language sql immutable as $$ select ('f8000000-0000-4000-8002-0000000000'||lpad(n::text,2,'0'))::uuid $$;
create function pg_temp.redeem(n int, code text) returns jsonb language plpgsql as $$ begin
 perform set_config('request.jwt.claims',jsonb_build_object('sub',pg_temp.parent(n),'role','authenticated')::text,true);
 return public.redeem_sponsor_code(code);
end $$;
create function pg_temp.denied(command text) returns void language plpgsql as $$ begin
 begin execute command; exception when insufficient_privilege then return; end;
 raise exception 'Unexpected success: %', command;
end $$;

-- ── Team setup: owner/operations at AAL2 only, audited ──
set local role service_role;
do $$ declare staff uuid:='f8000000-0000-4000-8000-000000000099'; s uuid:='f8000000-0000-4000-8001-000000000099';
 today date:=(now() at time zone 'Asia/Kolkata')::date; org jsonb;
begin
 org:=jsonb_build_object('name','Synthetic School','kind','school','contact_name','Head','contact_email','Head@School.example','seats',7,'starts_on',today-10,'ends_on',today+30,'status','active');
 begin perform public.save_organisation('f8000000-0000-4000-8003-000000000001','f8000000-0000-4000-8000-000000000098','f8000000-0000-4000-8001-000000000098',0,org); raise exception 'AAL1 created an organisation';
 exception when insufficient_privilege then null; end;
 begin perform public.save_organisation('f8000000-0000-4000-8003-000000000001','f8000000-0000-4000-8000-000000000001',s,0,org); raise exception 'A parent created an organisation';
 exception when insufficient_privilege then null; end;
 perform public.save_organisation('f8000000-0000-4000-8003-000000000001',staff,s,0,org);
 if (select contact_email from public.organisations where id='f8000000-0000-4000-8003-000000000001')<>'head@school.example' then raise exception 'Email not normalised'; end if;
 -- A stale revision is refused.
 begin perform public.save_organisation('f8000000-0000-4000-8003-000000000001',staff,s,0,org); raise exception 'Stale organisation save accepted';
 exception when serialization_failure then null; end;
 begin perform public.save_organisation(gen_random_uuid(),staff,s,0,org||'{"kind":"franchise"}'); raise exception 'Unknown kind accepted';
 exception when check_violation then null; end;
 perform public.save_organisation('f8000000-0000-4000-8003-000000000002',staff,s,0,jsonb_build_object('name','Synthetic Employer','kind','employer','seats',1,'starts_on',today-1,'ends_on',today+60,'status','active'));
 perform public.save_organisation('f8000000-0000-4000-8003-000000000003',staff,s,0,jsonb_build_object('name','Synthetic Draft Clinic','kind','clinic','seats',10,'starts_on',today,'ends_on',today+60));
 perform public.save_organisation('f8000000-0000-4000-8003-000000000004',staff,s,0,jsonb_build_object('name','Synthetic Past Partner','kind','community','seats',10,'starts_on',today-60,'ends_on',today-1,'status','active'));
 perform public.save_organisation('f8000000-0000-4000-8003-000000000005',staff,s,0,jsonb_build_object('name','Synthetic Abroad Circle','kind','diaspora_community','seats',10,'starts_on',today,'ends_on',today+60,'status','active'));
 perform public.create_sponsor_code(staff,s,'f8000000-0000-4000-8003-000000000001','AAAAA22222',100,null);
 perform public.create_sponsor_code(staff,s,'f8000000-0000-4000-8003-000000000001','AAAAA33333',1,null);
 perform public.create_sponsor_code(staff,s,'f8000000-0000-4000-8003-000000000001','AAAAA44444',100,today-1);
 perform public.create_sponsor_code(staff,s,'f8000000-0000-4000-8003-000000000001','AAAAA55555',100,null);
 perform public.set_sponsor_code_active(staff,s,'AAAAA55555',false);
 perform public.create_sponsor_code(staff,s,'f8000000-0000-4000-8003-000000000002','BBBBB22222',100,null);
 perform public.create_sponsor_code(staff,s,'f8000000-0000-4000-8003-000000000003','CCCCC22222',100,null);
 perform public.create_sponsor_code(staff,s,'f8000000-0000-4000-8003-000000000004','DDDDD22222',100,null);
 perform public.create_sponsor_code(staff,s,'f8000000-0000-4000-8003-000000000005','EEEEE22222',100,null);
 -- Ambiguous letters and short codes cannot be issued.
 begin perform public.create_sponsor_code(staff,s,'f8000000-0000-4000-8003-000000000001','AAAAA0OIL1',1,null); raise exception 'Ambiguous code accepted';
 exception when check_violation then null; end;
 begin perform public.create_sponsor_code(staff,s,'f8000000-0000-4000-8003-000000000001','AAAAA22222',1,null); raise exception 'Duplicate code accepted';
 exception when unique_violation then null; end;
 if (select count(*) from public.admin_audit_events where action like 'sponsor.%')<>14 then raise exception 'Sponsor changes not audited: %', (select count(*) from public.admin_audit_events where action like 'sponsor.%'); end if;
 if exists(select 1 from public.admin_audit_events where action like 'sponsor.code%' and details::text like '%AAAAA22222%') then raise exception 'Full code written to the audit log'; end if;
end $$;
reset role;

-- ── Redemption rules, as parents ──
set local role authenticated;
do $$ declare r jsonb; today date:=(now() at time zone 'Asia/Kolkata')::date; begin
 -- No consent, no redemption.
 begin perform pg_temp.redeem(9,'AAAAA22222'); raise exception 'Redeemed without consent'; exception when insufficient_privilege then null; end;
 r:=pg_temp.redeem(1,'not a code'); if r->>'status'<>'invalid' then raise exception 'Malformed code: %', r; end if;
 r:=pg_temp.redeem(1,'ZZZZZ22222'); if r->>'status'<>'invalid' then raise exception 'Unknown code: %', r; end if;
 -- Lower case, spaces and a hyphen are accepted.
 r:=pg_temp.redeem(1,' aaaaa-22222 ');
 if r->>'status'<>'redeemed' or (r->>'already')::boolean or r->>'organisation'<>'Synthetic School' then raise exception 'Redemption failed: %', r; end if;
 if (r->>'until')::timestamptz<>((today+31)::timestamp at time zone 'Asia/Kolkata') then raise exception 'Access should run to the end of the last day, India time: %', r; end if;
 -- Re-entering the code is idempotent.
 r:=pg_temp.redeem(1,'AAAAA22222'); if r->>'status'<>'redeemed' or not (r->>'already')::boolean then raise exception 'Re-redeem not idempotent: %', r; end if;
 -- Another code from the same sponsor is idempotent too; a different sponsor is refused while this one runs.
 r:=pg_temp.redeem(1,'AAAAA33333'); if not (r->>'already')::boolean then raise exception 'Second code of the same sponsor: %', r; end if;
 r:=pg_temp.redeem(1,'BBBBB22222'); if r->>'status'<>'other_sponsor' or r->>'organisation'<>'Synthetic School' then raise exception 'Second sponsorship allowed: %', r; end if;
 -- Draft organisation, switched-off code, expired code, finished contract.
 r:=pg_temp.redeem(2,'CCCCC22222'); if r->>'status'<>'inactive' then raise exception 'Draft organisation: %', r; end if;
 r:=pg_temp.redeem(2,'AAAAA55555'); if r->>'status'<>'inactive' then raise exception 'Disabled code: %', r; end if;
 r:=pg_temp.redeem(2,'AAAAA44444'); if r->>'status'<>'expired' then raise exception 'Expired code: %', r; end if;
 r:=pg_temp.redeem(2,'DDDDD22222'); if r->>'status'<>'expired' then raise exception 'Finished contract: %', r; end if;
 -- A code for one family: the second family is refused.
 r:=pg_temp.redeem(2,'AAAAA33333'); if r->>'status'<>'redeemed' then raise exception 'Single-use code: %', r; end if;
 r:=pg_temp.redeem(3,'AAAAA33333'); if r->>'status'<>'full' then raise exception 'Single-use code reused: %', r; end if;
 -- The employer bought one seat.
 r:=pg_temp.redeem(8,'BBBBB22222'); if r->>'status'<>'redeemed' then raise exception 'Employer seat: %', r; end if;
 r:=pg_temp.redeem(7,'BBBBB22222'); if r->>'status'<>'full' then raise exception 'Seat limit not enforced: %', r; end if;
 -- Ten refused attempts in an hour lock further tries, even with a valid code.
 for i in 1..10 loop perform pg_temp.redeem(6,'ZZZZZ'||i); end loop;
 r:=pg_temp.redeem(6,'AAAAA22222'); if r->>'status'<>'too_many_attempts' then raise exception 'Attempts not limited: %', r; end if;
end $$;
-- Parents see only their own sponsorship; nothing about organisations, codes or other families.
select set_config('request.jwt.claims','{"sub":"f8000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$ begin
 if (select count(*) from public.sponsored_access)<>1 or exists(select 1 from public.sponsored_access where user_id<>'f8000000-0000-4000-8000-000000000002') then raise exception 'Sponsorships leaked across families'; end if;
end $$;
select pg_temp.denied('select * from public.organisations');
select pg_temp.denied('select * from public.sponsor_codes');
select pg_temp.denied('select * from public.sponsor_code_attempts');
select pg_temp.denied('select public.sponsor_report(''f8000000-0000-4000-8003-000000000001'')');
select pg_temp.denied('select public.sponsor_admin_overview()');
select pg_temp.denied('select public.save_organisation(gen_random_uuid(),null,null,0,''{}'')');
select pg_temp.denied('select public.create_sponsor_code(null,null,null,''AAAAA66666'',1,null)');
select pg_temp.denied('insert into public.sponsored_access(user_id,organisation_id,organisation_name,code,access_until) values(''f8000000-0000-4000-8000-000000000002'',''f8000000-0000-4000-8003-000000000001'',''x'',''AAAAA22222'',now()+interval ''1 year'')');
select pg_temp.denied('update public.sponsored_access set access_until=now()+interval ''10 years''');
reset role;
set local role anon;
select pg_temp.denied('select public.redeem_sponsor_code(''AAAAA22222'')');
reset role;

-- ── Counts are exact under the locks ──
do $$ begin
 if (select redeemed_count from public.sponsor_codes where code='AAAAA22222')<>1 then raise exception 'Idempotent re-redeem was counted twice'; end if;
 if (select redeemed_count from public.sponsor_codes where code='AAAAA33333')<>1 then raise exception 'Single-use count'; end if;
 if (select count(*) from public.sponsor_code_attempts where user_id=pg_temp.parent(6))<>10 then raise exception 'Attempt log'; end if;
end $$;

-- ── reserve_guidance: sponsored families get Plus limits (10 a day), Free keeps 10 a week ──
-- Families 1 (sponsored) and 3 (not) each saved 10 answers two days ago: inside Free's week, outside Plus's day.
insert into public.decodes(user_id,child_id,scenario,analysis,safety_category,risk_level,created_at)
 select pg_temp.parent(n),pg_temp.child(n),'Synthetic earlier answer '||g,'{"sayThis":"Try this"}','none','none',now()-interval '2 days' from generate_series(1,10) g, (values (1),(3)) f(n);
set local role service_role;
do $$ declare r jsonb; begin
 r:=public.reserve_guidance(gen_random_uuid(),pg_temp.parent(3),pg_temp.child(3),'decode','free');
 if r->>'status'<>'limit' or (r->>'plus')::boolean then raise exception 'Free family should be at its weekly limit: %', r; end if;
 r:=public.reserve_guidance('f8000000-0000-4000-8004-000000000001',pg_temp.parent(1),pg_temp.child(1),'decode','sponsored');
 if r->>'status'<>'reserved' then raise exception 'Sponsored family did not get the Plus daily allowance: %', r; end if;
 update public.guidance_requests set state='failed' where id='f8000000-0000-4000-8004-000000000001';
 -- Weekly reports are Plus-only.
 r:=public.reserve_guidance(gen_random_uuid(),pg_temp.parent(3),pg_temp.child(3),'report','free');
 if r->>'status'<>'limit' or (r->>'plus')::boolean then raise exception 'Free report: %', r; end if;
 r:=public.reserve_guidance('f8000000-0000-4000-8004-000000000002',pg_temp.parent(1),pg_temp.child(1),'report','sponsored');
 if r->>'status'<>'reserved' then raise exception 'Sponsored report: %', r; end if;
 update public.guidance_requests set state='failed' where id='f8000000-0000-4000-8004-000000000002';
 -- Ten answers today reach the Plus daily limit, flagged as Plus.
 insert into public.decodes(user_id,child_id,scenario,analysis,safety_category,risk_level) select pg_temp.parent(1),pg_temp.child(1),'Synthetic today '||g,'{}','none','none' from generate_series(1,10) g;
 r:=public.reserve_guidance(gen_random_uuid(),pg_temp.parent(1),pg_temp.child(1),'decode','sponsored');
 if r->>'status'<>'limit' or not (r->>'plus')::boolean or (r->>'limit')::int<>10 then raise exception 'Plus daily limit: %', r; end if;
 delete from public.decodes where user_id=pg_temp.parent(1) and created_at>now()-interval '1 day';
 -- Ending the contract ends access now; the family is back on Free limits.
 perform public.save_organisation('f8000000-0000-4000-8003-000000000001','f8000000-0000-4000-8000-000000000099','f8000000-0000-4000-8001-000000000099',1,
  (select to_jsonb(o)-'id'-'revision'-'created_at'-'updated_at' from public.organisations o where id='f8000000-0000-4000-8003-000000000001')||'{"status":"ended"}');
 if exists(select 1 from public.sponsored_access where organisation_id='f8000000-0000-4000-8003-000000000001' and access_until>now()) then raise exception 'Ended contract still grants access'; end if;
 r:=public.reserve_guidance(gen_random_uuid(),pg_temp.parent(1),pg_temp.child(1),'decode','after');
 if r->>'status'<>'limit' or (r->>'plus')::boolean then raise exception 'Access did not revert after the contract ended: %', r; end if;
 -- Renewal restores the term for families who joined, without a new seat or code.
 perform public.save_organisation('f8000000-0000-4000-8003-000000000001','f8000000-0000-4000-8000-000000000099','f8000000-0000-4000-8001-000000000099',2,
  (select to_jsonb(o)-'id'-'revision'-'created_at'-'updated_at' from public.organisations o where id='f8000000-0000-4000-8003-000000000001')||jsonb_build_object('status','active','ends_on',(now() at time zone 'Asia/Kolkata')::date+90));
 r:=public.reserve_guidance('f8000000-0000-4000-8004-000000000003',pg_temp.parent(1),pg_temp.child(1),'decode','renewed');
 if r->>'status'<>'reserved' then raise exception 'Renewal did not restore access: %', r; end if;
 update public.guidance_requests set state='failed' where id='f8000000-0000-4000-8004-000000000003';
 -- A single expired row (time passing) also reverts: the employer's family.
 update public.sponsored_access set access_until=now()-interval '1 second' where user_id=pg_temp.parent(8);
 insert into public.decodes(user_id,child_id,scenario,analysis,safety_category,risk_level,created_at)
  select pg_temp.parent(8),pg_temp.child(8),'Synthetic earlier answer '||g,'{}','none','none',now()-interval '2 days' from generate_series(1,10) g;
 r:=public.reserve_guidance(gen_random_uuid(),pg_temp.parent(8),pg_temp.child(8),'decode','expired');
 if r->>'status'<>'limit' or (r->>'plus')::boolean then raise exception 'Expired sponsorship still Plus: %', r; end if;
end $$;
reset role;
-- After expiry the family may join a different sponsor.
set local role authenticated;
do $$ declare r jsonb; begin
 r:=pg_temp.redeem(8,'EEEEE22222'); if r->>'status'<>'redeemed' or r->>'organisation'<>'Synthetic Abroad Circle' then raise exception 'Could not join a new sponsor after expiry: %', r; end if;
end $$;
reset role;

-- ── What the sponsor sees: aggregates only, suppressed below five families ──
set local role service_role;
do $$ declare m jsonb; o jsonb; begin
 m:=public.sponsor_report('f8000000-0000-4000-8003-000000000001');
 if m->>'families_joined'<>'<5' or m->>'ask_turns_30_days'<>'<5' or (m->>'seats')::int<>7 then raise exception 'Small sponsor not suppressed: %', m; end if;
end $$;
reset role;
set local role authenticated;
do $$ declare r jsonb; begin
 foreach r in array array[pg_temp.redeem(3,'AAAAA22222'),pg_temp.redeem(4,'AAAAA22222'),pg_temp.redeem(5,'AAAAA22222'),pg_temp.redeem(7,'AAAAA22222')] loop
  if r->>'status'<>'redeemed' then raise exception 'Joining the school: %', r; end if;
 end loop;
 -- Families 1-5 and 7 hold six of seven seats; family 10 takes the last; family 2's earlier seat counts.
 r:=pg_temp.redeem(10,'AAAAA22222'); if r->>'status'<>'redeemed' then raise exception 'Last seat: %', r; end if;
end $$;
reset role;
-- One more family: the school is full. (Family 6 is still locked out, so use a fresh consented parent.)
insert into auth.users(id,email) values('f8000000-0000-4000-8000-000000000011','sponsor-11@example.invalid');
insert into public.consents(user_id,policy_version) values('f8000000-0000-4000-8000-000000000011','2026-10-05');
set local role authenticated;
do $$ declare r jsonb; begin
 r:=pg_temp.redeem(11,'AAAAA22222'); if r->>'status'<>'full' then raise exception 'Organisation seats not enforced: %', r; end if;
end $$;
reset role;
-- Families 3, 4 and 5 used Ask in the last 30 days (after redeeming); a safety-related turn is never counted.
-- Family 3's earlier answers predate its sponsorship and are not counted either.
insert into public.decodes(user_id,child_id,scenario,analysis,safety_category,risk_level)
 select pg_temp.parent(n),pg_temp.child(n),'Synthetic sponsored answer','{}','none','none' from generate_series(3,5) n;
insert into public.decodes(user_id,child_id,scenario,analysis,safety_category,risk_level) values(pg_temp.parent(7),pg_temp.child(7),'Synthetic support','{}','parent_distress','elevated');
insert into public.child_care_state(child_id,user_id,value) select pg_temp.child(n),pg_temp.parent(n),'{"handbook":{"card-a":{"status":"saved"},"card-b":{"status":"done"}}}' from generate_series(1,5) n;
set local role service_role;
do $$ declare m jsonb; v jsonb; begin
 m:=public.sponsor_report('f8000000-0000-4000-8003-000000000001');
 if (m->>'families_joined')::int<>7 then raise exception 'Families joined: %', m; end if;
 if m->>'families_active_30_days'<>'<5' or m->>'ask_turns_30_days'<>'<5' then raise exception 'Three active families exposed: %', m; end if;
 if (m->>'handbook_cards_saved')::int<>10 then raise exception 'Handbook cards: %', m; end if;
 if m::text ~ 'f8000000' or m::text ~ 'Synthetic child' or m::text ~ '@' then raise exception 'Identifiers in sponsor report: %', m; end if;
 -- Two more active families make five: the figures appear, and the safety turn is still not counted.
 insert into public.decodes(user_id,child_id,scenario,analysis,safety_category,risk_level) select pg_temp.parent(n),pg_temp.child(n),'Synthetic sponsored answer','{}','none','none' from (values (1),(2)) f(n);
 m:=public.sponsor_report('f8000000-0000-4000-8003-000000000001');
 if (m->>'families_active_30_days')::int<>5 or (m->>'ask_turns_30_days')::int<>5 then raise exception 'Five active families: %', m; end if;
 -- Team overview: seats used per organisation, codes and counts, no family identifiers.
 v:=public.sponsor_admin_overview();
 if (select (e->>'seats_used')::int from jsonb_array_elements(v) e where e->'organisation'->>'id'='f8000000-0000-4000-8003-000000000001')<>7 then raise exception 'Seats used: %', v; end if;
 if v::text ~ 'f8000000-0000-4000-8000-' then raise exception 'Family identifiers in team overview'; end if;
end $$;
reset role;

-- ── Erasure: the family's sponsorship goes with the account and its seat is released ──
delete from auth.users where id=pg_temp.parent(5);
do $$ begin
 if exists(select 1 from public.sponsored_access where user_id=pg_temp.parent(5)) then raise exception 'Sponsorship survived erasure'; end if;
 if (select count(*) from public.sponsored_access where organisation_id='f8000000-0000-4000-8003-000000000001')<>6 then raise exception 'Seat not released'; end if;
end $$;
rollback;
