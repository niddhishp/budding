// Sponsored access under real concurrency: eight families redeem one code at the same moment for an
// organisation with three seats. Exactly three are admitted. Committed synthetic fixtures are removed.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
const url = process.env.TEST_DATABASE_URL;
if (!url || !['localhost','127.0.0.1','[::1]'].includes(new URL(url).hostname)) throw new Error('Sponsor fixtures require a local disposable database.');
const db = new pg.Client({ connectionString: url }); await db.connect();
const org = randomUUID(), parents = Array.from({ length: 8 }, () => randomUUID()), code = 'RACEX23456';
const clients = [];
try {
  await db.query('begin');
  for (const id of parents) {
    await db.query('insert into auth.users(id,email) values($1,$2)', [id, `${id}@example.invalid`]);
    await db.query("insert into public.consents(user_id,policy_version) values($1,'2026-10-05')", [id]);
  }
  await db.query("insert into public.organisations(id,name,kind,seats,starts_on,ends_on,status) values($1,'Synthetic race school','school',3,current_date-1,current_date+30,'active')", [org]);
  await db.query('insert into public.sponsor_codes(code,organisation_id,max_redemptions) values($1,$2,100)', [code, org]);
  await db.query('commit');
  const race = () => Promise.all(parents.map(async id => {
    const c = new pg.Client({ connectionString: url }); clients.push(c); await c.connect();
    await c.query('begin'); await c.query('set local role authenticated');
    await c.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ sub: id, role: 'authenticated' })]);
    const { rows } = await c.query('select public.redeem_sponsor_code($1) r', [code]);
    await c.query('commit');
    return rows[0].r.status;
  }));
  const results = await race();
  assert.equal(results.filter(s => s === 'redeemed').length, 3, results.join());
  assert.equal(results.filter(s => s === 'full').length, 5, results.join());
  const { rows } = await db.query('select (select count(*)::int from public.sponsored_access where organisation_id=$1) seats, (select redeemed_count from public.sponsor_codes where code=$2) redeemed', [org, code]);
  assert.deepEqual(rows[0], { seats: 3, redeemed: 3 });
  // The same families again, at once: admitted families are returned unchanged and no seat moves.
  const again = await race();
  assert.equal(again.filter(s => s === 'redeemed').length, 3);
  assert.equal((await db.query('select redeemed_count from public.sponsor_codes where code=$1', [code])).rows[0].redeemed_count, 3);
  console.log('PASS: eight simultaneous redemptions for three seats admit exactly three; repeated redemptions are idempotent.');
} finally {
  await db.query('rollback');
  await Promise.all(clients.map(c => c.end()));
  await db.query('begin');
  await db.query('delete from auth.users where id=any($1::uuid[])', [parents]);
  await db.query('delete from public.sponsor_codes where code=$1', [code]);
  await db.query('delete from public.organisations where id=$1', [org]);
  await db.query('commit');
  await db.end();
}
