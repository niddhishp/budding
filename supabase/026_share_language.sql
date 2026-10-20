-- Free families may send a few caregiver messages a month in a language other than English.
-- Record the language of non-English shares so the monthly allowance can be counted.
-- Nullable and service-only like the rest of guidance_requests; no existing rows are rewritten.
set local lock_timeout='5s';
alter table public.guidance_requests add column share_language text
 check (share_language is null or (kind='share' and share_language ~ '^[A-Z][a-z]{1,19}$'));
create index guidance_share_language_idx on public.guidance_requests(user_id,created_at desc) where share_language is not null;
