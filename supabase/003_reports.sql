-- Budding.live — weekly pattern reports (run after 002_billing.sql)

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  report jsonb not null,
  model text,
  created_at timestamptz not null default now()
);
create index reports_child_time_idx on public.reports (child_id, created_at desc);

alter table public.reports enable row level security;

create policy "reports: owner read" on public.reports
  for select using (auth.uid() = user_id);
create policy "reports: owner insert" on public.reports
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.children c where c.id = child_id and c.user_id = auth.uid())
  );
create policy "reports: owner delete" on public.reports
  for delete using (auth.uid() = user_id);
