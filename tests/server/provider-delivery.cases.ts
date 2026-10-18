import test from 'node:test';
import assert from 'node:assert/strict';
import { Webhook } from 'svix';
import twilio from 'twilio';
import type { SupabaseClient } from '@supabase/supabase-js';
import { readTwilioForm, validWorkerSecret, verifyEmailEvent } from '../../src/lib/provider-webhooks';
import { processWhatsAppJob } from '../../src/lib/whatsapp-delivery';
import { validatePlan } from '../../src/lib/payment-checks';
import { launchStatus } from '../../src/lib/launch';

test('recovery worker rejects missing, short, wrong and partial secrets',()=>{
  const secret='a'.repeat(40);
  assert.equal(validWorkerSecret(`Bearer ${secret}`,secret),true);
  for(const value of [null,'',secret,`Bearer ${secret}x`,`Bearer ${secret.slice(1)}`])assert.equal(validWorkerSecret(value,secret),false);
  assert.equal(validWorkerSecret('Bearer short','short'),false);
});
test('email callback verifies raw bytes, timestamp and signature before accepting a delivery event',()=>{
  const secret='whsec_'+Buffer.from('synthetic-signing-secret-32-bytes!').toString('base64');
  const signer=new Webhook(secret), time=new Date(), id='evt_synthetic';
  const body=JSON.stringify({type:'email.delivered',created_at:time.toISOString(),data:{email_id:'synthetic-email',to:['private@example.invalid']}});
  const headers=new Headers({'svix-id':id,'svix-timestamp':String(Math.floor(time.getTime()/1000)),'svix-signature':signer.sign(id,time,body)});
  assert.deepEqual(verifyEmailEvent(body,headers,secret).data,{email_id:'synthetic-email'});
  assert.throws(()=>verifyEmailEvent(body+' ',headers,secret));
  headers.set('svix-timestamp','1');assert.throws(()=>verifyEmailEvent(body,headers,secret));
});
test('Twilio validates canonical URL, account, destination and all form parameters',async()=>{
  process.env.NEXT_PUBLIC_SITE_URL='https://www.kahiye.app';
  process.env.TWILIO_ACCOUNT_SID='AC'+'1'.repeat(32);process.env.TWILIO_AUTH_TOKEN='synthetic-token';process.env.TWILIO_WHATSAPP_FROM='whatsapp:+19999999991';
  const path='/api/whatsapp/webhook',url='https://www.kahiye.app'+path;
  const params={AccountSid:process.env.TWILIO_ACCOUNT_SID,To:process.env.TWILIO_WHATSAPP_FROM,From:'whatsapp:+19999999992',MessageSid:'SM'+'1'.repeat(32),Body:'hello',FutureField:'retained for signature'};
  const signature=twilio.getExpectedTwilioSignature('synthetic-token',url,params);
  const make=(body:string)=>new Request(url,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded','x-twilio-signature':signature},body});
  const body=new URLSearchParams(params).toString();
  assert.deepEqual(await readTwilioForm(make(body),path),params);
  assert.equal(await readTwilioForm(make(body+'&Body=changed'),path),null);
  assert.equal(await readTwilioForm(make(body.replace('hello','tampered')),path),null);
  assert.equal(await readTwilioForm(make(body),'/api/whatsapp/status?job=wrong'),null);
  process.env.TWILIO_ACCOUNT_SID='wrong';assert.equal(await readTwilioForm(make(body),path),null);
});
test('durable worker stores a reply before send; uncertainty is recorded and never called success',async()=>{
  for(const mode of ['accepted','timeout','persist-failed']){
    const calls:{name:string;args:Record<string,unknown>}[]=[];let sends=0;
    const db={rpc:async(name:string,args:Record<string,unknown>)=>{
      calls.push({name,args});
      if(name==='claim_whatsapp')return {data:args.p_send?{phone:'+19999999992',response:'Saved reply',lease:'send-lease'}:{phone:'+19999999992',body:'Synthetic moment',has_media:false,user_id:'parent',lease:'prepare-lease'},error:null};
      return {data:true,error:mode==='persist-failed'&&args.p_response?{message:'db unavailable'}:null};
    }} as unknown as SupabaseClient;
    const run=processWhatsAppJob('SM'+'1'.repeat(32),{enabled:true,db,prepare:async()=> 'Saved reply',send:async(_to,body,url)=>{
      sends++;assert.equal(calls[1].args.p_response,body);assert.match(url,/status\?job=SM/);
      if(mode==='timeout')throw new Error('Timeout');return 'SM'+'2'.repeat(32);
    }});
    if(mode==='persist-failed'){await assert.rejects(run,/persist response/);assert.equal(sends,0);}
    else {await run;assert.equal(sends,1);assert.equal(calls.at(-1)?.args.p_provider,mode==='accepted'?'SM'+'2'.repeat(32):null);}
  }
});
test('disabled WhatsApp does not claim or send; absent lease does not send',async()=>{
  await processWhatsAppJob('x',{enabled:false,db:{rpc:()=>{throw new Error('Must not call');}} as unknown as SupabaseClient});
  await processWhatsAppJob('x',{enabled:true,db:{rpc:async()=>({data:null,error:null})} as unknown as SupabaseClient,send:async()=>{throw new Error('Must not send');}});
});
test('provider plan validation rejects price, currency, interval and plan identity mismatches',()=>{
  const plan={id:'plan_test',period:'monthly',interval:1,item:{amount:29900,currency:'INR'}};
  assert.equal(validatePlan(plan,'monthly','plan_test').amount,29900);
  for(const bad of [{...plan,period:'yearly'},{...plan,interval:2},{...plan,id:'other'},{...plan,item:{amount:299,currency:'INR'}},{...plan,item:{amount:29900,currency:'USD'}}])assert.throws(()=>validatePlan(bad,'monthly','plan_test'));
});
test('activation requires explicit switches and a matching sender/worker configuration',()=>{
  process.env.WHATSAPP_ENABLED='false';assert.equal(launchStatus().whatsapp,false);
  process.env.WHATSAPP_ENABLED='true';process.env.TWILIO_ACCOUNT_SID='AC'+'1'.repeat(32);process.env.TWILIO_AUTH_TOKEN='synthetic';process.env.TWILIO_WHATSAPP_FROM='whatsapp:+19999999991';process.env.NEXT_PUBLIC_WHATSAPP_NUMBER='+19999999991';process.env.CRON_SECRET='a'.repeat(40);
  assert.equal(launchStatus().whatsapp,true);
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER='+19999999992';assert.equal(launchStatus().whatsapp,false);
  process.env.BILLING_LIVE_ENABLED='true';process.env.RAZORPAY_KEY_ID='rzp_test_synthetic';assert.equal(launchStatus().billing,false);
});
