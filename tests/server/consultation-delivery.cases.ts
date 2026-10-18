import test from 'node:test';
import assert from 'node:assert/strict';
import type { SupabaseClient } from '@supabase/supabase-js';
import { alertEnvelope, processConsultationAlert } from '../../src/lib/consultation-delivery';
const config = { key:'synthetic',to:'ops@example.invalid',site:'https://www.kahiye.app' };
test('operations alert contains only reference and protected link; missing setup cannot send', async()=>{
  assert.equal(alertEnvelope('synthetic-id',{}),null);
  const payload=alertEnvelope('synthetic-id',config)!;
  assert.equal(Object.keys(payload).sort().join(','),'from,subject,text,to');
  assert.match(payload.text,/https:\/\/www.kahiye.app\/admin\/consultations\/synthetic-id/);
  const db={rpc:async()=>({data:null,error:null})} as unknown as SupabaseClient;
  await processConsultationAlert('synthetic-id',{db,config:{},send:async()=>{throw new Error('Must not send');}});
});
test('accepted, rejected and interrupted sends persist explicit outcomes with stable idempotency',async()=>{
  for(const mode of ['accepted','rejected','interrupted']) {
    const calls:{name:string;args:Record<string,unknown>}[]=[];
    const db={rpc:async(name:string,args:Record<string,unknown>)=>{calls.push({name,args});return {data:name==='claim_consultation_alert'?{lease:'lease',payload:{text:'Frozen minimal alert'}}:null,error:null};}} as unknown as SupabaseClient;
    await processConsultationAlert('request-id',{db,config,send:async(url,init)=>{
      assert.equal(url,'https://api.resend.com/emails');assert.equal((init?.headers as Record<string,string>)['Idempotency-Key'],'consultation-request/request-id');
      assert.equal(init?.body,JSON.stringify({text:'Frozen minimal alert'}));assert.ok(init?.signal);
      if(mode==='interrupted')throw new Error('Timeout');
      return Response.json(mode==='accepted'?{id:'provider-id'}:{error:'Private provider diagnostic must not leak'},{status:mode==='accepted'?200:503});
    }});
    assert.equal(calls[1].name,'finish_consultation_alert');assert.equal(calls[1].args.accepted_id,mode==='accepted'?'provider-id':null);
    assert.equal(String(calls[1].args.failure).includes('Private provider'),false);
  }
});
test('a delivery receipt write failure is surfaced instead of claiming success',async()=>{
  const db={rpc:async(name:string)=>({data:name==='claim_consultation_alert'?{lease:'lease',payload:{text:'Synthetic'}}:null,error:name==='finish_consultation_alert'?{message:'Unavailable'}:null})} as unknown as SupabaseClient;
  await assert.rejects(processConsultationAlert('request-id',{db,config,send:async()=>Response.json({id:'provider-id'})}),/record/);
});
