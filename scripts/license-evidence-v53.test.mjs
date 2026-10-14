import assert from 'node:assert/strict';
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {parseRepo,inspectEvidence,restoreVerifiedMetadata,verifyHeld} from './license-evidence-v53.mjs';
const tool={id:'test',name:'Example',github:'https://github.com/example/project',license:'확인 필요',free:true,openSource:false,stars:400,description:'한국어 설명이 있습니다',longDescription:'상세한 기능 설명이 포함되어 있습니다'};
assert.equal(parseRepo(tool.github),'example/project');
assert.equal(parseRepo('https://evil.com/example/project'),null);
const fake=async()=>new Response(JSON.stringify({license:{spdx_id:'MIT'}}),{headers:{'content-type':'application/json'}});
const evidence=await inspectEvidence(tool,{fetcher:fake});
assert.equal(evidence.license,'MIT');
const verified=restoreVerifiedMetadata(tool,evidence);
assert.equal(verified.license,'MIT');assert.equal(verified.openSource,true);assert.equal(verified.free,true);
const noFree={...tool,free:false};
assert.equal(restoreVerifiedMetadata(noFree,evidence).free,false);
const html=await inspectEvidence(tool,{fetcher:async()=>new Response('Not Found',{status:404})});
assert.equal(restoreVerifiedMetadata(tool,html).license,'확인 필요');
const unknown=await inspectEvidence(tool,{fetcher:async()=>new Response(JSON.stringify({license:{spdx_id:'NOASSERTION'}}))});
assert.equal(unknown.license,null);
const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'openshelf-v53-'));
try{
 const obj={'auto-review-v51.json':{version:1,items:[{id:'test',status:'pending_review',tool}]},'tools.json':[],'discovery-denylist.json':[]};
 for(const [name,data] of Object.entries(obj))await fs.writeFile(path.join(tmp,name),JSON.stringify(data));
 const res=await verifyHeld({root:tmp,fetcher:fake,token:'test'});
 assert.deepEqual([res.checked,res.approved],[1,1]);
 const list=JSON.parse(await fs.readFile(path.join(tmp,'tools.json'),'utf8'));assert.equal(list.length,1);assert.equal(list[0].license,'MIT');
 const again=await verifyHeld({root:tmp,fetcher:fake,token:'test'});assert.equal(again.checked,0);
}finally{await fs.rm(tmp,{recursive:true,force:true})}
console.log('V53 official license evidence, false-free protection and idempotence passed');
