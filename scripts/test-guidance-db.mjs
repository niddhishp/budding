import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

const url = process.env.TEST_DATABASE_URL;
if (!url || !['localhost','127.0.0.1','[::1]'].includes(new URL(url).hostname)) throw new Error('Guidance fixtures require a local disposable database.');
const db = new pg.Client({ connectionString: url }); await db.connect();
const user = randomUUID(), other = randomUUID(), child = randomUUID(), child2 = randomUUID(), foreign = randomUUID();
async function fixture() {
  await db.query('insert into auth.users(id,email) values($1,$2),($3,$4)',[user,`${user}@example.invalid`,other,`${other}@example.invalid`]);
  await db.query("insert into public.consents(user_id,policy_version) values($1,'2026-10-05'),($2,'2026-10-05')",[user,other]);
  await db.query("insert into public.children(id,user_id,name,dob) values($1,$2,'Synthetic A','2020-01-01'),($3,$2,'Synthetic B','2021-01-01'),($4,$5,'Other parent','2020-01-01')",[child,user,child2,foreign,other]);
}
async function reserve(id = randomUUID(), kind = 'decode', refin = null, kid = child, fingerprint = 'synthetic', client = db) {
  return (await client.query('select public.reserve_guidance($1,$2,$3,$4,$5,$6) result',[id,user,kid,kind,fingerprint,refin])).rows[0].result;
}
const payload = { scenario: 'Synthetic bedtime moment', analysis: { sayThis: 'I am here.', clarify: { question: 'When?', options: ['Before bed','After bed'] } }, risk_level: 'none', safety_category: 'none', model: 'synthetic-test' };
async function complete(id, lease) { return (await db.query('select public.complete_guidance($1,$2,$3) id',[id,lease,payload])).rows[0].id; }
async function rejected(query, values, code) {
  await db.query('savepoint rejected');
  try { await assert.rejects(db.query(query, values), error => !code || error.code === code); }
  finally { await db.query('rollback to savepoint rejected'); await db.query('release savepoint rejected'); }
}
try {
  await db.query('begin'); await fixture(); await db.query('set local role service_role');
  const id = randomUUID(); const first = await reserve(id);
  assert.equal(first.status,'reserved');
  assert.equal((await reserve(id)).status,'busy');
  assert.equal((await reserve(id,'decode',null,child,'different')).status,'conflict');
  await rejected('select public.reserve_guidance($1,$2,$3,$4,$5)',[randomUUID(),user,foreign,'decode','x'],'42501');
  await rejected('select public.complete_guidance($1,$2,$3)',[id,randomUUID(),payload]);
  const root = await complete(id,first.lease);
  assert.equal((await reserve(id)).resultId,root);
  assert.equal((await db.query('select count(*)::int n from public.decodes where user_id=$1',[user])).rows[0].n,1);
  assert.equal((await db.query('select count(*)::int n from public.guidance_jobs where decode_id=$1',[root])).rows[0].n,1);
  assert.equal((await reserve(randomUUID(),'decode',root,child2)).status,'invalid_refinement');
  let refined;
  for (let i=0;i<2;i++) { const rid=randomUUID(); const r=await reserve(rid,'decode',root); assert.equal(r.status,'reserved'); refined=await complete(rid,r.lease); }
  assert.equal((await reserve(randomUUID(),'decode',root)).status,'refinement_limit');
  assert.equal((await reserve(randomUUID(),'decode',refined)).status,'invalid_refinement');
  await db.query("update public.decodes set created_at=now()-interval '31 minutes' where id=$1",[root]);
  assert.equal((await reserve(randomUUID(),'decode',root)).status,'invalid_refinement');
  const failedId=randomUUID(); const failed=await reserve(failedId);
  await db.query("update public.guidance_requests set state='failed' where id=$1",[failedId]);
  const retry=await reserve(failedId); assert.equal(retry.status,'reserved'); assert.notEqual(retry.lease,failed.lease);
  await rejected('select public.complete_guidance($1,$2,$3)',[failedId,failed.lease,payload]);
  await db.query("update public.guidance_requests set expires_at=now()-interval '1 second' where id=$1",[failedId]);
  await rejected('select public.complete_guidance($1,$2,$3)',[failedId,retry.lease,payload]);
  const retry2=await reserve(failedId); assert.equal(retry2.status,'reserved'); await complete(failedId,retry2.lease);
  // Free allows 10 a week: fill to nine saved answers so this reservation takes the last turn.
  await db.query("insert into public.decodes(user_id,child_id,scenario,analysis) select $1,$2,'Synthetic filler '||g,'{}' from generate_series(1,7) g",[user,child]);
  const thirdId=randomUUID(), third=await reserve(thirdId); assert.equal(third.status,'reserved');
  assert.equal((await reserve()).status,'limit');
  await db.query('delete from public.consents where user_id=$1',[user]);
  await rejected('select public.complete_guidance($1,$2,$3)',[thirdId,third.lease,payload],'42501');
  assert.equal((await db.query('select count(*)::int n from public.decodes where user_id=$1 and refines is null',[user])).rows[0].n,9); // two real answers plus seven fillers
  await db.query("insert into public.consents(user_id,policy_version) values($1,'2026-10-05')",[user]);
  await complete(thirdId,third.lease);
  assert.equal((await reserve(randomUUID(),'report')).status,'limit');
  const storyId=randomUUID(), story=await reserve(storyId,'story');
  assert.equal(story.status,'reserved');
  await db.query('select public.complete_guidance($1,$2,$3)',[storyId,story.lease,{theme:'Synthetic',language:'English',title:'A quiet evening',body:'A synthetic story.',moral:'Pause together.',model:'synthetic-test'}]);
  assert.equal((await reserve(randomUUID(),'story')).status,'limit');
  for(let i=0;i<5;i++) { const sid=randomUUID(), slot=await reserve(sid,'share'); assert.equal(slot.status,'reserved'); await db.query('select public.complete_guidance($1,$2,$3)',[sid,slot.lease,{}]); }
  assert.equal((await reserve(randomUUID(),'share')).status,'limit');
  const job=(await db.query('select public.claim_guidance_job($1) j',[user])).rows[0].j;
  const memory=[{kind:'preference',content:'Likes a quiet bedtime routine.',source:'ai_inferred',confidence:0.95,sensitive:false}];
  await db.query('select public.finish_guidance_job($1,$2,$3)',[job.decodeId,job.lease,JSON.stringify(memory)]);
  assert.equal(Number((await db.query('select confidence from public.memories where decode_id=$1',[job.decodeId])).rows[0].confidence),0.7);
  await rejected('select public.finish_guidance_job($1,$2,$3)',[job.decodeId,job.lease,JSON.stringify(memory)]);
  await db.query("insert into public.guidance_requests(id,user_id,child_id,kind,fingerprint,state,attempts) values(gen_random_uuid(),$1,$2,'decode','synthetic-budget','failed',20)",[user,child]);
  assert.equal((await reserve()).status,'processing_limit');
  await db.query('reset role'); await db.query('set local role authenticated');
  await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:user,role:'authenticated',aal:'aal1'})]);
  await rejected('select * from public.guidance_requests',[],'42501');
  await rejected('select public.reserve_guidance($1,$2,$3,$4,$5)',[randomUUID(),user,child,'decode','x'],'42501');
  await rejected("insert into public.decodes(child_id,scenario,analysis) values($1,'bypass','{}')",[child],'42501');
  await db.query('select public.record_decode_outcome($1,$2)',[root,'worked']);
  await db.query('select public.record_decode_outcome($1,$2)',[root,'did_not_work']);
  assert.equal((await db.query("select count(*)::int n from public.memories where decode_id=$1 and source='decode_outcome'",[root])).rows[0].n,1);
  await rejected('select public.record_decode_outcome($1,$2)',[randomUUID(),'worked'],'42501');
  await db.query('rollback');
  console.log('PASS: receipts, recovery, leases, consent at commit, bounded refinements, job idempotency, confidence cap, outcome atomicity and API privileges.');

  // Real concurrent connections, against committed synthetic records only.
  await fixture();
  // Nine of the ten free turns used: exactly one remains for eight simultaneous requests.
  await db.query("insert into public.decodes(user_id,child_id,scenario,analysis) select $1,$2,'Synthetic '||g,'{}' from generate_series(1,9) g",[user,child]);
  const clients=Array.from({length:8},()=>new pg.Client({connectionString:url}));
  try {
    await Promise.all(clients.map(async c=>{await c.connect();await c.query('set role service_role');}));
    const results=await Promise.all(clients.map(c=>reserve(randomUUID(),'decode',null,child,'synthetic',c)));
    assert.equal(results.filter(r=>r.status==='reserved').length,1);
    assert.equal(results.filter(r=>r.status==='limit').length,7);
    console.log('PASS: eight concurrent requests for one remaining allowance reserve exactly one slot.');
  } finally { await Promise.all(clients.map(c=>c.end())); }
} finally {
  await db.query('rollback'); await db.query('reset role');
  await db.query('delete from auth.users where id=any($1::uuid[])',[[user,other]]);
  await db.end();
}
