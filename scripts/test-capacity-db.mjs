import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
const url=process.env.TEST_DATABASE_URL;
if (!url || !['localhost','127.0.0.1','[::1]'].includes(new URL(url).hostname)) throw new Error('Capacity fixtures require a local disposable database.');
const db=new pg.Client({connectionString:url});await db.connect();
const owner=randomUUID(), session=randomUUID(), expert=randomUUID(), parents=Array.from({length:6},()=>randomUUID()), requests=parents.map(()=>randomUUID());
const clients=[];
try {
  await db.query('begin');
  for(const id of [owner,...parents]) await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[id,`${id}@example.invalid`]);
  await db.query("insert into auth.sessions(id,user_id,aal) values($1,$2,'aal2')",[session,owner]);
  await db.query("insert into public.admin_memberships(user_id,role) values($1,'owner')",[owner]);
  await db.query("insert into public.experts(id,name,title,qualifications,specialties,languages,verified_at,max_open_requests,daily_session_limit) values($1,'Concurrency fixture','Psychologist','Test','Support','English',now(),1,1)",[expert]);
  for(let i=0;i<parents.length;i++) {
    await db.query("insert into public.consents(user_id,policy_version) values($1,'2026-10-05')",[parents[i]]);
    await db.query("insert into public.expert_requests(id,user_id,concern,phone) values($1,$2,'Synthetic concurrency test','1234567890')",[requests[i],parents[i]]);
  }
  await db.query('commit');
  async function race(schedule=false) {
    return Promise.all(requests.map(async(id,i)=> {
      const c=new pg.Client({connectionString:url});clients.push(c);await c.connect();
      await c.query('begin');await c.query('set local role authenticated');
      await c.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:owner,session_id:session,role:'authenticated',aal:'aal2'})]);
      try {
        await c.query('select public.update_consultation($1)',[{id,version:schedule?2:1,status:schedule?'scheduled':'contacted',expert_id:expert,note:'Synthetic concurrent assignment',...(schedule?{scheduled_at:`2050-02-01T${String(8+i*2).padStart(2,'0')}:00:00Z`}:{})}]);
        await c.query('commit');return 'ok';
      } catch(error) { await c.query('rollback');return error.message; }
    }));
  }
  const assignment=await race();assert.equal(assignment.filter(x=>x==='ok').length,1);
  assert.equal(assignment.filter(x=>x==='This expert has reached their open request limit.').length,5);
  // Set up a second race for six independently confirmed requests on one day.
  await db.query('update public.experts set max_open_requests=10 where id=$1',[expert]);
  await db.query("update public.expert_requests set expert_id=$1,status='contacted',version=2 where id=any($2::uuid[])",[expert,requests]);
  const bookings=await race(true);assert.equal(bookings.filter(x=>x==='ok').length,1);
  assert.equal(bookings.filter(x=>x==='This expert has reached their daily session limit.').length,5);
  console.log('PASS: simultaneous assignments and bookings each admit exactly one remaining capacity slot.');
} finally {
  await db.query('rollback');
  await Promise.all(clients.map(c=>c.end()));
  await db.query('begin');
  // Only this disposable database: temporarily permit cleanup of the synthetic last owner.
  await db.query('alter table public.admin_memberships disable trigger protect_last_owner');
  await db.query('delete from auth.users where id=any($1::uuid[])',[[owner,...parents]]);
  await db.query('delete from public.experts where id=$1',[expert]);
  await db.query('alter table public.admin_memberships enable trigger protect_last_owner');
  await db.query('commit');
  await db.end();
}
