// Run only with the disposable adapter; it owns and rolls back all synthetic records.
import assert from 'node:assert/strict';
const base='http://127.0.0.1:3011';
const status=await fetch('http://127.0.0.1:54329/__test/status').then(r=>r.json());
assert.equal(status.mode,'ordinary');
const childId='e0000000-0000-4000-8000-000000000011';
const otherChild='e0000000-0000-4000-8000-000000000012';
const id=crypto.randomUUID();
async function request(path,method,payload,expected=200) {
  const res=await fetch(base+path,{method,headers:{Origin:base,'Content-Type':'application/json'},...(payload?{body:JSON.stringify(payload)}:{})});
  const body=await res.json(); assert.equal(res.status,expected,`${method} ${path}: ${JSON.stringify(body)}`);return body;
}
const payload={id,childId,content:'Synthetic retry and revision fixture',sensitive:false,retention:'30'};
const saved=await request('/api/memories','POST',payload);
const retry=await request('/api/memories','POST',payload);
assert.equal(saved.memory.id,retry.memory.id);
const edited=await request(`/api/memories/${id}`,'PATCH',{childId,revision:1,action:'edit',content:'Corrected fixture',sensitive:true,retention:'forever'});
assert.equal(edited.memory.revision,2);assert.equal(edited.memory.expiresAt,null);assert.equal(edited.memory.sensitive,true);
await request(`/api/memories/${id}`,'PATCH',{childId,revision:1,action:'archive'},409);
await request(`/api/memories/${id}`,'PATCH',{childId:otherChild,revision:2,action:'archive'},409);
await request('/api/memories','POST',{...payload,id:crypto.randomUUID(),content:' '},400);
for(let i=0;i<51;i++) await request('/api/memories','POST',{...payload,id:crypto.randomUUID(),content:`Synthetic page ${i}`});
const first=await request(`/api/memories?childId=${childId}`,'GET');
const second=await request(`/api/memories?childId=${childId}&offset=${first.nextOffset}`,'GET');
assert.equal(first.memories.length,50);assert.ok(second.memories.length>=2);assert.equal(second.nextOffset,null);
assert.equal(new Set([...first.memories,...second.memories].map(m=>m.id)).size,first.memories.length+second.memories.length);
assert.ok([...first.memories,...second.memories].some(m=>m.id===id&&m.content==='Corrected fixture'&&m.sensitive));
const sibling=await request(`/api/memories?childId=${otherChild}`,'GET');assert.equal(sibling.memories.length,0);
console.log('PASS: real memory API validation, retry idempotency, revision conflicts, child scope and two-page retrieval. Disposable adapter will roll back fixtures.');
