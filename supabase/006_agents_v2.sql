-- Kahiye — agents v2: richer child profile, typed memory, safety review queue.
-- Run after 005_whatsapp.sql.

-- ─── Child profile v2 ────────────────────────────────────────────────────────
alter table public.children
  add column if not exists focus_areas text[] not null default '{}',
  add column if not exists household text[] not null default '{}',
  add column if not exists home_languages text[] not null default '{}',
  add column if not exists profile_notes text check (profile_notes is null or char_length(profile_notes) <= 1000),
  add column if not exists intake_band text,
  add column if not exists intake_at timestamptz;

-- ─── Decodes: safety category + refinement link ─────────────────────────────
alter table public.decodes
  add column if not exists safety_category text not null default 'none',
  add column if not exists refines uuid references public.decodes on delete set null;

-- ─── Typed memory (provenance + confidence, visible and deletable) ──────────
create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null check (kind in ('fact', 'observation', 'pattern', 'what_worked', 'what_didnt', 'preference', 'milestone', 'joy')),
  content text not null check (char_length(content) between 1 and 500),
  source text not null check (source in ('parent_said', 'decode_outcome', 'log', 'ai_inferred')),
  confidence real not null default 1 check (confidence between 0 and 1),
  sensitive boolean not null default false,
  decode_id uuid references public.decodes on delete set null,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists memories_child_idx on public.memories (child_id, archived, created_at desc);

alter table public.memories enable row level security;
drop policy if exists "memories: owner full access" on public.memories;
create policy "memories: owner full access" on public.memories
  for all using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.children c where c.id = child_id and c.user_id = auth.uid())
  );

-- ─── Safety review queue (server-only; humans review weekly) ────────────────
create table if not exists public.safety_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  child_id uuid references public.children on delete set null,
  decode_id uuid references public.decodes on delete set null,
  channel text not null default 'app' check (channel in ('app', 'whatsapp')),
  level text not null,
  category text not null,
  reason text,
  reviewed_at timestamptz,
  reviewer_note text,
  created_at timestamptz not null default now()
);
create index if not exists safety_events_queue_idx on public.safety_events (reviewed_at, created_at desc);
alter table public.safety_events enable row level security;
-- No policies: written and read only with the service role.
