set local lock_timeout='5s';
alter table public.subscriptions add column paid_through timestamptz, add column event_created_at bigint not null default 0, add column event_priority integer not null default 0;
create table public.billing_event_receipts (
 event_id text primary key check(length(event_id)<=200), user_id uuid not null references auth.users on delete cascade,
 subscription_id text not null, event_name text not null, event_created_at bigint not null, received_at timestamptz not null default now()
);
alter table public.billing_event_receipts enable row level security;
revoke all on public.billing_event_receipts from public,anon,authenticated;
grant all on public.billing_event_receipts to service_role;
create index billing_receipts_user on public.billing_event_receipts(user_id);
-- Known ownership is authoritative; stale event notes cannot replace another subscription.
create function public.record_billing_event(p_id text,p_subscription text,p_event text,p_created bigint,p_status text,p_period_end timestamptz,p_paid boolean)
returns text language plpgsql security invoker set search_path='' as $$
declare s public.subscriptions; priority integer;
begin
 if p_id is null or length(p_id)>200 or length(p_id)=0 or p_created is null or p_created<1 or p_created>extract(epoch from now())+300 then raise exception 'Invalid event'; end if;
 if p_status not in ('created','authenticated','active','pending','halted','cancelled','completed','expired','paused') then raise exception 'Invalid status'; end if;
 select * into s from public.subscriptions where razorpay_subscription_id=p_subscription for update;
 if not found then return 'unmatched'; end if;
 insert into public.billing_event_receipts(event_id,user_id,subscription_id,event_name,event_created_at) values(p_id,s.user_id,p_subscription,p_event,p_created) on conflict do nothing;
 if not found then return 'duplicate'; end if;
 -- Terminal states win ties within a provider second; later events can resume a plan.
 priority:=case p_status when 'cancelled' then 9 when 'completed' then 8 when 'expired' then 7 when 'paused' then 6 when 'halted' then 5 when 'pending' then 4 when 'active' then 3 when 'authenticated' then 2 else 1 end;
 update public.subscriptions set
  paid_through=case when p_paid and p_event='subscription.charged' and p_period_end is not null then greatest(paid_through,p_period_end) else paid_through end,
  status=case when (p_created,priority)>(event_created_at,event_priority) then p_status else status end,
  current_period_end=case when (p_created,priority)>(event_created_at,event_priority) then p_period_end else current_period_end end,
  cancel_at_period_end=cancel_at_period_end or p_status='cancelled',
  event_priority=case when p_created>event_created_at then priority when p_created=event_created_at then greatest(priority,event_priority) else event_priority end,
  event_created_at=greatest(event_created_at,p_created),updated_at=now()
 where user_id=s.user_id and razorpay_subscription_id=p_subscription;
 return 'recorded';
end $$;

-- Reserve provider creation once. An uncertain network outcome stays blocked for
-- operator reconciliation instead of silently creating a second recurring mandate.
create table public.billing_checkout_attempts (
 user_id uuid primary key references auth.users on delete cascade,
 token uuid not null default gen_random_uuid(), created_at timestamptz not null default now()
);
alter table public.billing_checkout_attempts enable row level security;
revoke all on public.billing_checkout_attempts from public,anon,authenticated;
grant all on public.billing_checkout_attempts to service_role;
create function public.reserve_billing_checkout(target uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare s public.subscriptions; receipt uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended('checkout:'||target::text,0));
 select * into s from public.subscriptions where user_id=target;
 if found and s.status not in ('cancelled','completed','expired') then return jsonb_build_object('state','existing','id',s.razorpay_subscription_id,'interval',s.interval,'status',s.status);end if;
 insert into public.billing_checkout_attempts(user_id) values(target) on conflict do nothing returning token into receipt;
 if receipt is null then return jsonb_build_object('state','review');end if;
 return jsonb_build_object('state','reserved','token',receipt);
end $$;
revoke all on function public.reserve_billing_checkout(uuid) from public,anon,authenticated;
grant execute on function public.reserve_billing_checkout(uuid) to service_role;
revoke all on function public.record_billing_event(text,text,text,bigint,text,timestamptz,boolean) from public,anon,authenticated;
grant execute on function public.record_billing_event(text,text,text,bigint,text,timestamptz,boolean) to service_role;
-- Keep database quota enforcement aligned with application access checks.
do $$ declare definition text; old text:='(status in (''authenticated'',''active'',''pending'') or (status=''cancelled'' and current_period_end>now()))';
begin
 select pg_get_functiondef('public.reserve_guidance(uuid,uuid,uuid,text,text,uuid,boolean)'::regprocedure) into definition;
 if position(old in definition)=0 then raise exception 'Unexpected guidance entitlement definition'; end if;
 execute replace(definition,old,'(status in (''active'',''pending'',''halted'',''cancelled'',''completed'') and paid_through>now())');
end $$;
