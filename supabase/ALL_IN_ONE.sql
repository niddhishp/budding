-- Budding.live — all migrations in one transaction. Paste into Supabase → SQL Editor → Run.
-- Safe to run once on project udqvdkuiwmzhlrqxvvks: precheck found only Synaptix tables (mindmaps, sessions, users), no name clashes.
-- If anything fails, the whole script rolls back and nothing is changed.
begin;
create table if not exists public._budding_migrations (name text primary key, applied_at timestamptz not null default now());
alter table public._budding_migrations enable row level security;

-- ════════ schema.sql ════════
-- Budding.live schema
-- Run in the Supabase SQL editor (or `supabase db push`) on a fresh project.

create extension if not exists vector;

-- ─── Children ────────────────────────────────────────────────────────────────
-- One temperament model across the app: six traits, 0–100.
-- `dob` is null during pregnancy; `due_date` is set instead.
create table public.children (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  dob date,
  due_date date,

  curiosity            smallint not null default 50 check (curiosity between 0 and 100),
  persistence          smallint not null default 50 check (persistence between 0 and 100),
  sensitivity          smallint not null default 50 check (sensitivity between 0 and 100),
  sociability          smallint not null default 50 check (sociability between 0 and 100),
  emotional_intensity  smallint not null default 50 check (emotional_intensity between 0 and 100),
  flexibility          smallint not null default 50 check (flexibility between 0 and 100),

  created_at timestamptz not null default now(),
  constraint children_birth_or_due check (dob is not null or due_date is not null)
);
create index children_user_idx on public.children (user_id);

-- ─── Observation log (the child's memory) ────────────────────────────────────
-- `embedding` is reserved for semantic retrieval once log volume justifies it;
-- until then the analyzer reads the most recent entries directly.
create table public.context_logs (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  log_type text not null default 'observation'
    check (log_type in ('struggle', 'milestone', 'observation', 'routine')),
  embedding vector(1024),
  created_at timestamptz not null default now()
);
create index context_logs_child_time_idx on public.context_logs (child_id, created_at desc);
create index context_logs_embedding_idx on public.context_logs using hnsw (embedding vector_cosine_ops);

-- ─── Decodes (every AI analysis + the parent's "did it work?" verdict) ──────
create table public.decodes (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  scenario text not null check (char_length(scenario) between 1 and 2000),
  analysis jsonb not null,
  risk_level text not null default 'none' check (risk_level in ('none', 'low', 'elevated', 'urgent')),
  outcome text check (outcome in ('worked', 'partly', 'did_not_work')),
  outcome_at timestamptz,
  model text,
  created_at timestamptz not null default now()
);
create index decodes_child_time_idx on public.decodes (child_id, created_at desc);
create index decodes_user_time_idx on public.decodes (user_id, created_at desc);

-- ─── Row level security: every row belongs to exactly one parent ────────────
alter table public.children     enable row level security;
alter table public.context_logs enable row level security;
alter table public.decodes      enable row level security;

create policy "children: owner full access" on public.children
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "context_logs: owner full access" on public.context_logs
  for all using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.children c where c.id = child_id and c.user_id = auth.uid())
  );

-- Decodes are written by the server (as the signed-in user) and are immutable
-- except for the outcome fields, which the parent sets from the UI.
create policy "decodes: owner read" on public.decodes
  for select using (auth.uid() = user_id);
create policy "decodes: owner insert" on public.decodes
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.children c where c.id = child_id and c.user_id = auth.uid())
  );
create policy "decodes: owner update outcome" on public.decodes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "decodes: owner delete" on public.decodes
  for delete using (auth.uid() = user_id);

revoke update on public.decodes from authenticated;
grant update (outcome, outcome_at) on public.decodes to authenticated;

insert into public._budding_migrations (name) values ('schema.sql');

-- ════════ 002_billing.sql ════════
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

insert into public._budding_migrations (name) values ('002_billing.sql');

-- ════════ 003_reports.sql ════════
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

insert into public._budding_migrations (name) values ('003_reports.sql');

-- ════════ 004_phase2.sql ════════
-- Budding.live — Phase 2: bedtime stories, pregnancy week guides, expert requests.
-- Run after 003_reports.sql.

