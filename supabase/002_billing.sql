-- Budding.live — billing (run after schema.sql)

-- One row per parent. Written only by the server with the service-role key
-- (checkout verification + Razorpay webhooks); parents can read their own row.
create table public.subscriptions (
  user_id uuid primary key references auth.users on delete cascade,
  plan text not null default 'plus' check (plan in ('plus')),
  interval text not null check (interval in ('monthly', 'yearly')),
  status text not null check (status in ('created', 'authenticated', 'active', 'pending', 'halted', 'cancelled', 'completed', 'expired')),
  razorpay_subscription_id text unique not null,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "subscriptions: owner read" on public.subscriptions
  for select using (auth.uid() = user_id);
-- No insert/update/delete policies: only the service role (which bypasses RLS) writes here.

-- Consent record for India's DPDP Act: when the parent agreed, and to which policy version.
create table public.consents (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  policy_version text not null,
  agreed_at timestamptz not null default now()
);

alter table public.consents enable row level security;

create policy "consents: owner read" on public.consents
  for select using (auth.uid() = user_id);
create policy "consents: owner insert" on public.consents
  for insert with check (auth.uid() = user_id);
create policy "consents: owner update" on public.consents
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
