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
