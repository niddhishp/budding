import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { ageDays,ageMonths,careSchema,DEFAULT_CARE,growthSchema,type GrowthEntry } from '../src/lib/family-care';
import { normalCDF,percentile,referenceValue } from '../src/lib/growth-reference';
import { milestoneReminders,milestoneWindow } from '../src/data/milestones';
import { ARTICLES,readingMinutes } from '../src/data/articles';
import { PLAY } from '../src/data/play';
const record:GrowthEntry={id:'a0000000-0000-4000-8000-000000000001',child_id:'a0000000-0000-4000-8000-000000000002',revision:0,measured_on:'2026-01-01',weight_kg:3.3464000225,length_cm:49.88420105,head_cm:34.461799622,method:'lying',note:'',archived:false};
test('WHO source checksum and birth medians agree with published data',()=>{
 assert.equal(createHash('sha256').update(readFileSync('data/reference/WHOref_d.csv')).digest('hex'),'709d04e07de554b6e379aa21ede29b14e41946943f62b9fadea9f80c56f1c4d3');
 for(const metric of ['weight_kg','length_cm','head_cm'] as const){assert.ok(Math.abs(referenceValue('boys',0,metric,0)!-record[metric]!)<.00001);assert.equal(percentile(record,'2026-01-01',{...DEFAULT_CARE,reference:'boys'},metric),50);}
 assert.ok(Math.abs(normalCDF(1.9599639845)-.975)<.000001);
 assert.ok(Math.abs(normalCDF(-1.9599639845)-.025)<.000001);
 for(const sex of ['boys','girls'] as const)for(const day of [0,100,365,730]){const median=referenceValue(sex,day,'weight_kg',0)!;assert.ok(median>0);assert.ok(referenceValue(sex,day,'weight_kg',-1.88)!<median);assert.ok(referenceValue(sex,day,'weight_kg',1.88)!>median);}
});
test('unsupported growth comparisons never produce a percentile',()=>{
 const s={...DEFAULT_CARE,reference:'boys' as const};
 assert.equal(percentile(record,'2026-01-01',DEFAULT_CARE,'weight_kg'),null);
 assert.equal(percentile(record,'2026-01-01',{...s,preterm:true},'weight_kg'),null);
 assert.equal(percentile({...record,method:'standing'},'2026-01-01',s,'length_cm'),null);
 assert.equal(percentile({...record,weight_kg:100},'2026-01-01',s,'weight_kg'),null);
 assert.equal(percentile(record,'2026-01-02',s,'weight_kg'),null);
 assert.equal(percentile({...record,measured_on:'2028-01-02'},'2026-01-01',s,'weight_kg'),null);
 assert.equal(referenceValue('boys',731,'weight_kg',0),null);
});
test('calendar ages and milestone reminders have deterministic boundaries',()=>{
 assert.equal(ageDays('2024-02-28','2024-03-01'),2);
 assert.equal(ageMonths('2026-01-18','2026-03-17'),1);assert.equal(ageMonths('2026-01-18','2026-03-18'),2);
 assert.equal(milestoneWindow('2026-01-18','2026-03-18').current?.month,2);
 assert.equal(milestoneWindow('2026-01-18','2026-03-18').next?.month,4);
 assert.equal(milestoneReminders('2026-01-18',['current-2'],'2026-03-18').length,1);
 assert.equal(milestoneReminders('2020-01-01',[],'2026-01-01').length,0);
});
test('care validation bounds private notes and rejects empty or invalid growth',()=>{
 assert.equal(careSchema.safeParse({pregnancyNotes:'x'.repeat(3001)}).success,false);
 assert.equal(growthSchema.safeParse({...record,weight_kg:null,length_cm:null,head_cm:null}).success,false);
 assert.equal(growthSchema.safeParse({...record,measured_on:'2026-02-30'}).success,false);
 assert.equal(growthSchema.safeParse({...record,weight_kg:-1}).success,false);
 assert.equal(DEFAULT_CARE.reminders,false);
});
test('all twenty authored guides have distinct routes, substantive copy and sources; play has safety cues',()=>{
 assert.equal(ARTICLES.length,20);assert.equal(new Set(ARTICLES.map(a=>a.slug)).size,20);
 for(const a of ARTICLES){assert.ok(a.sections.length>=3);assert.ok(a.sections.map(s=>s.body).join(' ').split(/\s+/).length>=170,a.slug);assert.ok(a.sources.every(s=>s.url.startsWith('https://')));assert.ok(readingMinutes(a)>=1);}
 assert.equal(new Set(PLAY.map(p=>p.id)).size,PLAY.length);assert.ok(PLAY.every(p=>p.steps.length>=3&&p.safety.length>50));
});
