-- Durable provider transport. No existing family rows are rewritten.
set local lock_timeout='5s';
create table public.whatsapp_jobs (
 id text primary key check(id ~ '^SM[0-9a-fA-F]{32}$'),
 user_id uuid references auth.users on delete cascade,
 phone text not null check(phone ~ '^\+[1-9][0-9]{7,14}$'),
 body text not null default '' check(length(body)<=2000), has_media boolean not null default false,
 response text check(length(response)<=1600),
 state text not null default 'pending' check(state in ('pending','processing','ready','sending','accepted','needs_review','cancelled')),
 attempts integer not null default 0, lease uuid, lease_until timestamptz,
 provider_id text unique, delivery_status text, delivery_rank integer not null default 0,
 last_error text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 next_attempt_at timestamptz not null default now(), requires_link boolean not null default true
);
alter table public.whatsapp_jobs enable row level security;
revoke all on public.whatsapp_jobs from public,anon,authenticated;
grant all on public.whatsapp_jobs to service_role;
create index whatsapp_jobs_due on public.whatsapp_jobs(state,next_attempt_at,created_at);
create index whatsapp_jobs_user on public.whatsapp_jobs(user_id);
create index whatsapp_jobs_phone on public.whatsapp_jobs(phone,created_at);

-- Atomic receipt + account-link/STOP commands. Invalid tokens do not reveal account data.
create function public.receive_whatsapp(p_id text,p_phone text,p_body text,p_media boolean) returns text
language plpgsql security invoker set search_path='' as $$
declare j public.whatsapp_jobs; u uuid; token_user uuid; command text:=upper(trim(p_body)); response_text text; linked boolean:=true;
begin
 perform pg_advisory_xact_lock(hashtextextended('wa:'||p_phone,0));
 if exists(select 1 from public.whatsapp_jobs where id=p_id) then return 'duplicate'; end if;
 select user_id into u from public.whatsapp_links where phone=p_phone;
 if command in ('STOP','UNLINK') then
  update public.whatsapp_jobs set state='cancelled',body='',response=null,updated_at=now() where phone=p_phone and state in ('pending','processing','ready');
  delete from public.whatsapp_links where phone=p_phone;
  if u is not null then delete from public.whatsapp_link_codes where user_id=u; end if;
  response_text:='Disconnected. You can reconnect from your Kahiye family space.'; linked:=false;
 elsif command ~ '^LINK [0-9A-F]{32}$' then
  if (select count(*) from public.whatsapp_jobs where phone=p_phone and created_at>now()-interval '1 hour')>=10 then return 'limited'; end if;
  select user_id into token_user from public.whatsapp_link_codes where code=substring(command from 6) and expires_at>now() for update;
  if token_user is not null then
   perform pg_advisory_xact_lock(hashtextextended('wa-user:'||token_user::text,0));
  end if;
  if token_user is null or not exists(select 1 from public.consents where user_id=token_user and policy_version='2026-10-05') then
   response_text:='That connection could not be verified. Open Kahiye to review privacy choices and get a new connection link.'; linked:=false;
  elsif u is not null and u<>token_user then
   response_text:='This number is already connected. Send STOP from this number before connecting a different account.'; linked:=false;
  elsif exists(select 1 from public.whatsapp_links where user_id=token_user and phone<>p_phone) then
   response_text:='Disconnect the previous number in Kahiye before connecting another number.'; linked:=false;
  else
   insert into public.whatsapp_links(user_id,phone) values(token_user,p_phone) on conflict(user_id) do nothing;
   delete from public.whatsapp_link_codes where user_id=token_user;
   u:=token_user; response_text:='Connected to Kahiye. Describe a parenting moment in a sentence or two. Reply HELP for instructions or STOP to disconnect. For immediate support, visit https://www.kahiye.app/help-now.';
  end if;
 elsif u is null then
  response_text:='Open https://www.kahiye.app/app and choose Connect WhatsApp to connect your account. For immediate support, visit https://www.kahiye.app/help-now.'; linked:=false;
 end if;
 -- Bound per-number generation and unauthenticated reply traffic. STOP always wins.
 if (select count(*) from public.whatsapp_jobs where phone=p_phone and created_at>now()-interval '1 hour')>=30 then return 'limited'; end if;
 insert into public.whatsapp_jobs(id,user_id,phone,body,has_media,response,state,requires_link)
 values(p_id,u,p_phone,case when response_text is null then p_body else '' end,p_media,response_text,case when response_text is null then 'pending' else 'ready' end,linked);
 return 'recorded';
