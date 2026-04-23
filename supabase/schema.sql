-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- Create a table for Children
create table public.children (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  dob date not null,
  
  -- The Temperament DNA: Scale from 1 to 10
  temperament_sensitivity integer check (temperament_sensitivity between 1 and 10),
  temperament_intensity integer check (temperament_intensity between 1 and 10),
  temperament_adaptability integer check (temperament_adaptability between 1 and 10),
  temperament_persistence integer check (temperament_persistence between 1 and 10),
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create a table for Contextual Memory Logs (Behaviors, Milestones, Struggles)
create table public.context_logs (
  id uuid primary key default gen_random_uuid(),
  child_id uuid references public.children on delete cascade not null,
  user_id uuid references auth.users not null,
  
  content text not null, -- The raw text from the parent "He had a meltdown at the park..."
  log_type text not null check (log_type in ('struggle', 'milestone', 'observation', 'routine')),
  
  -- The core differentiator: We store the embedding of this log to query against later
  embedding vector(1536), 
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create an index to speed up similarity search
create index on public.context_logs using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- Enable RLS
alter table public.children enable row level security;
alter table public.context_logs enable row level security;

-- Create policies
create policy "Users can view their own children"
  on children for select
  using ( auth.uid() = user_id );

create policy "Users can view their own context logs"
  on context_logs for select
  using ( auth.uid() = user_id );
