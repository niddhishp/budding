import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const raw=readFileSync('data/reference/cdc-bmi-age.csv');
const rows=raw.toString().trim().split(/\r?\n/).filter(line=>!line.startsWith('Sex,')).map(line=>line.split(',').map(Number));
const result={boys:[],girls:[]};
for(const [sex,month,l,m,s] of rows){
  if(![sex,month,l,m,s].every(Number.isFinite)||![1,2].includes(sex)) throw Error('Invalid source row');
  result[sex===1?'boys':'girls'].push([month,l,m,s]);
}
if(result.boys.length!==219||result.girls.length!==219) throw Error('Unexpected reference length');
writeFileSync('src/data/cdc-bmi-lms.json',JSON.stringify(result));
writeFileSync('data/reference/cdc-bmi-age.sha256',createHash('sha256').update(raw).digest('hex')+'  cdc-bmi-age.csv\n');