end $$;

create function public.claim_whatsapp(p_id text,p_send boolean) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare j public.whatsapp_jobs; token uuid:=gen_random_uuid(); phone_key text;
begin
 select phone into phone_key from public.whatsapp_jobs where id=p_id;
 if phone_key is null then return null; end if;
 perform pg_advisory_xact_lock(hashtextextended('wa:'||phone_key,0));
 select * into j from public.whatsapp_jobs where id=p_id for update;
 if not found then return null; end if;
 if j.created_at<now()-interval '23 hours' and j.state in ('pending','processing','ready') then
  update public.whatsapp_jobs set state='cancelled',body='',response=null,last_error='Reply window expired.',updated_at=now() where id=p_id; return null;
 end if;
 if j.state='sending' and j.lease_until<now() then
  update public.whatsapp_jobs set state='needs_review',body='',response=null,last_error='Provider acceptance uncertain. Check Twilio before any new send.',updated_at=now() where id=p_id; return null;
 end if;
 if j.requires_link and (j.user_id is null or not exists(select 1 from public.whatsapp_links where user_id=j.user_id and phone=j.phone) or not exists(select 1 from public.consents where user_id=j.user_id and policy_version='2026-10-05')) then
  update public.whatsapp_jobs set state='cancelled',body='',response=null,last_error='Connection or consent no longer current.',updated_at=now() where id=p_id; return null;
 end if;
 if p_send then
  if j.state<>'ready' or j.response is null then return null; end if;
  update public.whatsapp_jobs set state='sending',lease=token,lease_until=now()+interval '90 seconds',updated_at=now() where id=p_id;
 else
  if j.state not in ('pending','processing') or j.next_attempt_at>now() or (j.state='processing' and j.lease_until>now()) then return null; end if;
  if j.attempts>=3 then update public.whatsapp_jobs set state='needs_review',body='',last_error='Response preparation failed repeatedly.',updated_at=now() where id=p_id; return null; end if;
  -- Serialize generation per phone, so feedback/child context does not race.
  if exists(select 1 from public.whatsapp_jobs where phone=j.phone and id<>p_id and state='processing' and lease_until>now()) then return null; end if;
  update public.whatsapp_jobs set state='processing',attempts=attempts+1,lease=token,lease_until=now()+interval '120 seconds',updated_at=now() where id=p_id;
 end if;
 return to_jsonb(j)||jsonb_build_object('lease',token);
end $$;

create function public.record_whatsapp_feedback(p_job text,p_outcome text) returns text
language plpgsql security invoker set search_path='' as $$
declare j public.whatsapp_jobs; child uuid; target uuid; reply text;
begin
 if p_outcome not in ('worked','partly','did_not_work') then raise exception 'Invalid outcome'; end if;
 select * into j from public.whatsapp_jobs where id=p_job for update;
 if not found or j.state<>'processing' then raise exception 'Message lease unavailable'; end if;
 select last_child_id into child from public.whatsapp_links where user_id=j.user_id and phone=j.phone;
 if not found or not exists(select 1 from public.consents where user_id=j.user_id and policy_version='2026-10-05') then raise exception 'Connection unavailable'; end if;
 select id into target from public.decodes where user_id=j.user_id and child_id=child and channel='whatsapp' and outcome is null and created_at>now()-interval '2 days' order by created_at desc limit 1 for update;
 if target is null then reply:='There is no recent suggestion waiting for feedback.';
 else update public.decodes set outcome=p_outcome,outcome_at=now() where id=target; reply:='Thank you. Your feedback has been saved.'; end if;
 update public.whatsapp_jobs set response=reply,body='',state='ready',lease_until=null,updated_at=now() where id=p_job;
 return reply;
