-- Sponsored access: a school, employer, clinic or community partner pays for Kahiye Plus for its
-- families, without Razorpay checkout. The Kahiye team (owner/operations at AAL2) creates the
-- organisation and its codes; a parent redeems a code. A family with sponsored_access.access_until
-- in the future gets Plus limits, exactly as a paid subscriber does.
-- Privacy: organisations never log in and never receive family records. The only thing prepared for
-- them is sponsor_report(), which returns aggregate counts and suppresses any figure built from fewer
-- than five families. Parents read only their own sponsorship row.
-- 'diaspora_community' is a placeholder kind for "Kahiye Abroad" partners; no international payments.
-- Additive. reserve_guidance is patched with the guarded text replacement used by 017, 018, 025, 029.
set local lock_timeout='5s';

create table public.organisations (
 id uuid primary key,
 name text not null check(length(btrim(name)) between 2 and 120),
 kind text not null check(kind in ('school','employer','clinic','community','diaspora_community')),
 contact_name text check(length(contact_name)<=120),
 contact_email text check(contact_email is null or (length(contact_email)<=254 and contact_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')),
 contract_signed_on date,
 seats integer not null check(seats between 1 and 100000),
 starts_on date not null,
 ends_on date not null,
 status text not null default 'draft' check(status in ('draft','active','ended')),
 notes text check(length(notes)<=2000),
 revision integer not null default 1,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check(ends_on>=starts_on)
);
-- Codes: ten characters from an alphabet without 0, 1, I, L or O (31 symbols, about 49 bits).
create table public.sponsor_codes (
 code text primary key check(code ~ '^[2-9ABCDEFGHJKMNPQRSTUVWXYZ]{10}$'),
 organisation_id uuid not null references public.organisations on delete restrict,
 max_redemptions integer not null check(max_redemptions between 1 and 100000),
 redeemed_count integer not null default 0 check(redeemed_count>=0 and redeemed_count<=max_redemptions),
 expires_on date,
 active boolean not null default true,
 created_at timestamptz not null default now()
);
create index sponsor_codes_organisation on public.sponsor_codes(organisation_id);
-- One row per family per sponsor. A family holds at most one sponsorship that is still running;
-- redeem_sponsor_code enforces that under a per-family lock. Erased with the account.
create table public.sponsored_access (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users on delete cascade,
 organisation_id uuid not null references public.organisations on delete restrict,
 organisation_name text not null,
 code text not null references public.sponsor_codes on delete restrict,
 redeemed_at timestamptz not null default now(),
 access_until timestamptz not null,
 unique(user_id,organisation_id)
);
create index sponsored_access_user on public.sponsored_access(user_id,access_until desc);
create index sponsored_access_organisation on public.sponsored_access(organisation_id);
-- Failed or refused code attempts, for a per-family rate limit. Erased with the account.
create table public.sponsor_code_attempts (
 user_id uuid not null references auth.users on delete cascade,
 attempted_at timestamptz not null default now()
);
create index sponsor_code_attempts_user on public.sponsor_code_attempts(user_id,attempted_at desc);

alter table public.organisations enable row level security;
alter table public.sponsor_codes enable row level security;
alter table public.sponsored_access enable row level security;
alter table public.sponsor_code_attempts enable row level security;
revoke all on public.organisations, public.sponsor_codes, public.sponsored_access, public.sponsor_code_attempts from public,anon,authenticated;
grant all on public.organisations, public.sponsor_codes, public.sponsored_access, public.sponsor_code_attempts to service_role;
grant select on public.sponsored_access to authenticated;
create policy "sponsored access: own read" on public.sponsored_access for select to authenticated using(user_id=(select auth.uid()));

-- Access runs to the end of the organisation's last day, India time.
create function private.sponsor_access_until(last_day date) returns timestamptz
language sql immutable set search_path='' as $$ select ((last_day+1)::timestamp at time zone 'Asia/Kolkata'); $$;
revoke all on function private.sponsor_access_until(date) from public,anon;
grant execute on function private.sponsor_access_until(date) to authenticated,service_role;

create function private.redeem_sponsor_code(input text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); normalised text; c public.sponsor_codes; o public.organisations;
 mine public.sponsored_access; other public.sponsored_access; saved public.sponsored_access;
 today date:=(now() at time zone 'Asia/Kolkata')::date; refusal text;
begin
 if me is null or not exists(select 1 from public.consents where user_id=me and policy_version='2026-10-05') then raise insufficient_privilege; end if;
 -- One redemption at a time per family: the one-running-sponsorship rule and the attempt limit hold.
 perform pg_advisory_xact_lock(hashtextextended(me::text,933));
 if (select count(*) from public.sponsor_code_attempts where user_id=me and attempted_at>now()-interval '1 hour')>=10 then
  return jsonb_build_object('status','too_many_attempts');
 end if;
 normalised:=upper(regexp_replace(coalesce(left(input,64),''),'[[:space:]-]','','g'));
 if normalised ~ '^[2-9ABCDEFGHJKMNPQRSTUVWXYZ]{10}$' then
  -- The code row, then its organisation, are locked so seat and redemption counts are exact.
  select * into c from public.sponsor_codes where code=normalised for update;
 end if;
 if c.code is null then refusal:='invalid';
 else
  select * into o from public.organisations where id=c.organisation_id for update;
  select * into mine from public.sponsored_access where user_id=me and organisation_id=o.id;
  -- Re-entering a code for the sponsorship already running returns it unchanged.
  if mine.id is not null and mine.access_until>now() then
   return jsonb_build_object('status','redeemed','already',true,'organisation',mine.organisation_name,'until',mine.access_until);
  end if;
  select * into other from public.sponsored_access where user_id=me and access_until>now() limit 1;
  if other.id is not null then
   return jsonb_build_object('status','other_sponsor','organisation',other.organisation_name,'until',other.access_until);
  end if;
  if not c.active or o.status<>'active' or today<o.starts_on then refusal:='inactive';
  elsif (c.expires_on is not null and c.expires_on<today) or today>o.ends_on then refusal:='expired';
  elsif c.redeemed_count>=c.max_redemptions
   or (mine.id is null and (select count(*) from public.sponsored_access where organisation_id=o.id)>=o.seats) then refusal:='full';
  end if;
 end if;
 if refusal is not null then
  insert into public.sponsor_code_attempts(user_id) values(me);
  return jsonb_build_object('status',refusal);
 end if;
 if mine.id is not null then
  -- A family whose earlier term with this sponsor ended keeps its seat and starts the new term.
  update public.sponsored_access set code=c.code,organisation_name=o.name,redeemed_at=now(),access_until=private.sponsor_access_until(o.ends_on)
  where id=mine.id returning * into saved;
 else
  insert into public.sponsored_access(user_id,organisation_id,organisation_name,code,access_until)
  values(me,o.id,o.name,c.code,private.sponsor_access_until(o.ends_on)) returning * into saved;
 end if;
 update public.sponsor_codes set redeemed_count=redeemed_count+1 where code=c.code;
 return jsonb_build_object('status','redeemed','already',false,'organisation',saved.organisation_name,'until',saved.access_until);
end $$;
create function public.redeem_sponsor_code(input text) returns jsonb
language sql security invoker set search_path='' as $$ select private.redeem_sponsor_code(input); $$;
revoke all on function private.redeem_sponsor_code(text), public.redeem_sponsor_code(text) from public,anon;
grant execute on function private.redeem_sponsor_code(text), public.redeem_sponsor_code(text) to authenticated;

-- Team writes: service role only, with the acting owner/operations member and AAL2 session checked
-- again in the database (private.shop_staff), and an audit event for each change.
create function public.save_organisation(target uuid,actor uuid,actor_session uuid,expected integer,content jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare old public.organisations; result public.organisations;
begin
 if not private.shop_staff(actor,actor_session) then raise insufficient_privilege; end if;
 if target is null or expected is null or expected<0 or jsonb_typeof(content)<>'object' then raise exception 'Invalid organisation'; end if;
 select * into old from public.organisations where id=target for update;
 if found then
  if old.revision<>expected then raise serialization_failure; end if;
 elsif expected<>0 then raise serialization_failure;
 end if;
 insert into public.organisations(id,name,kind,contact_name,contact_email,contract_signed_on,seats,starts_on,ends_on,status,notes)
 values(target,btrim(content->>'name'),content->>'kind',nullif(btrim(content->>'contact_name'),''),nullif(lower(btrim(content->>'contact_email')),''),
  (content->>'contract_signed_on')::date,(content->>'seats')::integer,(content->>'starts_on')::date,(content->>'ends_on')::date,
  coalesce(content->>'status','draft'),nullif(btrim(content->>'notes'),''))
 on conflict(id) do update set name=excluded.name,kind=excluded.kind,contact_name=excluded.contact_name,contact_email=excluded.contact_email,
  contract_signed_on=excluded.contract_signed_on,seats=excluded.seats,starts_on=excluded.starts_on,ends_on=excluded.ends_on,
  status=excluded.status,notes=excluded.notes,revision=organisations.revision+1,updated_at=now()
 returning * into result;
 -- Families follow the contract: a renewed term extends access, an ended or paused one stops it now.
 update public.sponsored_access set organisation_name=result.name,
  access_until=case when result.status='active' then private.sponsor_access_until(result.ends_on) else least(access_until,now()) end
 where organisation_id=result.id;
 insert into public.admin_audit_events(actor_id,action,details)
 values(actor,'sponsor.organisation.saved',jsonb_build_object('id',result.id,'revision',result.revision,'status',result.status,'seats',result.seats,'ends_on',result.ends_on));
 return to_jsonb(result);
end $$;

create function public.create_sponsor_code(actor uuid,actor_session uuid,organisation uuid,new_code text,maximum integer,expires date) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare o public.organisations; result public.sponsor_codes;
begin
 if not private.shop_staff(actor,actor_session) then raise insufficient_privilege; end if;
 select * into o from public.organisations where id=organisation for update;
 if not found then raise no_data_found; end if;
 if o.status='ended' then raise exception 'Organisation ended'; end if;
 insert into public.sponsor_codes(code,organisation_id,max_redemptions,expires_on) values(new_code,o.id,maximum,expires) returning * into result;
 insert into public.admin_audit_events(actor_id,action,details)
 values(actor,'sponsor.code.created',jsonb_build_object('organisation',o.id,'code_ending',right(result.code,3),'max_redemptions',maximum,'expires_on',expires));
 return to_jsonb(result);
end $$;

create function public.set_sponsor_code_active(actor uuid,actor_session uuid,target text,enabled boolean) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare result public.sponsor_codes;
begin
 if not private.shop_staff(actor,actor_session) then raise insufficient_privilege; end if;
 -- Switching a code off stops new redemptions; families who already redeemed keep their term.
 update public.sponsor_codes set active=enabled where code=target returning * into result;
 if not found then raise no_data_found; end if;
 insert into public.admin_audit_events(actor_id,action,details)
 values(actor,'sponsor.code.'||case when enabled then 'enabled' else 'disabled' end,jsonb_build_object('organisation',result.organisation_id,'code_ending',right(result.code,3)));
 return to_jsonb(result);
end $$;

-- Team view: contracts, codes and seat usage. Seat usage is an exact count because seats are what
-- the sponsor pays for; it carries no family identifier, child, date or activity.
create function public.sponsor_admin_overview() returns jsonb
language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object(
  'organisation',to_jsonb(o),
  'seats_used',(select count(*) from public.sponsored_access s where s.organisation_id=o.id),
  'codes',(select coalesce(jsonb_agg(jsonb_build_object('code',c.code,'max_redemptions',c.max_redemptions,'redeemed_count',c.redeemed_count,'expires_on',c.expires_on,'active',c.active,'created_at',c.created_at) order by c.created_at),'[]'::jsonb)
   from public.sponsor_codes c where c.organisation_id=o.id)
 ) order by o.created_at desc),'[]'::jsonb) from public.organisations o;
$$;

-- What a sponsor may see: aggregate use by its families with current consent, while sponsored.
-- Every family-derived figure is "<5" when fewer than five families stand behind it. Safety-related
-- Ask turns are never counted. No family, child, name, date or identifier is returned.
create function public.sponsor_report(organisation uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
with o as (select * from public.organisations where id=organisation),
fam as (
 select s.user_id, s.redeemed_at from public.sponsored_access s
 join public.consents c on c.user_id=s.user_id and c.policy_version='2026-10-05'
 where s.organisation_id=organisation
),
asks as (
 select d.user_id from public.decodes d join fam f on f.user_id=d.user_id
 where d.created_at>=greatest(f.redeemed_at,now()-interval '30 days') and d.safety_category='none' and d.refines is null
  and not coalesce(d.continuation_of is not null and d.analysis ? 'conversation',false)
),
checkins as (
 select k.user_id from public.family_checkins k join fam f on f.user_id=k.user_id where k.created_at>=greatest(f.redeemed_at,now()-interval '30 days')
),
handbook as (
 select s.user_id, (select count(*) from jsonb_object_keys(case when jsonb_typeof(s.value->'handbook')='object' then s.value->'handbook' else '{}'::jsonb end)) cards
 from public.child_care_state s join fam f on f.user_id=s.user_id
),
totals as (
 select (select count(*) from fam) families,
  (select count(distinct user_id) from (select user_id from asks union all select user_id from checkins) a) active_families,
  (select count(*) from asks) ask_turns, (select count(distinct user_id) from asks) ask_families,
  (select count(distinct user_id) from checkins) checkin_families,
  (select coalesce(sum(cards),0)::bigint from handbook) cards, (select count(distinct user_id) from handbook where cards>0) card_families
)
select jsonb_build_object(
 'organisation',o.name,'kind',o.kind,'status',o.status,'seats',o.seats,'starts_on',o.starts_on,'ends_on',o.ends_on,
 'generated_at',now(),'minimum_families',5,
 'families_joined',private.outcome_count(t.families,t.families),
 'families_active_30_days',private.outcome_count(t.active_families,t.active_families),
 'ask_turns_30_days',private.outcome_count(t.ask_turns,t.ask_families),
 'families_checked_in_30_days',private.outcome_count(t.checkin_families,t.checkin_families),
 'handbook_cards_saved',private.outcome_count(t.cards,t.card_families)
) from o cross join totals t;
$$;
revoke all on function public.save_organisation(uuid,uuid,uuid,integer,jsonb), public.create_sponsor_code(uuid,uuid,uuid,text,integer,date),
 public.set_sponsor_code_active(uuid,uuid,text,boolean), public.sponsor_admin_overview(), public.sponsor_report(uuid) from public,anon,authenticated;
grant execute on function public.save_organisation(uuid,uuid,uuid,integer,jsonb), public.create_sponsor_code(uuid,uuid,uuid,text,integer,date),
 public.set_sponsor_code_active(uuid,uuid,text,boolean), public.sponsor_admin_overview(), public.sponsor_report(uuid) to service_role;

-- Plus in the database allowance = paid OR sponsored. Guarded: abort if the live definition differs.
do $$ declare definition text;
 plus_old text:='select exists(select 1 from public.subscriptions where user_id=p_user and (status in (''active'',''pending'',''halted'',''paused'',''cancelled'',''completed'') and paid_through>now())) into plus;';
begin
 select pg_get_functiondef('public.reserve_guidance(uuid,uuid,uuid,text,text,uuid,boolean)'::regprocedure) into definition;
 if position(plus_old in definition)=0 or position('sponsored_access' in definition)>0 then raise exception 'Unexpected guidance entitlement definition'; end if;
 execute replace(definition,plus_old,'select exists(select 1 from public.subscriptions where user_id=p_user and (status in (''active'',''pending'',''halted'',''paused'',''cancelled'',''completed'') and paid_through>now())) or exists(select 1 from public.sponsored_access where user_id=p_user and access_until>now()) into plus;');
end $$;
