-- Partner services. Kahiye is a facilitator: partners deliver services under their own contracts
-- and terms, parents pay partners directly, and Kahiye earns a listing fee, booking fee or
-- commission. Additive only; no existing table or function is altered except one optional,
-- parent-edited column on children.
--
-- Rules enforced here rather than trusted to the application:
--  * An offer is shown only when it is active, reviewed, and its partner is active with a signed,
--    unexpired contract, terms and grievance contacts, and (for categories with in-home or
--    one-to-one contact with children) police verification and professional insurance confirmed.
--  * Health partners can never be on a per-patient referral commission.
--  * Nothing about a family reaches a partner without a per-enquiry consent. The shared fields are
--    built here from a fixed list; a child's name, health diary and notes are never included.
--  * Partner tables are service-role only. Parents read through ownership-checked functions.
--  * Partner events carry no user or child identifier: they exist for fee reconciliation only.
set local lock_timeout='5s';

-- Optional, parent-chosen city. Used only to match local services; never loaded into AI context.
alter table public.children add column city text
  constraint children_city_check check (city is null or (char_length(btrim(city)) between 2 and 60 and city !~ '[<>{}\\/@]'));
comment on column public.children.city is 'Optional parent-chosen city for matching local partner services. Not used for guidance or AI context; shared with a partner only in an enquiry the parent confirms.';

create function private.partner_needs_vetting(category text) returns boolean
language sql immutable set search_path='' as $$
 -- In-home or one-to-one contact with children. Hospitals and venues are institutions where a parent is present.
 select category in ('health_lab','paediatrician','dietitian','tuition','skills','therapy','other');
$$;
create function private.partner_is_health(category text) returns boolean
language sql immutable set search_path='' as $$
 select category in ('health_lab','hospital','paediatrician','dietitian','therapy');
$$;
revoke all on function private.partner_needs_vetting(text),private.partner_is_health(text) from public,anon,authenticated;
grant execute on function private.partner_needs_vetting(text),private.partner_is_health(text) to service_role;

