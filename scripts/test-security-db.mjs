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
  await client.query(readFileSync('tests/sql/admin-operations.sql','utf8'));
  console.log('PASS: admin operations, assignment scope, credential checks, scheduling, conflicts, consent and erasure. All fixtures rolled back.');
  await client.query(readFileSync('tests/sql/optional-intake.sql','utf8'));
  console.log('PASS: optional intake constraints and ownership. Fixtures rolled back.');
  await client.query(readFileSync('tests/sql/child-guide.sql','utf8'));
  await client.query(readFileSync('tests/sql/child-profile-gender.sql','utf8'));
  console.log('PASS: profile Boy/Girl persistence, editing, clearing, constraints, consent and family isolation. Fixtures rolled back.');
  console.log('PASS: guide preference isolation, consent, anonymous denial, validation and unrelated profile preservation. Fixtures rolled back.');
  await client.query(readFileSync('tests/sql/memory-continuity.sql','utf8'));
  await client.query(readFileSync('tests/sql/conversation-boundaries.sql','utf8'));
  console.log('PASS: chat/practice cannot create outcome memories, worker memories, or cross-mode continuations. Fixtures rolled back.');
  console.log('PASS: memory revisions, ownership, corrections, stop/rerate, pause, pending extraction and continuity boundaries. Fixtures rolled back.');
  await import('./test-guidance-db.mjs');
  await client.query(readFileSync('tests/sql/consultation-delivery.sql','utf8'));
  console.log('PASS: expert capacity, booking buffers, daily limits, overdue queues, contact receipts, delivery leases, retry limits and erasure. Fixtures rolled back.');
  await import('./test-capacity-db.mjs');
  await client.query(readFileSync('tests/sql/family-resources.sql','utf8'));
  console.log('PASS: private care/growth ownership, consent, revisions, retry, archive/undo, billing replay/order and erasure. Fixtures rolled back.');
  await client.query(readFileSync('tests/sql/provider-delivery.sql','utf8'));
  await client.query(readFileSync('tests/sql/profile-notebooks.sql','utf8'));
  await client.query(readFileSync('tests/sql/family-planner.sql','utf8'));
  await client.query(readFileSync('tests/sql/shop.sql','utf8'));
  console.log('PASS: shop isolation, service-only writes, MFA, revisions, audit, discovery limits and erasure.');
  console.log('PASS: family planning ownership, revisions/retries, archive/restore, validation, private photos and erasure recovery.');
  console.log('PASS: profile notebooks enforce ownership, consent, revision/retry, date validation, archive/restore and child erasure. Fixtures rolled back.');
  console.log('PASS: provider transport permissions, atomic linking, receipts, leases, STOP/consent, delivery ordering, ambiguous sends and erasure. Fixtures rolled back.');
} finally {
  await client.query('rollback');
  await client.end();
}
