// Apply supabase/*.sql in filename order, each exactly once, each in its own transaction.
// Usage: put SUPABASE_DB_URL in .env.local (Supabase → Connect → "Session pooler" URI), then `npm run db:migrate`.
// `npm run db:migrate -- --check` only runs 000_precheck.sql and prints any name clashes.
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
const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort((a, b) => {
  // schema.sql is the first real migration (001).
  const rank = (f) => (f === 'schema.sql' ? '001' : f);
  return rank(a).localeCompare(rank(b));
});

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

try {
  const precheck = readFileSync(join(dir, '000_precheck.sql'), 'utf8');
  const { rows: clashes } = await client.query(precheck);
  await client.query(`create table if not exists public._budding_migrations (name text primary key, applied_at timestamptz not null default now())`);
  // RLS with no policies: invisible to the anon/authenticated API roles.
  await client.query('alter table public._budding_migrations enable row level security');
  const { rows: appliedRows } = await client.query('select name from public._budding_migrations');
  const applied = new Set(appliedRows.map((r) => r.name));

  if (clashes.length && !applied.has('schema.sql')) {
    console.error('Name clashes with existing objects — resolve before migrating:');
    console.table(clashes);
    process.exit(1);
  }
  if (process.argv.includes('--check')) {
    console.log(clashes.length ? 'Clashes found (see above).' : 'No clashes. Safe to migrate.');
    process.exit(0);
  }

  for (const file of files) {
    if (file === '000_precheck.sql' || applied.has(file)) continue;
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
} finally {
  await client.end();
}
