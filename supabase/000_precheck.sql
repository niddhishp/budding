-- Run this FIRST in project udqvdkuiwmzhlrqxvvks (previously Synaptix).
-- It changes nothing. It lists any existing objects whose names Budding's migrations
-- would collide with. If it returns rows, stop and decide (rename/drop) before running
-- schema.sql and 002_billing.sql — those use plain CREATE and will fail on a clash,
-- which is safe but leaves the setup half-applied.

select table_schema, table_name, 'table' as kind
from information_schema.tables
where table_schema = 'public'
  and table_name in ('children', 'context_logs', 'decodes', 'subscriptions', 'consents')
union all
select n.nspname, p.polname, 'policy on ' || c.relname
from pg_policy p
join pg_class c on c.oid = p.polrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('children', 'context_logs', 'decodes', 'subscriptions', 'consents');

-- Also useful: everything else still living in public from Synaptix.
-- select table_name from information_schema.tables where table_schema = 'public' order by 1;
