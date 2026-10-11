import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const manifest=JSON.parse(fs.readFileSync('data/public-data-official-list.json','utf8'));
assert.equal(manifest.verification,'metadata-only');assert.equal(manifest.total,86411);assert.equal(manifest.parts.length,87);
const ids=new Set();let total=0;
for(let i=0;i<manifest.parts.length;i++){
 const path=manifest.parts[i];
 assert.equal(path,'public-data-csv/part-'+String(i+1).padStart(2,'0')+'.json');
 const shard=JSON.parse(fs.readFileSync('data/'+path,'utf8'));
 assert.equal(shard.verification,'metadata-only');
 assert.equal(shard.items.length,i===86?411:1000);
 for(const x of shard.items){
  assert.match(x.id,/^[0-9]{7,8}$/);
  assert.equal(x.url,'https://www.data.go.kr/data/'+x.id+'/fileData.do');
  for(const key of ['name','provider','category','format','summary'])assert.ok(typeof x[key]==='string'&&x[key].length>0,key);
  assert.ok(!ids.has(x.id),'duplicate '+x.id);ids.add(x.id);total++;
 }
}
assert.equal(total,manifest.total);
execFileSync(process.execPath,['--check','public-data.js']);
const html=fs.readFileSync('public-data.html','utf8');
for(const id of ['fileSearch','fileCategory','fileProvider','fileFormat','fileList','fileStatus','fileRetry','fileDialog','fileDetailTitle'])assert.ok(html.includes('id="'+id+'"'),id);
assert.match(html,/public-data[.]js/);
for(const path of ['index.html','public-api.html'])assert.ok(fs.readFileSync(path,'utf8').includes('href="public-data.html"'),path);
console.log('Public Data 86411 unique file records, 87 shards, page script and navigation validated');