end $$;
revoke all on function public.record_whatsapp_feedback(text,text) from public,anon,authenticated;
grant execute on function public.record_whatsapp_feedback(text,text) to service_role;

create function public.finish_whatsapp(p_id text,p_token uuid,p_response text,p_provider text,p_error text) returns boolean
language plpgsql security invoker set search_path='' as $$
declare j public.whatsapp_jobs;
begin
 select * into j from public.whatsapp_jobs where id=p_id for update;
 if not found or j.lease is distinct from p_token then return false; end if;
 if j.state='processing' then
  update public.whatsapp_jobs set state=case when p_response is null then 'pending' else 'ready' end,
   response=left(p_response,1600),body=case when p_response is not null then '' else body end,
   lease_until=null,last_error=left(p_error,200),next_attempt_at=now()+interval '1 minute',updated_at=now() where id=p_id;
 elsif j.state='sending' then
  update public.whatsapp_jobs set state=case when p_provider is null then 'needs_review' else 'accepted' end,
   provider_id=p_provider,delivery_status=case when p_provider is null then null else 'accepted' end,
   body='',response=null,lease_until=null,last_error=left(p_error,200),updated_at=now() where id=p_id;
 else return false;
 end if;
 return true;
end $$;

create function public.record_whatsapp_status(p_id text,p_provider text,p_status text,p_error text) returns boolean
language plpgsql security invoker set search_path='' as $$
declare rank_value integer;
begin
 rank_value:=case p_status when 'accepted' then 1 when 'queued' then 2 when 'sending' then 3 when 'sent' then 4 when 'failed' then 5 when 'undelivered' then 5 when 'delivered' then 6 when 'read' then 7 else 0 end;
 if rank_value=0 or p_provider !~ '^SM[0-9a-fA-F]{32}$' then return false; end if;
 update public.whatsapp_jobs set provider_id=p_provider,state='accepted',delivery_status=p_status,delivery_rank=rank_value,
  last_error=left(p_error,100),body='',response=null,lease_until=null,updated_at=now()
 where id=p_id and state in ('sending','accepted','needs_review') and (provider_id is null or provider_id=p_provider) and delivery_rank<rank_value;
 return found;
end $$;

-- Deleting a link in the app also invalidates any issued token and unsent work.
create function private.cancel_whatsapp_work() returns trigger language plpgsql security definer set search_path='' as $$
begin
 update public.whatsapp_jobs set state='cancelled',body='',response=null,updated_at=now() where user_id=old.user_id and state in ('pending','processing','ready');
 delete from public.whatsapp_link_codes where user_id=old.user_id;
 return old;
end $$;
revoke all on function private.cancel_whatsapp_work() from public,anon,authenticated;
create trigger cancel_whatsapp_work after delete on public.whatsapp_links for each row execute function private.cancel_whatsapp_work();

alter table public.consultation_alerts add column delivery_status text, add column delivery_rank integer not null default 0, add column delivery_at timestamptz;
create table public.email_delivery_receipts (
 id text primary key check(length(id) between 1 and 200), provider_id text not null check(length(provider_id) between 1 and 100),
 status text not null, rank integer not null, occurred_at timestamptz not null, received_at timestamptz not null default now()
);
alter table public.email_delivery_receipts enable row level security;
revoke all on public.email_delivery_receipts from public,anon,authenticated;
grant all on public.email_delivery_receipts to service_role;
create index email_delivery_provider on public.email_delivery_receipts(provider_id,rank desc);

