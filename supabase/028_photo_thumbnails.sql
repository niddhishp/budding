-- The memory strip keeps a small private thumbnail beside each family photo
-- ({user}/{id}-{hash}-thumb.webp). When a memory row is deleted, queue both files for the
-- existing erasure worker so a thumbnail can never outlive its photo. No rows are rewritten.
set local lock_timeout='5s';
create or replace function private.queue_family_photo_cleanup() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.kind='memory' and old.value->>'photoHash' is not null then
  insert into public.family_photo_cleanup(path) values
   (old.user_id::text||'/'||old.id::text||'-'||(old.value->>'photoHash')||'.jpg'),
   (old.user_id::text||'/'||old.id::text||'-'||(old.value->>'photoHash')||'-thumb.webp')
  on conflict(path) do nothing;
 end if;
 return old;
end $$;
revoke all on function private.queue_family_photo_cleanup() from public,anon,authenticated;
