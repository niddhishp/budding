// Local browser integration harness. Auth HTTP is a synthetic adapter; application
// routes, validation, database functions, grants and RLS are real. Never deploy this
// process or point it at a remote database. All fixtures roll back when stopped.
import http from 'node:http';
import pg from 'pg';
const url = process.env.TEST_DATABASE_URL;
if (!url || new URL(url).hostname !== '127.0.0.1' || !new URL(url).pathname.endsWith('/kahiye_security_test')) throw new Error('Requires the disposable local test database.');
const db = new pg.Client({ connectionString: url }); await db.connect();
if ((await db.query('select count(*)::int n from auth.users')).rows[0].n !== 0) throw new Error('Browser fixtures require an empty synthetic auth database.');
await db.query('begin');
await db.query(`insert into auth.users(id,email,email_confirmed_at) values
 ('e0000000-0000-4000-8000-000000000001','owner@example.invalid',now()),
 ('e0000000-0000-4000-8000-000000000002','parent@example.invalid',now());
 insert into auth.sessions(id,user_id,aal) values('e0000000-0000-4000-8001-000000000001','e0000000-0000-4000-8000-000000000001','aal2');
 insert into public.admin_memberships(user_id,role) values('e0000000-0000-4000-8000-000000000001','owner');
 insert into public.consents(user_id,policy_version) values('e0000000-0000-4000-8000-000000000002','2026-10-05');
 insert into public.expert_requests(id,user_id,concern,phone,preferred_time) values('e0000000-0000-4000-8002-000000000001','e0000000-0000-4000-8000-000000000002','Synthetic test: help with calmer school mornings.','1234567890','Weekday afternoons');`);
const user = { id: 'e0000000-0000-4000-8000-000000000001', email: 'owner@example.invalid', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
const claims = { sub: user.id, session_id: 'e0000000-0000-4000-8001-000000000001', role: 'authenticated', aal: 'aal2', exp: Math.floor(Date.now()/1000)+14400 };
const token = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.synthetic-only`;
const session = { access_token: token, refresh_token: 'synthetic-only', token_type: 'bearer', expires_in: 14400, expires_at: claims.exp, user };
const cookie = 'sb-127-auth-token=base64-'+Buffer.from(JSON.stringify(session)).toString('base64url');
const rpcs = { admin_session: [], admin_overview: [], admin_experts: [], admin_staff: [], admin_consultations: ['filter_status','search_text','page_number'], admin_consultation: ['target'], save_expert: ['payload'], update_consultation: ['payload'] };
let queue = Promise.resolve();
const backend = http.createServer(async (req,res) => {
  res.setHeader('Content-Type','application/json');
  if (req.url === '/auth/v1/user') { res.end(JSON.stringify(user)); return; }
  const path = new URL(req.url,'http://127.0.0.1').pathname;
  const name = path.replace('/rest/v1/rpc/','');
  if (!(name in rpcs)) { res.statusCode=404; res.end(JSON.stringify({ message: 'Unsupported local adapter route' })); return; }
  const chunks=[]; for await (const chunk of req) chunks.push(chunk);
  const body=JSON.parse(Buffer.concat(chunks).toString() || '{}');
  queue=queue.then(async()=> {
    await db.query('savepoint request');
    try {
      await db.query('set local role authenticated');
      await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify(claims)]);
      const values=rpcs[name].map(key => body[key]);
      const { rows }=await db.query(`select public.${name}(${values.map((_,i)=>'$'+(i+1)).join(',')}) result`,values);
      await db.query('reset role'); await db.query('release savepoint request');
      res.end(JSON.stringify(rows[0].result));
    } catch(error) {
      await db.query('rollback to savepoint request');
      res.statusCode=error.code==='42501'?403:400; res.end(JSON.stringify({code:error.code,message:error.message}));
    }
  }).catch(error => { console.error(error.message); res.destroy(); });
});
const proxy=http.createServer((req,res)=> {
  const upstream=http.request({ hostname:'127.0.0.1',port:3010,path:req.url,method:req.method,headers:{...req.headers,cookie} },response=> { res.writeHead(response.statusCode,response.headers); response.pipe(res); });
  upstream.on('error',()=>{res.statusCode=502;res.end('Start the local app on port 3010.');});req.pipe(upstream);
});
backend.listen(54329,'127.0.0.1'); proxy.listen(3011,'127.0.0.1');
console.log('Synthetic backend: http://127.0.0.1:54329; browser: http://127.0.0.1:3011/admin');
console.log('Start Next with NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54329 and NEXT_PUBLIC_SUPABASE_ANON_KEY=synthetic-only on port 3010.');
async function stop(){proxy.close();backend.close();await queue;await db.query('rollback');await db.end();process.exit(0);}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