create table public.partners (
 id uuid primary key,
 name text not null check (char_length(btrim(name)) between 2 and 120),
 legal_name text not null check (char_length(btrim(legal_name)) between 2 and 200),
 category text not null check (category in ('health_lab','hospital','paediatrician','dietitian','tuition','skills','venue','therapy','other')),
 website text check (website is null or (website ~ '^https://[^\s<>"]+$' and char_length(website) <= 300)),
 terms_url text check (terms_url is null or (terms_url ~ '^https://[^\s<>"]+$' and char_length(terms_url) <= 300)),
 contact_email text check (contact_email is null or contact_email ~ '^[^\s@<>]{1,64}@[^\s@<>]{1,190}\.[A-Za-z]{2,}$'),
 grievance_contact text check (grievance_contact is null or char_length(btrim(grievance_contact)) between 5 and 200),
 contract_signed_on date,
 contract_expires_on date,
 payment_model text not null default 'direct_to_partner' check (payment_model = 'direct_to_partner'),
 fee_model text not null check (fee_model in ('commission','booking_fee','listing_fee')),
 fee_note text not null default '' check (char_length(fee_note) <= 500),
 police_verification_confirmed boolean not null default false,
 insurance_confirmed boolean not null default false,
 status text not null default 'draft' check (status in ('draft','active','paused')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 revision integer not null default 1,
 constraint partners_contract_dates check (contract_expires_on is null or contract_signed_on is null or contract_expires_on >= contract_signed_on),
 -- Medical ethics: no per-patient referral commission for health partners, whatever their status.
 constraint partners_health_fee check (not private.partner_is_health(category) or fee_model in ('booking_fee','listing_fee')),
 constraint partners_active_gates check (status <> 'active' or (
   contract_signed_on is not null and terms_url is not null and contact_email is not null and grievance_contact is not null
   and (not private.partner_needs_vetting(category) or (police_verification_confirmed and insurance_confirmed))
 ))
);

create table public.partner_offers (
 id uuid primary key,
 partner_id uuid not null references public.partners,
 title text not null check (char_length(btrim(title)) between 3 and 120),
 summary text not null check (char_length(btrim(summary)) between 10 and 600),
 category text not null check (category in ('health_lab','hospital','paediatrician','dietitian','tuition','skills','venue','therapy','other')),
 min_months integer not null check (min_months between 0 and 215),
 max_months integer not null check (max_months between 1 and 216),
 cities text[] not null check (cardinality(cities) between 1 and 30),
 moment text not null default 'always' check (moment in ('always','vaccination_due','checkup_due','exam_season','interest','handbook_track','programme')),
 trigger_value text check (trigger_value is null or char_length(trigger_value) between 1 and 60),
 price_label text not null default '' check (char_length(price_label) <= 80),
 cta text not null check (cta in ('link','enquiry')),
 url text check (url is null or (url ~ '^https://[^\s<>"]+$' and char_length(url) <= 500)),
 status text not null default 'draft' check (status in ('draft','active','paused')),
 -- Reviewer is kept as an identifier, not a foreign key, so removing a team account never blocks or rewrites history.
 reviewed_by uuid,
 reviewed_on date,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 revision integer not null default 1,
 constraint partner_offers_ages check (min_months < max_months),
 constraint partner_offers_link check (cta <> 'link' or url is not null),
 constraint partner_offers_cities check (array_position(cities, null) is null),
 constraint partner_offers_trigger check (case moment
   when 'interest' then trigger_value in ('art','movement','music','patterns','making','words','nature','other')
   when 'handbook_track' then trigger_value in ('body','money','feelings','school','safety','digital','friends','family','health','independence')
   when 'exam_season' then trigger_value is null or trigger_value ~ '^(1[0-2]|[1-9])(,(1[0-2]|[1-9])){0,5}$'
   when 'programme' then trigger_value is not null
   else trigger_value is null end),
 constraint partner_offers_reviewed check (status <> 'active' or (reviewed_by is not null and reviewed_on is not null))
);
create index partner_offers_partner on public.partner_offers(partner_id);

create table public.partner_leads (
 id uuid primary key,
 user_id uuid not null references auth.users on delete cascade,
 child_id uuid not null references public.children on delete cascade,
 offer_id uuid not null references public.partner_offers,
 -- Snapshots so the parent can always see who received their details, even if the offer changes.
 provider_name text not null,
 offer_title text not null,
 shared jsonb not null check (jsonb_typeof(shared) = 'object'
   and (shared - array['parent_name','contact_method','phone','email','child_age_band','city','message']) = '{}'::jsonb
   and shared ? 'parent_name' and shared ? 'contact_method' and shared ? 'child_age_band'
   and octet_length(shared::text) < 2000),
 consent_version text not null,
 status text not null default 'new' check (status in ('new','sent','closed')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index partner_leads_owner on public.partner_leads(user_id, created_at desc);
create index partner_leads_offer on public.partner_leads(offer_id, created_at desc);

-- Fee reconciliation counts. No user, child, session or device identifier is stored.
create table public.partner_events (
 id bigint generated always as identity primary key,
 offer_id uuid not null references public.partner_offers,
 kind text not null check (kind in ('view','click','lead')),
 created_at timestamptz not null default now()
);
create index partner_events_offer on public.partner_events(offer_id, created_at);

alter table public.partners enable row level security;
alter table public.partner_offers enable row level security;
alter table public.partner_leads enable row level security;
alter table public.partner_events enable row level security;
revoke all on public.partners, public.partner_offers, public.partner_leads, public.partner_events from public, anon, authenticated;
grant all on public.partners, public.partner_offers, public.partner_leads, public.partner_events to service_role;
grant select on public.partner_leads to authenticated;
create policy "partner leads: own read" on public.partner_leads for select to authenticated using (user_id = (select auth.uid()));
-- Partners, offers and events have no policies: invisible to parents except through the functions below.

create function private.partner_ready(p public.partners) returns boolean
language sql stable set search_path='' as $$
 select p.status = 'active'
  and p.contract_signed_on is not null and p.contract_signed_on <= (now() at time zone 'Asia/Kolkata')::date
  and (p.contract_expires_on is null or p.contract_expires_on >= (now() at time zone 'Asia/Kolkata')::date)
  and p.terms_url is not null and p.contact_email is not null and p.grievance_contact is not null
  and (not private.partner_needs_vetting(p.category) or (p.police_verification_confirmed and p.insurance_confirmed))
  and (not private.partner_is_health(p.category) or p.fee_model in ('booking_fee','listing_fee'));
$$;
revoke all on function private.partner_ready(public.partners) from public,anon,authenticated;
grant execute on function private.partner_ready(public.partners) to service_role;

-- Gates hold for every writer, including the service role and direct SQL.
create function private.partner_guard() returns trigger language plpgsql set search_path='' as $$
begin
 if new.status = 'active' then
  if new.contract_signed_on > (now() at time zone 'Asia/Kolkata')::date then raise exception 'Partner contract is not yet in force' using errcode = 'check_violation'; end if;
  if new.contract_expires_on < (now() at time zone 'Asia/Kolkata')::date then raise exception 'Partner contract has expired' using errcode = 'check_violation'; end if;
 end if;
 new.updated_at := now();
 return new;
end $$;
create trigger partners_guard before insert or update on public.partners for each row execute function private.partner_guard();

create function private.partner_offer_guard() returns trigger language plpgsql set search_path='' as $$
declare p public.partners;
begin
 select * into p from public.partners where id = new.partner_id;
 if not found then raise exception 'Unknown partner' using errcode = 'foreign_key_violation'; end if;
 if new.category <> p.category then raise exception 'Offer category must match the partner category' using errcode = 'check_violation'; end if;
 -- Cities are stored trimmed and lower-case; "online" means available anywhere.
 new.cities := array(select distinct lower(btrim(c)) from unnest(new.cities) c where c is not null and btrim(c) <> '');
 if exists(select 1 from unnest(new.cities) c where char_length(c) not between 2 and 60 or c ~ '[<>{}]') then raise exception 'Check the cities' using errcode = 'check_violation'; end if;
 if new.status = 'active' and not private.partner_ready(p) then raise exception 'Partner gates are not satisfied' using errcode = 'check_violation'; end if;
 new.updated_at := now();
 return new;
end $$;
create trigger partner_offers_guard before insert or update on public.partner_offers for each row execute function private.partner_offer_guard();

-- What a parent may see: active, reviewed offers from a ready partner.
create function private.partner_offer_visible(o public.partner_offers) returns boolean
language sql stable set search_path='' as $$
 select o.status = 'active' and o.reviewed_by is not null and exists(select 1 from public.partners p where p.id = o.partner_id and private.partner_ready(p));
$$;
revoke all on function private.partner_offer_visible(public.partner_offers) from public,anon,authenticated;
grant execute on function private.partner_offer_visible(public.partner_offers) to service_role;

create function private.partner_age_band(dob date) returns text language sql stable set search_path='' as $$
 select case when m < 12 then 'Under 1 year' when m < 36 then '1–2 years' when m < 72 then '3–5 years'
  when m < 108 then '6–8 years' when m < 156 then '9–12 years' when m < 192 then '13–15 years' else '16–18 years' end
 from (select (extract(year from age((now() at time zone 'Asia/Kolkata')::date, dob)) * 12 + extract(month from age((now() at time zone 'Asia/Kolkata')::date, dob)))::int as m) a;
$$;
revoke all on function private.partner_age_band(date) from public,anon,authenticated;

-- Offers matched to one of the parent's own children by age and city. Ordered editorially, never by fee.
create function private.partner_offers_for_child(target uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare c public.children; months integer; place text; result jsonb;
begin
 if auth.uid() is null or not exists(select 1 from public.consents where user_id = auth.uid() and policy_version = '2026-10-05') then raise insufficient_privilege; end if;
 select * into c from public.children where id = target and user_id = auth.uid();
 if not found then raise insufficient_privilege; end if;
 if c.dob is null or c.dob > (now() at time zone 'Asia/Kolkata')::date then
  return jsonb_build_object('age_band', null, 'city', c.city, 'offers', '[]'::jsonb);
 end if;
 months := (extract(year from age((now() at time zone 'Asia/Kolkata')::date, c.dob)) * 12 + extract(month from age((now() at time zone 'Asia/Kolkata')::date, c.dob)))::int;
 place := lower(btrim(coalesce(c.city, '')));
 select coalesce(jsonb_agg(jsonb_build_object(
   'id', o.id, 'title', o.title, 'summary', o.summary, 'category', o.category,
   'moment', o.moment, 'trigger_value', o.trigger_value, 'price_label', o.price_label,
   'cta', o.cta, 'url', o.url, 'online', 'online' = any(o.cities),
   'provider', p.name, 'terms_url', p.terms_url, 'grievance_contact', p.grievance_contact, 'fee_model', p.fee_model
  ) order by o.created_at, o.id), '[]'::jsonb) into result
 from public.partner_offers o join public.partners p on p.id = o.partner_id
 where private.partner_offer_visible(o) and months >= o.min_months and months < o.max_months
  and ('online' = any(o.cities) or (place <> '' and place = any(o.cities)));
 return jsonb_build_object('age_band', private.partner_age_band(c.dob), 'city', c.city, 'offers', result);
end $$;
create function public.partner_offers_for_child(target uuid) returns jsonb
language sql stable security invoker set search_path='' as $$ select private.partner_offers_for_child(target); $$;

-- One enquiry. Requires the privacy consent, the current partner-enquiry consent text, child ownership
-- and a visible offer that takes enquiries. The shared fields are assembled here, never from the client.
create function private.create_partner_lead(receipt uuid, offer uuid, target uuid, parent_name text, contact_method text, contact text, note text, agreed boolean, agreed_version text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.children; o public.partner_offers; p public.partners; result public.partner_leads; shared jsonb; who text := btrim(coalesce(parent_name, '')); msg text := btrim(coalesce(note, '')); reach text := btrim(coalesce(contact, '')); pattern text;
begin
 if auth.uid() is null or not exists(select 1 from public.consents where user_id = auth.uid() and policy_version = '2026-10-05') then raise insufficient_privilege; end if;
 if agreed is not true or agreed_version is distinct from 'partner-enquiry-2026-10-21' then raise exception 'Consent required' using errcode = 'P0001'; end if;
 select * into c from public.children where id = target and user_id = auth.uid() for share;
 if not found then raise insufficient_privilege; end if;
 select * into result from public.partner_leads where id = receipt;
 if found then
  if result.user_id <> auth.uid() or result.child_id <> target or result.offer_id <> offer then raise insufficient_privilege; end if;
  return jsonb_build_object('status', 'saved', 'lead', to_jsonb(result) - 'user_id');
 end if;
 select * into o from public.partner_offers where id = offer;
 if not found or not private.partner_offer_visible(o) or o.cta <> 'enquiry' then raise exception 'Offer unavailable' using errcode = 'P0002'; end if;
 select * into p from public.partners where id = o.partner_id;
 if c.dob is null or c.dob > (now() at time zone 'Asia/Kolkata')::date then raise exception 'Offer unavailable' using errcode = 'P0002'; end if;
 if char_length(who) not between 2 and 80 or char_length(msg) > 500 then raise exception 'Check the fields' using errcode = '22023'; end if;
 if contact_method = 'phone' then
  if reach !~ '^\+?[0-9][0-9 -]{7,17}$' then raise exception 'Check the fields' using errcode = '22023'; end if;
 elsif contact_method = 'email' then
  if reach !~ '^[^\s@<>]{1,64}@[^\s@<>]{1,190}\.[A-Za-z]{2,}$' then raise exception 'Check the fields' using errcode = '22023'; end if;
 else raise exception 'Check the fields' using errcode = '22023'; end if;
 -- The child's name never travels to a partner, even inside the parent's own fields.
 pattern := '\m' || regexp_replace(btrim(c.name), '([.^$*+?()\[\]{}|\\-])', '\\\1', 'g') || '\M';
 if char_length(btrim(c.name)) >= 2 and (who ~* pattern or msg ~* pattern) then raise exception 'Child name not shared' using errcode = 'P0001'; end if;
 if exists(select 1 from public.partner_leads where user_id = auth.uid() and child_id = target and offer_id = offer and created_at > now() - interval '1 day') then
  raise exception 'Already sent' using errcode = 'P0001';
 end if;
 if (select count(*) from public.partner_leads where user_id = auth.uid() and created_at > now() - interval '1 day') >= 10 then raise exception 'Enquiry limit' using errcode = 'P0001'; end if;
 shared := jsonb_build_object('parent_name', who, 'contact_method', contact_method, contact_method, reach, 'child_age_band', private.partner_age_band(c.dob))
  || case when c.city is not null then jsonb_build_object('city', c.city) else '{}'::jsonb end
  || case when msg <> '' then jsonb_build_object('message', msg) else '{}'::jsonb end;
 insert into public.partner_leads(id, user_id, child_id, offer_id, provider_name, offer_title, shared, consent_version)
  values (receipt, auth.uid(), target, offer, p.name, o.title, shared, agreed_version) returning * into result;
 insert into public.partner_events(offer_id, kind) values (offer, 'lead');
 return jsonb_build_object('status', 'saved', 'lead', to_jsonb(result) - 'user_id');
end $$;
create function public.create_partner_lead(receipt uuid, offer uuid, target uuid, parent_name text, contact_method text, contact text, note text, agreed boolean, agreed_version text) returns jsonb
language sql security invoker set search_path='' as $$ select private.create_partner_lead(receipt, offer, target, parent_name, contact_method, contact, note, agreed, agreed_version); $$;

-- Views and clicks for fee reconciliation. Invisible offers are ignored; nothing identifies the parent.
create function private.record_partner_events(offers uuid[], event_kind text) returns integer
language plpgsql security definer set search_path='' as $$
declare added integer;
begin
 if auth.uid() is null or not exists(select 1 from public.consents where user_id = auth.uid() and policy_version = '2026-10-05') then raise insufficient_privilege; end if;
 if event_kind not in ('view','click') or offers is null or cardinality(offers) > 10 then raise exception 'Check the fields' using errcode = '22023'; end if;
 insert into public.partner_events(offer_id, kind)
  select o.id, event_kind from public.partner_offers o where o.id = any(offers) and private.partner_offer_visible(o);
 get diagnostics added = row_count;
 return added;
end $$;
create function public.record_partner_events(offers uuid[], event_kind text) returns integer
language sql security invoker set search_path='' as $$ select private.record_partner_events(offers, event_kind); $$;

revoke all on function private.partner_age_band(date), private.partner_offers_for_child(uuid), public.partner_offers_for_child(uuid),
 private.create_partner_lead(uuid,uuid,uuid,text,text,text,text,boolean,text), public.create_partner_lead(uuid,uuid,uuid,text,text,text,text,boolean,text),
 private.record_partner_events(uuid[],text), public.record_partner_events(uuid[],text) from public, anon;
grant execute on function private.partner_offers_for_child(uuid), public.partner_offers_for_child(uuid),
 private.create_partner_lead(uuid,uuid,uuid,text,text,text,text,boolean,text), public.create_partner_lead(uuid,uuid,uuid,text,text,text,text,boolean,text),
 private.record_partner_events(uuid[],text), public.record_partner_events(uuid[],text) to authenticated;

-- Team writes: owner/operations with an AAL2 session (private.shop_staff from 021), revisioned and audited.
create function public.save_partner(target uuid, actor uuid, actor_session uuid, expected integer, content jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare old public.partners; result public.partners;
begin
 if not private.shop_staff(actor, actor_session) then raise insufficient_privilege; end if;
 perform pg_advisory_xact_lock(72910432);
 if target is null or expected is null or expected < 0 or jsonb_typeof(content) <> 'object' then raise exception 'Invalid revision'; end if;
 select * into old from public.partners where id = target for update;
 if found then
  if old.revision <> expected then raise serialization_failure; end if;
 else
  if expected <> 0 then raise serialization_failure; end if;
  if (select count(*) from public.partners) >= 500 then raise exception 'Partner limit'; end if;
 end if;
 insert into public.partners(id, name, legal_name, category, website, terms_url, contact_email, grievance_contact, contract_signed_on, contract_expires_on,
  fee_model, fee_note, police_verification_confirmed, insurance_confirmed, status)
 values (target, content->>'name', content->>'legal_name', content->>'category', nullif(content->>'website', ''), nullif(content->>'terms_url', ''),
  nullif(content->>'contact_email', ''), nullif(content->>'grievance_contact', ''), nullif(content->>'contract_signed_on', '')::date, nullif(content->>'contract_expires_on', '')::date,
  content->>'fee_model', coalesce(content->>'fee_note', ''), coalesce((content->>'police_verification_confirmed')::boolean, false),
  coalesce((content->>'insurance_confirmed')::boolean, false), coalesce(content->>'status', 'draft'))
 on conflict (id) do update set name = excluded.name, legal_name = excluded.legal_name, category = excluded.category, website = excluded.website,
  terms_url = excluded.terms_url, contact_email = excluded.contact_email, grievance_contact = excluded.grievance_contact,
  contract_signed_on = excluded.contract_signed_on, contract_expires_on = excluded.contract_expires_on, fee_model = excluded.fee_model,
  fee_note = excluded.fee_note, police_verification_confirmed = excluded.police_verification_confirmed, insurance_confirmed = excluded.insurance_confirmed,
  status = excluded.status, revision = partners.revision + 1
 returning * into result;
 -- A category change is refused while offers exist, so an offer cannot inherit weaker gates.
 if exists(select 1 from public.partner_offers where partner_id = target and category <> result.category) then raise exception 'Offer category must match the partner category' using errcode = 'check_violation'; end if;
 insert into public.admin_audit_events(actor_id, action, details) values (actor, 'partner.saved', jsonb_build_object('id', target, 'revision', result.revision, 'status', result.status));
 return to_jsonb(result);
end $$;

create function public.save_partner_offer(target uuid, actor uuid, actor_session uuid, expected integer, content jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare old public.partner_offers; result public.partner_offers; state text := coalesce(content->>'status', 'draft');
begin
 if not private.shop_staff(actor, actor_session) then raise insufficient_privilege; end if;
 perform pg_advisory_xact_lock(72910432);
 if target is null or expected is null or expected < 0 or jsonb_typeof(content) <> 'object' or jsonb_typeof(content->'cities') <> 'array' then raise exception 'Invalid revision'; end if;
 select * into old from public.partner_offers where id = target for update;
 if found then
  if old.revision <> expected then raise serialization_failure; end if;
 else
  if expected <> 0 then raise serialization_failure; end if;
  if (select count(*) from public.partner_offers) >= 2000 then raise exception 'Offer limit'; end if;
 end if;
 insert into public.partner_offers(id, partner_id, title, summary, category, min_months, max_months, cities, moment, trigger_value, price_label, cta, url, status, reviewed_by, reviewed_on)
 values (target, (content->>'partner_id')::uuid, content->>'title', content->>'summary', content->>'category', (content->>'min_months')::int, (content->>'max_months')::int,
  array(select lower(btrim(v)) from jsonb_array_elements_text(content->'cities') v), coalesce(content->>'moment', 'always'), nullif(content->>'trigger_value', ''),
  coalesce(content->>'price_label', ''), content->>'cta', nullif(content->>'url', ''), state,
  -- Activation is the review: the activating team member and date are recorded.
  case when state = 'active' then actor else old.reviewed_by end,
  case when state = 'active' then (now() at time zone 'Asia/Kolkata')::date else old.reviewed_on end)
 on conflict (id) do update set partner_id = excluded.partner_id, title = excluded.title, summary = excluded.summary, category = excluded.category,
  min_months = excluded.min_months, max_months = excluded.max_months, cities = excluded.cities, moment = excluded.moment, trigger_value = excluded.trigger_value,
  price_label = excluded.price_label, cta = excluded.cta, url = excluded.url, status = excluded.status, reviewed_by = excluded.reviewed_by,
  reviewed_on = excluded.reviewed_on, revision = partner_offers.revision + 1
 returning * into result;
 insert into public.admin_audit_events(actor_id, action, details) values (actor, 'partner.offer.saved', jsonb_build_object('id', target, 'revision', result.revision, 'status', result.status));
 return to_jsonb(result);
end $$;

create function public.set_partner_lead_status(lead uuid, actor uuid, actor_session uuid, next_status text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare result public.partner_leads;
begin
 if not private.shop_staff(actor, actor_session) then raise insufficient_privilege; end if;
 if next_status not in ('new','sent','closed') then raise exception 'Check the fields' using errcode = '22023'; end if;
 update public.partner_leads set status = next_status, updated_at = now() where id = lead returning * into result;
 if not found then raise exception 'Lead not found' using errcode = 'P0002'; end if;
 insert into public.admin_audit_events(actor_id, action, details) values (actor, 'partner.lead.status', jsonb_build_object('id', lead, 'status', next_status));
 return to_jsonb(result) - 'user_id' - 'child_id';
end $$;

-- Team overview: partners, offers with their visibility, recent enquiries (shared fields only, no
-- account or child identifiers) and per-partner monthly counts in India time for invoicing fees.
create function public.partner_admin_overview(actor uuid, actor_session uuid) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
begin
 if not private.shop_staff(actor, actor_session) then raise insufficient_privilege; end if;
 return jsonb_build_object(
  'partners', coalesce((select jsonb_agg(to_jsonb(p) || jsonb_build_object('ready', private.partner_ready(p)) order by p.name, p.id) from public.partners p), '[]'::jsonb),
  'offers', coalesce((select jsonb_agg(to_jsonb(o) || jsonb_build_object('visible', private.partner_offer_visible(o)) order by o.created_at, o.id) from public.partner_offers o), '[]'::jsonb),
  'leads', coalesce((select jsonb_agg(jsonb_build_object('id', l.id, 'offer_id', l.offer_id, 'provider_name', l.provider_name, 'offer_title', l.offer_title,
     'shared', l.shared, 'consent_version', l.consent_version, 'status', l.status, 'created_at', l.created_at, 'updated_at', l.updated_at) order by l.created_at desc)
    from (select * from public.partner_leads order by created_at desc limit 200) l), '[]'::jsonb),
  'monthly', coalesce((select jsonb_agg(jsonb_build_object('month', m.month, 'partner_id', m.partner_id, 'partner', m.partner, 'fee_model', m.fee_model,
     'views', m.views, 'clicks', m.clicks, 'leads', m.leads) order by m.month desc, m.partner) from (
    select to_char(date_trunc('month', e.created_at at time zone 'Asia/Kolkata'), 'YYYY-MM') as month, p.id as partner_id, p.name as partner, p.fee_model,
     count(*) filter (where e.kind = 'view') as views, count(*) filter (where e.kind = 'click') as clicks, count(*) filter (where e.kind = 'lead') as leads
    from public.partner_events e join public.partner_offers o on o.id = e.offer_id join public.partners p on p.id = o.partner_id
    where e.created_at >= (date_trunc('month', now() at time zone 'Asia/Kolkata') - interval '12 months') at time zone 'Asia/Kolkata'
    group by 1, p.id, p.name, p.fee_model) m), '[]'::jsonb)
 );
end $$;

revoke all on function public.save_partner(uuid,uuid,uuid,integer,jsonb), public.save_partner_offer(uuid,uuid,uuid,integer,jsonb),
 public.set_partner_lead_status(uuid,uuid,uuid,text), public.partner_admin_overview(uuid,uuid) from public, anon, authenticated;
grant execute on function public.save_partner(uuid,uuid,uuid,integer,jsonb), public.save_partner_offer(uuid,uuid,uuid,integer,jsonb),
 public.set_partner_lead_status(uuid,uuid,uuid,text), public.partner_admin_overview(uuid,uuid) to service_role;
revoke all on function private.partner_guard(), private.partner_offer_guard() from public, anon, authenticated;