create function public.record_email_delivery(p_id text,p_provider text,p_status text,p_time timestamptz) returns void
language plpgsql security invoker set search_path='' as $$
declare r integer;
begin
 r:=case p_status when 'email.sent' then 1 when 'email.delivery_delayed' then 2 when 'email.delivered' then 3 when 'email.failed' then 4 when 'email.bounced' then 5 when 'email.complained' then 6 else 0 end;
 if r=0 then return; end if;
 perform pg_advisory_xact_lock(hashtextextended('email:'||p_provider,0));
 if p_time>now()+interval '5 minutes' then raise exception 'Invalid event time'; end if;
 insert into public.email_delivery_receipts(id,provider_id,status,rank,occurred_at) values(p_id,p_provider,p_status,r,p_time) on conflict do nothing;
 update public.consultation_alerts set delivery_status=p_status,delivery_rank=r,delivery_at=p_time,updated_at=now()
 where provider_id=p_provider and delivery_rank<r;
end $$;

create or replace function public.finish_consultation_alert(target uuid,token uuid,accepted_id text,failure text) returns void language plpgsql security invoker set search_path='' as $$
begin
 if accepted_id is not null then perform pg_advisory_xact_lock(hashtextextended('email:'||accepted_id,0)); end if;
 update public.consultation_alerts set state=case when accepted_id is not null then 'accepted' else 'failed' end,provider_id=accepted_id,last_error=left(failure,200),lease_until=null,updated_at=now()
 where request_id=target and lease=token and state='sending';
 if not found then raise exception 'Delivery lease unavailable'; end if;
end $$;

-- A provider callback may arrive before the send response is persisted.
create function private.apply_email_receipt() returns trigger language plpgsql security definer set search_path='' as $$
declare e public.email_delivery_receipts;
begin
 if new.provider_id is not null then
  select * into e from public.email_delivery_receipts where provider_id=new.provider_id order by rank desc,occurred_at desc limit 1;
  if found and e.rank>new.delivery_rank then new.delivery_status:=e.status; new.delivery_rank:=e.rank; new.delivery_at:=e.occurred_at; end if;
 end if;
 return new;
end $$;
revoke all on function private.apply_email_receipt() from public,anon,authenticated;
create trigger apply_email_receipt before insert or update of provider_id on public.consultation_alerts for each row execute function private.apply_email_receipt();

create table public.delivery_worker_health (id boolean primary key default true check(id), last_started_at timestamptz, last_finished_at timestamptz, last_error text);
alter table public.delivery_worker_health enable row level security;
revoke all on public.delivery_worker_health from public,anon,authenticated;
grant all on public.delivery_worker_health to service_role;

-- Privacy retention for transient transport payloads. Retain only seven days of metadata.
create function public.prune_delivery() returns void language sql security invoker set search_path='' as $$
 delete from public.whatsapp_jobs where created_at<now()-interval '7 days';
 delete from public.email_delivery_receipts where received_at<now()-interval '7 days';
 delete from public.whatsapp_link_codes where expires_at<now();
$$;

revoke all on function public.receive_whatsapp(text,text,text,boolean),public.claim_whatsapp(text,boolean),public.finish_whatsapp(text,uuid,text,text,text),public.record_whatsapp_status(text,text,text,text),public.record_email_delivery(text,text,text,timestamptz),public.prune_delivery() from public,anon,authenticated;
grant execute on function public.receive_whatsapp(text,text,text,boolean),public.claim_whatsapp(text,boolean),public.finish_whatsapp(text,uuid,text,text,text),public.record_whatsapp_status(text,text,text,text),public.record_email_delivery(text,text,text,timestamptz),public.prune_delivery() to service_role;

-- Include bounces and complaints in the existing operations attention queue.
do $$ declare definition text; fn text; begin
 foreach fn in array array['private.admin_overview()','private.admin_consultations(text,text,integer)'] loop
  if to_regprocedure(fn) is not null then
   select pg_get_functiondef(to_regprocedure(fn)) into definition;
   execute replace(definition,'a.state not in (''accepted'',''cancelled'')','(a.state not in (''accepted'',''cancelled'') or a.delivery_rank>=4)');
  end if;
 end loop;
end $$;