-- ─── Bedtime stories ─────────────────────────────────────────────────────────
create table public.stories (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  theme text not null check (char_length(theme) between 1 and 300),
  language text not null default 'English',
  title text not null,
  body text not null,
  moral text,
  audio_path text,           -- object path in the private `story-audio` bucket, once narrated
  model text,
  created_at timestamptz not null default now()
);
create index stories_child_time_idx on public.stories (child_id, created_at desc);
create index stories_user_time_idx on public.stories (user_id, created_at desc);

alter table public.stories enable row level security;
create policy "stories: owner read" on public.stories for select using (auth.uid() = user_id);
create policy "stories: owner insert" on public.stories for insert with check (
  auth.uid() = user_id
  and exists (select 1 from public.children c where c.id = child_id and c.user_id = auth.uid())
);
create policy "stories: owner delete" on public.stories for delete using (auth.uid() = user_id);
-- audio_path is written by the server with the service role after narration.

-- Private bucket for narration audio; served to the owner through short-lived signed URLs.
insert into storage.buckets (id, name, public)
values ('story-audio', 'story-audio', false)
on conflict (id) do nothing;

-- ─── Pregnancy week guides (shared cache, one per week + language) ──────────
create table public.week_guides (
  week smallint not null check (week between 1 and 42),
  language text not null default 'English',
  guide jsonb not null,
  model text,
  created_at timestamptz not null default now(),
  primary key (week, language)
);

alter table public.week_guides enable row level security;
create policy "week_guides: signed-in read" on public.week_guides for select to authenticated using (true);
-- Written only by the server (service role) the first time a week is requested.

-- ─── Expert consultation requests (concierge, fulfilled manually) ───────────
create table public.expert_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  child_id uuid references public.children on delete set null,
  concern text not null check (char_length(concern) between 5 and 2000),
  phone text not null check (char_length(phone) between 8 and 20),
  preferred_language text not null default 'English',
  preferred_time text,
  status text not null default 'new' check (status in ('new', 'contacted', 'scheduled', 'completed', 'cancelled')),
  source text not null default 'menu' check (source in ('menu', 'safety', 'report')),
  created_at timestamptz not null default now()
);
create index expert_requests_status_idx on public.expert_requests (status, created_at);

alter table public.expert_requests enable row level security;
create policy "expert_requests: owner read" on public.expert_requests for select using (auth.uid() = user_id);
create policy "expert_requests: owner insert" on public.expert_requests for insert with check (auth.uid() = user_id);

insert into public._budding_migrations (name) values ('004_phase2.sql');

-- ════════ 005_whatsapp.sql ════════
-- Budding.live — WhatsApp channel via Twilio (run after 004_phase2.sql)

-- A parent's verified WhatsApp number. Written by the server (service role) when the
-- parent sends their one-time LINK code from that number.
create table public.whatsapp_links (
  user_id uuid primary key references auth.users on delete cascade,
  phone text unique not null,              -- E.164, e.g. +919812345678
  last_child_id uuid references public.children on delete set null,
  linked_at timestamptz not null default now()
);

alter table public.whatsapp_links enable row level security;
create policy "whatsapp_links: owner read" on public.whatsapp_links for select using (auth.uid() = user_id);
create policy "whatsapp_links: owner delete" on public.whatsapp_links for delete using (auth.uid() = user_id);

-- Short-lived one-time codes; server-only (no policies).
create table public.whatsapp_link_codes (
  user_id uuid primary key references auth.users on delete cascade,
  code text not null,
  expires_at timestamptz not null
);
create unique index whatsapp_link_codes_code_idx on public.whatsapp_link_codes (code);

alter table public.whatsapp_link_codes enable row level security;

-- Where each decode came from, for channel analytics.
alter table public.decodes add column if not exists channel text not null default 'app'
  check (channel in ('app', 'whatsapp'));

insert into public._budding_migrations (name) values ('005_whatsapp.sql');
commit;

-- Verify: should list 11 Budding tables, all with rls_enabled = true
select c.relname as table_name, c.relrowsecurity as rls_enabled from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and c.relname in ('children','context_logs','decodes','subscriptions','consents','reports','stories','week_guides','expert_requests','whatsapp_links','whatsapp_link_codes') order by 1;
