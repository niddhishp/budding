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
