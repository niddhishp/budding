-- Disposable PostgreSQL ONLY: minimal Supabase contracts used by these policies.
-- Production verification also runs security.sql against the actual Supabase roles.
do $$ begin
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
  if exists(select 1 from pg_roles where rolname in ('anon','authenticated') and (rolsuper or rolbypassrls)) then raise exception 'Unsafe test roles'; end if;
end $$;
create schema auth;
create schema storage;
create table auth.users(id uuid primary key, email text unique, email_confirmed_at timestamptz);
create table auth.sessions(id uuid primary key, user_id uuid references auth.users on delete cascade, not_after timestamptz, aal text);
create table storage.buckets(id text primary key, name text, public boolean);
create table storage.objects(id uuid primary key, bucket_id text references storage.buckets, name text);
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt()->>'sub')::uuid $$;
grant usage on schema public, auth, storage to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
