-- Explicitly authorized retirement. Intentionally irreversible; never recreate
-- legacy data during rollback. Unknown dependencies abort instead of cascading.
-- Locks make the preservation comparison atomic, even while the app is running.
create temporary table kahiye_preservation (
  relation_name text primary key, fingerprint text
) on commit drop;
do $$
declare r record; digest text;
begin
  for r in
    select schemaname, tablename from pg_tables
    where (schemaname = 'public' and tablename not in ('users','sessions','mindmaps'))
       or (schemaname = 'auth' and tablename in ('users','identities','sessions'))
       or (schemaname = 'storage' and tablename in ('objects','buckets'))
    order by schemaname, tablename
  loop
    execute format('lock table %I.%I in share mode', r.schemaname, r.tablename);
    execute format('select md5(coalesce(string_agg(h, '''' order by h), '''')) from (select md5(to_jsonb(t)::text) h from %I.%I t) s', r.schemaname, r.tablename) into digest;
    insert into kahiye_preservation values (format('%I.%I', r.schemaname,r.tablename),digest);
  end loop;
end $$;

-- Verify the identifying columns before dropping any table on another environment.
do $$
declare item record;
begin
  for item in select * from (values ('users','union_id'),('sessions','user_agent'),('mindmaps','nodes_json')) as t(tbl,col) loop
    if to_regclass('public.' || item.tbl) is not null and not exists (
      select 1 from information_schema.columns where table_schema='public' and table_name=item.tbl and column_name=item.col
    ) then raise exception 'Unrecognized legacy table: %', item.tbl; end if;
  end loop;
end $$;
drop table if exists public.sessions restrict;
drop table if exists public.mindmaps restrict;
drop table if exists public.users restrict;
drop function if exists public.set_updated_at() restrict;
drop type if exists public.user_role restrict;
drop type if exists public.user_plan restrict;

do $$
declare r record; digest text;
begin
  for r in select * from kahiye_preservation loop
    execute format('select md5(coalesce(string_agg(h, '''' order by h), '''')) from (select md5(to_jsonb(t)::text) h from %s t) s', r.relation_name) into digest;
    if digest is distinct from r.fingerprint then
      raise exception 'Preservation check failed: %; rolling back cleanup', r.relation_name;
    end if;
  end loop;
end $$;
