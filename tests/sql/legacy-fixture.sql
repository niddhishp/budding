-- Disposable fixtures for the retirement migrations, never production data.
create type public.user_role as enum ('user','admin');
create type public.user_plan as enum ('free','pro','admin');
create table public.users(id serial primary key, union_id text, role public.user_role, plan public.user_plan, updated_at timestamptz);
create table public.sessions(id text primary key, user_id integer references public.users on delete cascade, user_agent text);
create table public.mindmaps(id serial primary key, nodes_json jsonb, updated_at timestamptz);
create function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
create trigger users_set_updated_at before update on public.users for each row execute function public.set_updated_at();
create trigger mindmaps_set_updated_at before update on public.mindmaps for each row execute function public.set_updated_at();
insert into public.users(union_id,role,plan) values('synthetic-legacy','user','free');
insert into public.sessions values('synthetic-session',1,'synthetic');
insert into public.mindmaps(nodes_json) values('[]');
