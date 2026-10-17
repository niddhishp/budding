-- Retired Synaptix data only. auth.users/auth.sessions belong to Kahiye.
-- No CASCADE: an unexpected dependency must stop this change.
do $$
declare legacy_name text;
begin
  foreach legacy_name in array array['users','sessions','mindmaps'] loop
    if to_regclass('public.' || legacy_name) is not null then
      execute format('revoke all on table public.%I from public, anon, authenticated', legacy_name);
      execute format('alter table public.%I enable row level security', legacy_name);
    end if;
  end loop;
end $$;
