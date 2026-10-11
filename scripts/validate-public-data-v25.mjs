import assert from 'node:assert/strict';
import fs from 'node:fs';
const root='data/',m=JSON.parse(fs.readFileSync(root+'public-data-official-list.json'));
assert.equal(m.verification,'metadata-only');
assert.ok(m.total>=80000&&m.total<=120000);
assert.equal(m.parts.length,Math.ceil(m.total/1000));
const ids=new Set();
for(const p of m.parts){
 assert.match(p,/^public-data-csv\/part-\d{2,3}\.json$/);
 const shard=JSON.parse(fs.readFileSync(root+p));
 assert.equal(shard.verification,'metadata-only');
 assert.ok(shard.items.length>0&&shard.items.length<=1000);
 for(const x of shard.items){
  assert.match(x.id,/^[0-9]{7,8}$/);
  assert.equal(x.url,'https://www.data.go.kr/data/'+x.id+'/fileData.do');
  assert.ok(x.name&&x.provider&&x.category&&x.format&&x.summary);
  assert.ok(!ids.has(x.id));ids.add(x.id);
 }
}
assert.equal(ids.size,m.total);
console.log('Public Data official catalog integrity verified:',ids.size);
