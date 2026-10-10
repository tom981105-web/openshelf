import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const meta=JSON.parse(fs.readFileSync('data/public-api-official-list.json','utf8'));
assert.equal(meta.verification,'metadata-only');
assert.equal(meta.total,12027);
assert.equal(meta.parts.length,13);
const all=[];
for(const path of meta.parts){
 assert.match(path,/^public-api-csv\/part-\d{2}\.json$/);
 const part=JSON.parse(fs.readFileSync('data/'+path,'utf8'));
 assert.equal(part.verification,'metadata-only');
 assert.ok(Array.isArray(part.items));
 all.push(...part.items);
}
assert.equal(all.length,meta.total);
const ids=new Set();
for(const row of all){
 assert.match(row.id,/^\d{7,8}$/);
 assert.equal(row.url,'https://www.data.go.kr/data/'+row.id+'/openapi.do');
 assert.ok(row.name&&row.provider&&row.category&&row.summary&&row.format&&row.approval);
 assert.ok(!ids.has(row.id),'duplicate '+row.id);
 ids.add(row.id);
}
assert.equal(all.filter(row=>row.id.length===7).length,219);
execFileSync(process.execPath,['--check','public-api.js']);
console.log('Official CSV full catalog: '+all.length+' unique entries, 13 shards, 219 seven-digit IDs.');
