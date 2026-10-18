// Real route handlers + disposable SQL. All provider signatures and destinations are synthetic.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createHmac } from 'node:crypto';
import pg from 'pg';
import twilio from 'twilio';
import { Webhook } from 'svix';
const url=process.env.TEST_DATABASE_URL;
if(!url||!['localhost','127.0.0.1'].includes(new URL(url).hostname))throw new Error('Local disposable database required');
const pool=new pg.Pool({connectionString:url});
const functions={record_email_delivery:['p_id','p_provider','p_status','p_time'],record_whatsapp_status:['p_id','p_provider','p_status','p_error'],record_billing_event:['p_id','p_subscription','p_event','p_created','p_status','p_period_end','p_paid']};
const server=createServer(async(req,res)=>{
  let client;
  try{
    const name=req.url.split('/').at(-1),args=functions[name];if(!args){res.writeHead(404).end();return;}
    let raw='';for await(const chunk of req)raw+=chunk;
    const data=JSON.parse(raw);client=await pool.connect();await client.query('begin');await client.query('set local role service_role');
    const result=await client.query(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) as value`,args.map(key=>data[key]));
    await client.query('commit');res.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify(result.rows[0].value));
  }catch{if(client)await client.query('rollback');res.writeHead(503,{'content-type':'application/json'}).end(JSON.stringify({code:'TEST_DB_FAILURE'}));}
  finally{client?.release();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
process.env.NEXT_PUBLIC_SUPABASE_URL=`http://127.0.0.1:${server.address().port}`;
process.env.SUPABASE_SERVICE_ROLE_KEY='synthetic-service-only';
process.env.NEXT_PUBLIC_SITE_URL='https://www.kahiye.app';
process.env.RAZORPAY_WEBHOOK_SECRET='synthetic-billing-secret';
process.env.TWILIO_ACCOUNT_SID='AC'+'a'.repeat(32);process.env.TWILIO_AUTH_TOKEN='synthetic-twilio-secret';
process.env.RESEND_WEBHOOK_SECRET='whsec_'+Buffer.from('synthetic-signature-key-only-12345').toString('base64');
const parent='d1000000-0000-4000-8000-000000000001',sid='SM'+'c'.repeat(32),provider='SM'+'d'.repeat(32);
try{
  await pool.query('insert into auth.users(id,email) values($1,$2)',[parent,'provider-routes@example.invalid']);
  await pool.query("insert into public.subscriptions(user_id,interval,status,razorpay_subscription_id) values($1,'monthly','created','sub_route_test')",[parent]);
  const billing=await import('../src/app/api/billing/webhook/route.ts');
  async function bill(id,event,status,paid=false,subscription='sub_route_test',stamp=Math.floor(Date.now()/1000)){
    const raw=JSON.stringify({event,created_at:stamp,payload:{subscription:{entity:{id:subscription,status,current_end:Math.floor(Date.now()/1000)+2592000}},payment:{entity:{status:paid?'captured':'authorized'}}}});
    return billing.POST(new Request('https://www.kahiye.app/api/billing/webhook',{method:'POST',headers:{'x-razorpay-event-id':id,'x-razorpay-signature':createHmac('sha256',process.env.RAZORPAY_WEBHOOK_SECRET).update(raw).digest('hex')},body:raw}));
  }
  assert.equal((await billing.POST(new Request('https://www.kahiye.app/api/billing/webhook',{method:'POST',body:'{}'}))).status,400);
  assert.equal((await bill('route-auth','subscription.authenticated','authenticated')).status,200);
  assert.equal((await pool.query('select paid_through from public.subscriptions where user_id=$1',[parent])).rows[0].paid_through,null);
  assert.equal((await bill('route-charge','subscription.charged','active',true)).status,200);
  assert.ok((await pool.query('select paid_through from public.subscriptions where user_id=$1',[parent])).rows[0].paid_through);
  assert.equal((await bill('route-charge','subscription.charged','active',true)).status,200);
  assert.equal((await bill('route-cancel','subscription.cancelled','cancelled')).status,200);
  assert.equal((await bill('route-old','subscription.activated','active',false,'sub_route_test',Math.floor(Date.now()/1000)-100)).status,200);
  assert.equal((await pool.query('select status from public.subscriptions where user_id=$1',[parent])).rows[0].status,'cancelled');
  assert.equal((await bill('unknown','subscription.charged','active',true,'sub_unknown')).status,503);
  const email=await import('../src/app/api/email/webhook/route.ts');
  const time=new Date(),id='email-route-test',raw=JSON.stringify({type:'email.delivered',created_at:time.toISOString(),data:{email_id:'provider-email-route-test'}});
  const headers={'svix-id':id,'svix-timestamp':String(Math.floor(time.getTime()/1000)),'svix-signature':new Webhook(process.env.RESEND_WEBHOOK_SECRET).sign(id,time,raw)};
  assert.equal((await email.POST(new Request('https://www.kahiye.app/api/email/webhook',{method:'POST',headers,body:raw+' '}))).status,400);
  for(let i=0;i<2;i++)assert.equal((await email.POST(new Request('https://www.kahiye.app/api/email/webhook',{method:'POST',headers,body:raw}))).status,200);
  assert.equal((await pool.query('select count(*)::int n from public.email_delivery_receipts where id=$1',[id])).rows[0].n,1);
  await pool.query("insert into public.whatsapp_jobs(id,user_id,phone,state,lease,lease_until,response) values($1,$2,'+19999999993','sending',gen_random_uuid(),now()+interval '1 minute','Synthetic')",[sid,parent]);
  const status=await import('../src/app/api/whatsapp/status/route.ts'),callback=`https://www.kahiye.app/api/whatsapp/status?job=${sid}`;
  for(const state of ['delivered','sent','read','failed']){
    const params={AccountSid:process.env.TWILIO_ACCOUNT_SID,MessageSid:provider,MessageStatus:state};
    const signature=twilio.getExpectedTwilioSignature(process.env.TWILIO_AUTH_TOKEN,callback,params);
    assert.equal((await status.POST(new Request(callback,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded','x-twilio-signature':signature},body:new URLSearchParams(params)}))).status,200);
  }
  assert.equal((await pool.query('select delivery_status from public.whatsapp_jobs where id=$1',[sid])).rows[0].delivery_status,'read');
  console.log('PASS: actual Razorpay, Resend and Twilio route handlers verify signatures and persist lifecycle/replay/order receipts in disposable SQL. No provider calls.');
}finally{
  await pool.query('delete from auth.users where id=$1',[parent]);
  await pool.query("delete from public.email_delivery_receipts where id='email-route-test'");
  await new Promise(resolve=>server.close(resolve));await pool.end();
}
