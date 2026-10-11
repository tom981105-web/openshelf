import assert from 'node:assert/strict';
import fs from 'node:fs';
const root='data/';
const manifest=JSON.parse(fs.readFileSync(root+'public-api-official-list.json','utf8'));
assert.equal(manifest.verification,'metadata-only');
assert.ok(Number.isInteger(manifest.total)&&manifest.total>=10000&&manifest.total<=20000);
assert.ok(Array.isArray(manifest.parts)&&manifest.parts.length===Math.ceil(manifest.total/1000));
const ids=new Set();let total=0;
for(const file of manifest.parts){
 assert.match(file,/^public-api-csv\/part-\d{2}\.json$/);
 const shard=JSON.parse(fs.readFileSync(root+file,'utf8'));
 assert.equal(shard.verification,'metadata-only');
 assert.ok(shard.items.length>0&&shard.items.length<=1000);
 for(const row of shard.items){
  assert.match(row.id,/^[0-9]{7,8}$/);
  assert.equal(row.url,'https://www.data.go.kr/data/'+row.id+'/openapi.do');
  assert.ok(row.name&&row.provider&&row.category&&row.format&&row.approval);
  assert.ok(!ids.has(row.id),'duplicate API id '+row.id);
  ids.add(row.id);total++;
 }
}
assert.equal(total,manifest.total);
console.log('V20 dynamic official CSV catalog validated: '+total+' APIs');
