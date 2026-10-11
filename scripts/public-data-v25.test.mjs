import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {csvToFiles,compareFiles,validateUpdate,refresh} from './update-public-data-csv.mjs';
const header='목록키,목록유형,목록명,제공기관,분류체계,설명,확장자(데이터포맷),목록 URL\n';
const line=(id,name,type='FILE')=>[id,type,name,'기관','교통 - 도로','설명','CSV','https://www.data.go.kr/data/'+id+'/fileData.do'].join(',');
const dataset=(n=80000)=>Array.from({length:n},(_,i)=>line(String(15000000+i),'데이터 '+i));
const base=dataset();
assert.equal(csvToFiles(header+base.join('\n')).length,80000);
assert.throws(()=>csvToFiles(header+base.concat(base[0]).join('\n')),/incomplete|duplicate/i);
assert.throws(()=>csvToFiles('invalid,header\nx,y'),/schema/i);
const before=[{id:'15000000',name:'before'},{id:'15000001',name:'same'}];
const after=[{id:'15000000',name:'after'},{id:'15999999',name:'new'}];
assert.deepEqual(compareFiles(before,after),{added:['15999999'],modified:['15000000'],removed:['15000001']});
assert.throws(()=>validateUpdate(Array(10000).fill(0),[],{removed:Array(10000).fill('x')}),/shrink/);
const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'v25-files-'));
try{
 await fs.mkdir(path.join(tmp,'public-data-csv'));
 const old=csvToFiles(header+base.join('\n'));
 const manifest={source:'official-csv',snapshot:'2026-09-30',verification:'metadata-only',total:old.length,parts:[]};
 for(let i=0;i<old.length;i+=1000){
  const file='public-data-csv/part-'+String(i/1000+1).padStart(2,'0')+'.json';
  manifest.parts.push(file);
  await fs.writeFile(path.join(tmp,file),JSON.stringify({verification:'metadata-only',items:old.slice(i,i+1000)}));
 }
 await fs.writeFile(path.join(tmp,'public-data-official-list.json'),JSON.stringify(manifest));
 const csv=path.join(tmp,'current.csv');await fs.writeFile(csv,header+base.slice(1).concat(line('15999999','새 파일')).join('\n'));
 const result=await refresh({csvPath:csv,snapshot:'2026-10-11',root:tmp});
 assert.equal(result.counts.added,1);assert.equal(result.counts.removed,1);
 assert.equal(JSON.parse(await fs.readFile(path.join(tmp,'public-data-official-list.json'))).total,80000);
 assert.equal(JSON.parse(await fs.readFile(path.join(tmp,'public-data-update-report.json'))).counts.added,1);
 await assert.rejects(()=>refresh({csvPath:csv,snapshot:'2026-09-29',root:tmp}),/older/);
}finally{await fs.rm(tmp,{recursive:true,force:true})}
console.log('V25 file-data comparison, 80k shard rebuild and rollback tests passed');
