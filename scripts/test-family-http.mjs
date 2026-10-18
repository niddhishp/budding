// Requires the disposable parent adapter; real routes and SQL, no real providers.
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
const base='http://127.0.0.1:3011',childId='e0000000-0000-4000-8000-000000000011';
const adapter='http://127.0.0.1:54329';
assert.equal((await fetch(adapter+'/__test/status').then(r=>r.json())).mode,'ordinary');
async function request(path,method,payload,expected=200){const r=await fetch(base+path,{method,headers:{origin:base,'Content-Type':'application/json'},...(payload?{body:JSON.stringify(payload)}:{})});const b=await r.json();assert.equal(r.status,expected,JSON.stringify(b));return b;}
const care=await request(`/api/care?childId=${childId}`,'GET');
const settings={...care.settings,reference:'girls',reminders:true};
const saved=await request('/api/care','PATCH',{childId,revision:care.revision,settings});
await request('/api/care','PATCH',{childId,revision:care.revision,settings:{...settings,reference:'boys'}},409);
const entry={id:crypto.randomUUID(),child_id:childId,revision:0,measured_on:'2026-10-01',weight_kg:8.5,length_cm:72,head_cm:44,method:'lying',note:'Synthetic clinic record',archived:false};
const first=await request('/api/care','POST',entry);const retry=await request('/api/care','POST',entry);assert.equal(first.entry.id,retry.entry.id);assert.equal(retry.entry.revision,1);
await request('/api/care','POST',{...entry,id:crypto.randomUUID(),measured_on:'2025-01-01'},400);
await request('/api/care','POST',{...entry,id:crypto.randomUUID(),measured_on:'2099-01-01'},400);
await request('/api/care','POST',{...entry,revision:0,weight_kg:9},409);
await request('/api/care','GET',null,400);
await request('/api/care?childId=f0000000-0000-4000-8000-000000000099','GET',null,404);
await request('/api/care','PATCH',{childId,revision:saved.revision,settings:{pregnancyNotes:'x'.repeat(3001)}},400);
const final=await request(`/api/care?childId=${childId}`,'GET');assert.equal(final.settings.reference,'girls');assert.ok(final.growth.some(g=>g.id===entry.id));
await request('/api/billing/subscribe','POST',{interval:'monthly'},503);
await request('/api/whatsapp/link','POST',{},503);
const raw='{bad json',signature=createHmac('sha256','synthetic-webhook-only').update(raw).digest('hex');
const malformed=await fetch('http://127.0.0.1:3010/api/billing/webhook',{method:'POST',headers:{'x-razorpay-signature':signature},body:raw});assert.equal(malformed.status,400);
console.log('PASS: care API persistence, retries, stale revisions, validation, date boundaries, unavailable child, live-service gates and signed malformed webhook.');
