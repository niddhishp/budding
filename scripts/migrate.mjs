// Apply supabase/*.sql in filename order, each exactly once, each in its own transaction.
// Usage: put SUPABASE_DB_URL in .env.local (Supabase → Connect → "Session pooler" URI), then `npm run db:migrate`.
// `npm run db:migrate -- --check` is read-only and reports pending migrations.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.local' });

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error('SUPABASE_DB_URL is not set in .env.local');
  process.exit(1);
}

const dir = 'supabase';
// ALL_IN_ONE.sql is an old manual-install bundle, never an incremental migration.
const files = readdirSync(dir).filter((f) => f === 'schema.sql' || /^\d{3}_[a-z0-9_]+\.sql$/.test(f)).sort((a, b) => {
  // schema.sql is the first real migration (001).
  const rank = (f) => (f === 'schema.sql' ? '001' : f);
  return rank(a).localeCompare(rank(b));
});

const connectionUrl = new URL(url);
const local = ['localhost', '127.0.0.1', '[::1]'].includes(connectionUrl.hostname);
// pg URL SSL parameters otherwise override the explicit verification settings.
for (const key of ['sslmode','sslcert','sslkey','sslrootcert']) connectionUrl.searchParams.delete(key);
const caPath = process.env.SUPABASE_DB_CA_PATH;
const client = new pg.Client({
  connectionString: connectionUrl.toString(),
  ssl: local ? false : { rejectUnauthorized: true, ...(caPath ? { ca: readFileSync(caPath, 'utf8') } : {}) },
});
await client.connect();

try {
  await client.query("set lock_timeout = '10s'");
  await client.query("set statement_timeout = '60s'");
  const checkOnly = process.argv.includes('--check');
  if (checkOnly) await client.query('begin read only');
  else await client.query('select pg_advisory_lock(72910418)');
  const precheck = readFileSync(join(dir, '000_precheck.sql'), 'utf8');
  const { rows: clashes } = await client.query(precheck);
  const { rows: ledger } = await client.query("select to_regclass('public._budding_migrations') as name");
  const appliedRows = ledger[0].name ? (await client.query('select name from public._budding_migrations')).rows : [];
  const applied = new Set(appliedRows.map((r) => r.name));

  if (clashes.length && !applied.has('schema.sql')) {
    console.error('Name clashes with existing objects — resolve before migrating:');
    console.table(clashes);
    throw new Error('Resolve schema clashes before applying migrations.');
  }
  const pending = files.filter(file => file !== '000_precheck.sql' && !applied.has(file));
  if (checkOnly) {
    console.log(pending.length ? `Pending migrations: ${pending.join(', ')}` : 'Database is up to date.');
    await client.query('rollback');
  } else {
    await client.query(`create table if not exists public._budding_migrations (name text primary key, applied_at timestamptz not null default now())`);
    // RLS with no policies: invisible to the anon/authenticated API roles.
    await client.query('alter table public._budding_migrations enable row level security');
    for (const file of pending) {
      process.stdout.write(`Applying ${file}… `);
      await client.query('begin');
      try {
        await client.query(readFileSync(join(dir, file), 'utf8'));
        await client.query('insert into public._budding_migrations (name) values ($1)', [file]);
        await client.query('commit');
        console.log('done');
      } catch (error) {
        await client.query('rollback');
        console.log('FAILED');
        throw error;
      }
    }
    console.log('Database is up to date.');
  }
} finally {
  // Closing releases the migration advisory lock, including on failure.
  await client.end();
}
