import assert from 'node:assert/strict';
import pg from 'pg';
const url=process.env.TEST_DATABASE_URL;
if(!url||!['localhost','127.0.0.1'].includes(new URL(url).hostname))throw new Error('Local disposable database required');
const pool=new pg.Pool({connectionString:url,max:8}),user='d2000000-0000-4000-8000-000000000001',token='C'.repeat(32);
try{
 await pool.query('insert into auth.users(id,email) values($1,$2)',[user,'delivery-race@example.invalid']);
 await pool.query("insert into public.consents(user_id,policy_version) values($1,'2026-10-05')",[user]);
 await pool.query("insert into public.whatsapp_link_codes(user_id,code,expires_at) values($1,$2,now()+interval '15 minutes')",[user,token]);
 await Promise.all(Array.from({length:6},(_,i)=>pool.query('select public.receive_whatsapp($1,$2,$3,false)',[`SM${String(i).repeat(32)}`,`+1999999999${i}`,'LINK '+token])));
 const links=await pool.query('select phone from public.whatsapp_links where user_id=$1',[user]);assert.equal(links.rowCount,1);
 const id='SM'+'a'.repeat(32);
 const receipts=await Promise.all(Array.from({length:6},()=>pool.query('select public.receive_whatsapp($1,$2,$3,false) result',[id,links.rows[0].phone,'hello'])));
 assert.equal(receipts.filter(r=>r.rows[0].result==='recorded').length,1);
 const claims=await Promise.all(Array.from({length:6},()=>pool.query('select public.claim_whatsapp($1,false) job',[id])));
 const winner=claims.filter(r=>r.rows[0].job);assert.equal(winner.length,1);
 await pool.query('select public.finish_whatsapp($1,$2,$3,null,null)',[id,winner[0].rows[0].job.lease,'Synthetic reply']);
 const sends=await Promise.all(Array.from({length:6},()=>pool.query('select public.claim_whatsapp($1,true) job',[id])));
 assert.equal(sends.filter(r=>r.rows[0].job).length,1);
 console.log('PASS: six-way connection-token, inbound-receipt, preparation-lease and outbound-send races admit one winner.');
}finally{
 await pool.query('delete from auth.users where id=$1',[user]);
 await pool.query("delete from public.whatsapp_jobs where phone like '+1999999999%' and id=any($1::text[])",[Array.from({length:6},(_,i)=>`SM${String(i).repeat(32)}`)]);
 await pool.end();
}
