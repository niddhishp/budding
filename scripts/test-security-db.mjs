import { readFileSync, readdirSync } from 'node:fs';
import pg from 'pg';

// No .env.local loading: production credentials must never be an implicit fallback.
const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error('Set TEST_DATABASE_URL to a disposable PostgreSQL database. See docs/SECURITY-FOUNDATION.md.');
const parsed = new URL(url);
if (url.includes('udqvdkuiwmzhlrqxvvks') || !['localhost','127.0.0.1','::1','[::1]'].includes(parsed.hostname)) {
  throw new Error('Automated security fixtures only run against a local disposable database.');
}
const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  if (process.argv.includes('--bootstrap')) {
    const { rows } = await client.query("select count(*)::int n from pg_tables where schemaname in ('public','auth','storage')");
    if (rows[0].n !== 0) throw new Error('Bootstrap requires an empty database; existing data will never be reset.');
    await client.query('begin');
    try {
      await client.query(readFileSync('tests/sql/bootstrap.sql','utf8'));
      const files = readdirSync('supabase').filter(f => f === 'schema.sql' || (/^\d{3}_[a-z0-9_]+\.sql$/.test(f) && f !== '000_precheck.sql'))
        .sort((a,b) => (a === 'schema.sql' ? '001' : a).localeCompare(b === 'schema.sql' ? '001' : b));
      for (const file of files) {
        console.log(`Applying ${file}`);
        if (file === '007_contain_legacy.sql') await client.query(readFileSync('tests/sql/legacy-fixture.sql','utf8'));
        await client.query(readFileSync(`supabase/${file}`,'utf8'));
      }
      const { rows: legacy } = await client.query("select to_regclass('public.users') as users, to_regclass('public.sessions') as sessions, to_regclass('public.mindmaps') as mindmaps");
      if (Object.values(legacy[0]).some(Boolean)) throw new Error('Legacy cleanup did not remove the synthetic tables.');
      await client.query('commit');
      console.log('Disposable schema initialized from repository migrations.');
    } catch (error) { await client.query('rollback'); throw error; }
  }
  await client.query(readFileSync('tests/sql/security.sql','utf8'));
  console.log('PASS: RLS, consent, tenant boundaries, MFA, membership, revocation, audit and erasure. All fixtures rolled back.');
} finally {
  await client.query('rollback');
  await client.end();
}
