begin;
-- Families 1 and 2 consented (one child each, aged 7, in Pune and Mumbai); family 3 has no consent.
-- Team member 4 is operations with an AAL2 session; team member 5 is operations without MFA.
insert into auth.users(id,email) select ('f8000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'partner-'||n||'@example.invalid' from generate_series(1,5) n;
insert into public.consents(user_id,policy_version) values('f8000000-0000-4000-8000-000000000001','2026-10-05'),('f8000000-0000-4000-8000-000000000002','2026-10-05');
insert into public.children(id,user_id,name,dob,city) values
 ('f8000000-0000-4000-8002-000000000001','f8000000-0000-4000-8000-000000000001','Meera',((now() at time zone 'Asia/Kolkata')::date - interval '7 years 2 months')::date,'Pune'),
 ('f8000000-0000-4000-8002-000000000002','f8000000-0000-4000-8000-000000000002','Kabir',((now() at time zone 'Asia/Kolkata')::date - interval '7 years 2 months')::date,'Mumbai'),
 ('f8000000-0000-4000-8002-000000000003','f8000000-0000-4000-8000-000000000003','Ira',((now() at time zone 'Asia/Kolkata')::date - interval '7 years 2 months')::date,'Pune');
insert into auth.sessions(id,user_id,aal) values('f8000000-0000-4000-8001-000000000004','f8000000-0000-4000-8000-000000000004','aal2'),('f8000000-0000-4000-8001-000000000005','f8000000-0000-4000-8000-000000000005','aal1');
insert into public.admin_memberships(user_id,role) values('f8000000-0000-4000-8000-000000000004','operations'),('f8000000-0000-4000-8000-000000000005','operations');
create function pg_temp.expect_error(command text,expected text) returns void language plpgsql as $$
begin
 begin execute command; exception when others then if sqlstate=expected then return; end if; raise; end;
 raise exception 'Unexpected success (wanted %): %',expected,command;
end $$;
-- Gates on a well-formed partner, overridden per case.
create function pg_temp.partner(overrides jsonb) returns jsonb language sql as $$
 select jsonb_build_object('name','Synthetic Tutors','legal_name','Synthetic Tutors Pvt Ltd','category','tuition','website','https://tutors.example.invalid',
  'terms_url','https://tutors.example.invalid/terms','contact_email','partners@tutors.example.invalid','grievance_contact','grievance@tutors.example.invalid',
  'contract_signed_on',((now() at time zone 'Asia/Kolkata')::date - 30)::text,'contract_expires_on',((now() at time zone 'Asia/Kolkata')::date + 300)::text,
  'fee_model','commission','fee_note','10% of first month fee','police_verification_confirmed',true,'insurance_confirmed',true,'status','active') || overrides;
$$;
create function pg_temp.offer(partner uuid, overrides jsonb) returns jsonb language sql as $$
 select jsonb_build_object('partner_id',partner,'title','Maths support, ages 6 to 9','summary','Small-group number sense sessions with a qualified tutor.',
  'category','tuition','min_months',72,'max_months',108,'cities',jsonb_build_array('Pune'),'moment','always','price_label','From Rs 1,500 a month',
  'cta','enquiry','url',null,'status','active') || overrides;
$$;

-- Parents and anonymous callers cannot read or write partner records directly.
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"f8000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select pg_temp.expect_error('select * from public.partners','42501');
select pg_temp.expect_error('select * from public.partner_offers','42501');
select pg_temp.expect_error('select * from public.partner_events','42501');
select pg_temp.expect_error('select public.save_partner(gen_random_uuid(),null,null,0,''{}'')','42501');
select pg_temp.expect_error('select public.partner_admin_overview(null,null)','42501');
select pg_temp.expect_error('insert into public.partner_leads(id,user_id,child_id,offer_id,provider_name,offer_title,shared,consent_version) values(gen_random_uuid(),''f8000000-0000-4000-8000-000000000001'',''f8000000-0000-4000-8002-000000000001'',gen_random_uuid(),''x'',''x'',''{}'',''x'')','42501');
reset role;
set local role anon;
select pg_temp.expect_error('select public.partner_offers_for_child(''f8000000-0000-4000-8002-000000000001'')','42501');
reset role;

set local role service_role;
do $$
declare staff uuid:='f8000000-0000-4000-8000-000000000004'; s uuid:='f8000000-0000-4000-8001-000000000004'; tutor uuid:='f8000000-0000-4000-8003-000000000001';
 lab uuid:='f8000000-0000-4000-8003-000000000002'; park uuid:='f8000000-0000-4000-8003-000000000003'; r jsonb;
begin
 -- Without MFA, nothing is written.
 begin perform public.save_partner(tutor,'f8000000-0000-4000-8000-000000000005','f8000000-0000-4000-8001-000000000005',0,pg_temp.partner('{}')); raise exception 'MFA bypass';
 exception when insufficient_privilege then null; end;
 -- Child-contact categories cannot be active without police verification and insurance.
 begin perform public.save_partner(tutor,staff,s,0,pg_temp.partner('{"police_verification_confirmed":false}')); raise exception 'Unverified tutor activated';
 exception when check_violation then null; end;
 begin perform public.save_partner(tutor,staff,s,0,pg_temp.partner('{"insurance_confirmed":false}')); raise exception 'Uninsured tutor activated';
 exception when check_violation then null; end;
 -- No signed contract, a future contract or an expired one: not active.
 begin perform public.save_partner(tutor,staff,s,0,pg_temp.partner('{"contract_signed_on":""}')); raise exception 'Unsigned partner activated';
 exception when check_violation then null; end;
 begin perform public.save_partner(tutor,staff,s,0,pg_temp.partner(jsonb_build_object('contract_signed_on',((now() at time zone 'Asia/Kolkata')::date+5)::text,'contract_expires_on',null))); raise exception 'Future contract activated';
 exception when check_violation then null; end;
 begin perform public.save_partner(tutor,staff,s,0,pg_temp.partner(jsonb_build_object('contract_expires_on',((now() at time zone 'Asia/Kolkata')::date-1)::text))); raise exception 'Expired contract activated';
 exception when check_violation then null; end;
 begin perform public.save_partner(tutor,staff,s,0,pg_temp.partner('{"terms_url":""}')); raise exception 'Partner without terms activated';
 exception when check_violation then null; end;
 -- Health partners are never on a per-patient commission, even as drafts.
 begin perform public.save_partner(lab,staff,s,0,pg_temp.partner('{"category":"health_lab","fee_model":"commission","status":"draft"}')); raise exception 'Health commission accepted';
 exception when check_violation then null; end;
 -- A draft is allowed without gates; a draft partner's offer cannot be activated.
 r:=public.save_partner(tutor,staff,s,0,pg_temp.partner('{"status":"draft","police_verification_confirmed":false}'));
 if (r->>'revision')::int<>1 then raise exception 'Draft not saved: %',r; end if;
 begin perform public.save_partner_offer('f8000000-0000-4000-8004-000000000001',staff,s,0,pg_temp.offer(tutor,'{}')); raise exception 'Offer activated for draft partner';
 exception when check_violation then null; end;
 -- Stale revisions are refused.
 begin perform public.save_partner(tutor,staff,s,0,pg_temp.partner('{}')); raise exception 'Stale revision accepted';
 exception when serialization_failure then null; end;
 r:=public.save_partner(tutor,staff,s,1,pg_temp.partner('{}'));
 if r->>'status'<>'active' or (r->>'revision')::int<>2 then raise exception 'Gated partner not activated: %',r; end if;
 -- Offer category must match the partner.
 begin perform public.save_partner_offer('f8000000-0000-4000-8004-000000000001',staff,s,0,pg_temp.offer(tutor,'{"category":"skills"}')); raise exception 'Category mismatch accepted';
 exception when check_violation then null; end;
 r:=public.save_partner_offer('f8000000-0000-4000-8004-000000000001',staff,s,0,pg_temp.offer(tutor,'{"cities":[" Pune "]}'));
 if r->>'reviewed_by'<>staff::text or r->>'reviewed_on' is null or r->'cities'<>'["pune"]' then raise exception 'Activation did not record the review: %',r; end if;
 -- Mumbai-only, online, draft, wrong-age and link offers from the same partner.
 perform public.save_partner_offer('f8000000-0000-4000-8004-000000000002',staff,s,0,pg_temp.offer(tutor,'{"title":"Mumbai physics circle","cities":["Mumbai"]}'));
 perform public.save_partner_offer('f8000000-0000-4000-8004-000000000003',staff,s,0,pg_temp.offer(tutor,'{"title":"Online reading club","cities":["online"],"cta":"link","url":"https://tutors.example.invalid/reading"}'));
 perform public.save_partner_offer('f8000000-0000-4000-8004-000000000004',staff,s,0,pg_temp.offer(tutor,'{"title":"Draft chemistry offer","status":"draft"}'));
 perform public.save_partner_offer('f8000000-0000-4000-8004-000000000005',staff,s,0,pg_temp.offer(tutor,'{"title":"Board exam revision","min_months":168,"max_months":216}'));
 begin perform public.save_partner_offer(gen_random_uuid(),staff,s,0,pg_temp.offer(tutor,'{"moment":"interest","trigger_value":"astrology"}')); raise exception 'Unknown interest trigger accepted';
 exception when check_violation then null; end;
 begin perform public.save_partner_offer(gen_random_uuid(),staff,s,0,pg_temp.offer(tutor,'{"cta":"link"}')); raise exception 'Link offer without a URL accepted';
 exception when check_violation then null; end;
 -- A health lab on a booking fee needs the same vetting for home visits.
 begin perform public.save_partner(lab,staff,s,0,pg_temp.partner('{"category":"health_lab","fee_model":"booking_fee","police_verification_confirmed":false}')); raise exception 'Unverified home health activated';
 exception when check_violation then null; end;
 perform public.save_partner(lab,staff,s,0,pg_temp.partner('{"name":"Synthetic Home Lab","category":"health_lab","fee_model":"booking_fee"}'));
 perform public.save_partner_offer('f8000000-0000-4000-8004-000000000006',staff,s,0,pg_temp.offer(lab,'{"title":"Vaccination at home","category":"health_lab","min_months":0,"max_months":216,"cities":["online"],"moment":"vaccination_due"}'));
 -- Venues are institutions; vetting flags are not required.
 perform public.save_partner(park,staff,s,0,pg_temp.partner('{"name":"Synthetic Science Park","category":"venue","fee_model":"listing_fee","police_verification_confirmed":false,"insurance_confirmed":false}'));
 -- Health partners cannot later be switched to a commission.
 begin perform public.save_partner(lab,staff,s,1,pg_temp.partner('{"name":"Synthetic Home Lab","category":"health_lab","fee_model":"commission"}')); raise exception 'Health commission accepted on edit';
 exception when check_violation then null; end;
 if (select count(*) from public.admin_audit_events where action in ('partner.saved','partner.offer.saved'))<9 then raise exception 'Team writes not audited'; end if;
end $$;
-- Gates hold for direct writes too, not only for the save functions.
select pg_temp.expect_error('update public.partners set police_verification_confirmed=false where id=''f8000000-0000-4000-8003-000000000001''','23514');
select pg_temp.expect_error('update public.partners set fee_model=''commission'' where id=''f8000000-0000-4000-8003-000000000002''','23514');
select pg_temp.expect_error('update public.partner_offers set status=''active'',reviewed_by=null where id=''f8000000-0000-4000-8004-000000000004''','23514');
-- A lead row can never carry a child's name or any field outside the fixed list.
select pg_temp.expect_error('insert into public.partner_leads(id,user_id,child_id,offer_id,provider_name,offer_title,shared,consent_version) values(gen_random_uuid(),''f8000000-0000-4000-8000-000000000001'',''f8000000-0000-4000-8002-000000000001'',''f8000000-0000-4000-8004-000000000001'',''x'',''x'',''{"parent_name":"A","contact_method":"phone","phone":"9999999999","child_age_band":"6–8 years","child_name":"Meera"}'',''partner-enquiry-2026-10-21'')','23514');
reset role;
-- Optional city is validated.
select pg_temp.expect_error('update public.children set city=''<b>Pune</b>'' where id=''f8000000-0000-4000-8002-000000000001''','23514');

-- Family 1 (Pune, 7 years) sees only active, gated, age- and city-matched offers.
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"f8000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$ declare r jsonb:=public.partner_offers_for_child('f8000000-0000-4000-8002-000000000001'); titles text[];
begin
 select array_agg(o->>'title' order by o->>'title') into titles from jsonb_array_elements(r->'offers') o;
 if titles<>array['Maths support, ages 6 to 9','Online reading club','Vaccination at home'] then raise exception 'Wrong offers for family 1: %',titles; end if;
 if r->>'age_band'<>'6–8 years' or r->>'city'<>'Pune' then raise exception 'Age band or city: %',r; end if;
 if r::text ~ 'fee_note|10% of first month|partners@tutors|legal_name|reviewed_by' then raise exception 'Internal partner fields exposed: %',r; end if;
 if not exists(select 1 from jsonb_array_elements(r->'offers') o where o->>'provider'='Synthetic Tutors' and o->>'terms_url' like 'https://%' and o->>'grievance_contact' is not null) then raise exception 'Provider disclosure missing'; end if;
 begin perform public.partner_offers_for_child('f8000000-0000-4000-8002-000000000002'); raise exception 'Read offers for another family''s child';
 exception when insufficient_privilege then null; end;
end $$;
-- Family 2 (Mumbai) sees the Mumbai offer instead of the Pune one.
select set_config('request.jwt.claims','{"sub":"f8000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$ declare titles text[];
begin
 select array_agg(o->>'title' order by o->>'title') into titles from jsonb_array_elements(public.partner_offers_for_child('f8000000-0000-4000-8002-000000000002')->'offers') o;
 if titles<>array['Mumbai physics circle','Online reading club','Vaccination at home'] then raise exception 'Wrong offers for family 2: %',titles; end if;
end $$;
-- Family 3 has not consented.
select set_config('request.jwt.claims','{"sub":"f8000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select pg_temp.expect_error('select public.partner_offers_for_child(''f8000000-0000-4000-8002-000000000003'')','42501');
select pg_temp.expect_error($q$select public.create_partner_lead(gen_random_uuid(),'f8000000-0000-4000-8004-000000000001','f8000000-0000-4000-8002-000000000003','Asha','phone','9876543210','',true,'partner-enquiry-2026-10-21')$q$,'42501');

-- Enquiries from family 1.
select set_config('request.jwt.claims','{"sub":"f8000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select pg_temp.expect_error($q$select public.create_partner_lead(gen_random_uuid(),'f8000000-0000-4000-8004-000000000001','f8000000-0000-4000-8002-000000000001','Asha','phone','9876543210','',false,'partner-enquiry-2026-10-21')$q$,'P0001');
select pg_temp.expect_error($q$select public.create_partner_lead(gen_random_uuid(),'f8000000-0000-4000-8004-000000000001','f8000000-0000-4000-8002-000000000001','Asha','phone','9876543210','',true,'partner-enquiry-2026-01-01')$q$,'P0001');
select pg_temp.expect_error($q$select public.create_partner_lead(gen_random_uuid(),'f8000000-0000-4000-8004-000000000001','f8000000-0000-4000-8002-000000000002','Asha','phone','9876543210','',true,'partner-enquiry-2026-10-21')$q$,'42501');
select pg_temp.expect_error($q$select public.create_partner_lead(gen_random_uuid(),'f8000000-0000-4000-8004-000000000003','f8000000-0000-4000-8002-000000000001','Asha','phone','9876543210','',true,'partner-enquiry-2026-10-21')$q$,'P0002');
select pg_temp.expect_error($q$select public.create_partner_lead(gen_random_uuid(),'f8000000-0000-4000-8004-000000000004','f8000000-0000-4000-8002-000000000001','Asha','phone','9876543210','',true,'partner-enquiry-2026-10-21')$q$,'P0002');
select pg_temp.expect_error($q$select public.create_partner_lead(gen_random_uuid(),'f8000000-0000-4000-8004-000000000001','f8000000-0000-4000-8002-000000000001','Meera''s mum','phone','9876543210','',true,'partner-enquiry-2026-10-21')$q$,'P0001');
select pg_temp.expect_error($q$select public.create_partner_lead(gen_random_uuid(),'f8000000-0000-4000-8004-000000000001','f8000000-0000-4000-8002-000000000001','Asha','phone','9876543210','MEERA finds fractions hard',true,'partner-enquiry-2026-10-21')$q$,'P0001');
select pg_temp.expect_error($q$select public.create_partner_lead(gen_random_uuid(),'f8000000-0000-4000-8004-000000000001','f8000000-0000-4000-8002-000000000001','Asha','phone','not a phone','',true,'partner-enquiry-2026-10-21')$q$,'22023');
do $$ declare r jsonb; again jsonb; receipt uuid:='f8000000-0000-4000-8005-000000000001'; keys text[];
begin
 r:=public.create_partner_lead(receipt,'f8000000-0000-4000-8004-000000000001','f8000000-0000-4000-8002-000000000001','Asha Rao','phone','+91 98765 43210','Weekday evenings suit us.',true,'partner-enquiry-2026-10-21');
 select array_agg(k order by k) into keys from jsonb_object_keys(r->'lead'->'shared') k;
 if keys<>array['child_age_band','city','contact_method','message','parent_name','phone'] then raise exception 'Shared fields: %',keys; end if;
 if r->'lead'->'shared'->>'child_age_band'<>'6–8 years' or r->'lead'->'shared'->>'city'<>'Pune' or r->'lead'->>'consent_version'<>'partner-enquiry-2026-10-21' then raise exception 'Lead content: %',r; end if;
 if r::text ~* 'meera' or r->'lead' ? 'user_id' then raise exception 'Child name or account id in lead: %',r; end if;
 if r->'lead'->>'provider_name'<>'Synthetic Tutors' then raise exception 'Provider snapshot missing'; end if;
 again:=public.create_partner_lead(receipt,'f8000000-0000-4000-8004-000000000001','f8000000-0000-4000-8002-000000000001','Asha Rao','phone','+91 98765 43210','Weekday evenings suit us.',true,'partner-enquiry-2026-10-21');
 if again<>r or (select count(*) from public.partner_leads)<>1 then raise exception 'Retry duplicated an enquiry'; end if;
 begin perform public.create_partner_lead(gen_random_uuid(),'f8000000-0000-4000-8004-000000000001','f8000000-0000-4000-8002-000000000001','Asha Rao','email','asha@example.invalid','',true,'partner-enquiry-2026-10-21'); raise exception 'Duplicate enquiry sent';
 exception when raise_exception then if sqlerrm<>'Already sent' then raise; end if; end;
 -- Views and clicks count only visible offers, and carry no family identifier.
 if public.record_partner_events(array['f8000000-0000-4000-8004-000000000001','f8000000-0000-4000-8004-000000000004']::uuid[],'click')<>1 then raise exception 'Invisible offer counted'; end if;
 if public.record_partner_events(array['f8000000-0000-4000-8004-000000000003']::uuid[],'view')<>1 then raise exception 'View not counted'; end if;
 begin perform public.record_partner_events(array['f8000000-0000-4000-8004-000000000001']::uuid[],'lead'); raise exception 'Client recorded a lead event';
 exception when invalid_parameter_value then null; end;
 if (select count(*) from public.partner_leads)<>1 then raise exception 'Own enquiry not readable'; end if;
end $$;
-- Family 2 cannot see family 1's enquiry.
select set_config('request.jwt.claims','{"sub":"f8000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$ begin if exists(select 1 from public.partner_leads) then raise exception 'Enquiries leaked across families'; end if; end $$;
reset role;

do $$ begin
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name='partner_events' and column_name in ('user_id','child_id','session_id')) then raise exception 'Events carry identifiers'; end if;
end $$;

set local role service_role;
do $$ declare staff uuid:='f8000000-0000-4000-8000-000000000004'; s uuid:='f8000000-0000-4000-8001-000000000004'; o jsonb; lead uuid:='f8000000-0000-4000-8005-000000000001'; month jsonb;
begin
 o:=public.partner_admin_overview(staff,s);
 if jsonb_array_length(o->'partners')<>3 or jsonb_array_length(o->'leads')<>1 then raise exception 'Overview counts: %',o; end if;
 if (o->'leads'->0) ? 'user_id' or (o->'leads'->0) ? 'child_id' then raise exception 'Overview exposes account ids'; end if;
 select m into month from jsonb_array_elements(o->'monthly') m where m->>'partner'='Synthetic Tutors';
 if (month->>'clicks')::int<>1 or (month->>'views')::int<>1 or (month->>'leads')::int<>1 then raise exception 'Monthly counts: %',o->'monthly'; end if;
 if not (select (x->>'visible')::boolean from jsonb_array_elements(o->'offers') x where x->>'id'='f8000000-0000-4000-8004-000000000001') then raise exception 'Visibility flag'; end if;
 begin perform public.partner_admin_overview('f8000000-0000-4000-8000-000000000005','f8000000-0000-4000-8001-000000000005'); raise exception 'Overview without MFA';
 exception when insufficient_privilege then null; end;
 if public.set_partner_lead_status(lead,staff,s,'sent')->>'status'<>'sent' then raise exception 'Lead status not saved'; end if;
 if not exists(select 1 from public.admin_audit_events where action='partner.lead.status') then raise exception 'Lead status not audited'; end if;
 -- Pausing a partner hides its offers immediately, while the offers keep their own status.
 perform public.save_partner('f8000000-0000-4000-8003-000000000001',staff,s,2,pg_temp.partner('{"status":"paused"}'));
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"f8000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$ declare titles text[]; begin
 select array_agg(o->>'title' order by o->>'title') into titles from jsonb_array_elements(public.partner_offers_for_child('f8000000-0000-4000-8002-000000000001')->'offers') o;
 if titles<>array['Vaccination at home'] then raise exception 'Paused partner still shown: %',titles; end if;
 begin perform public.create_partner_lead(gen_random_uuid(),'f8000000-0000-4000-8004-000000000002','f8000000-0000-4000-8002-000000000001','Asha','phone','9876543210','',true,'partner-enquiry-2026-10-21'); raise exception 'Enquiry to paused partner';
 exception when no_data_found then null; end;
end $$;
reset role;
-- A contract that lapses without any edit hides the offer: visibility re-checks dates on every read.
alter table public.partners disable trigger partners_guard;
update public.partners set contract_expires_on=(now() at time zone 'Asia/Kolkata')::date-1 where id='f8000000-0000-4000-8003-000000000002';
alter table public.partners enable trigger partners_guard;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"f8000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$ begin
 if jsonb_array_length(public.partner_offers_for_child('f8000000-0000-4000-8002-000000000001')->'offers')<>0 then raise exception 'Expired contract still shown'; end if;
end $$;
reset role;

-- Erasure removes the family's enquiries; anonymous fee counts remain for reconciliation.
delete from auth.users where id='f8000000-0000-4000-8000-000000000001';
do $$ begin
 if exists(select 1 from public.partner_leads) then raise exception 'Erasure left enquiries'; end if;
 if (select count(*) from public.partner_events)<>3 then raise exception 'Anonymous counts lost on erasure'; end if;
end $$;
rollback;
