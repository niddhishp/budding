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
