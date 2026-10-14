import assert from 'node:assert/strict';
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {recheckHeld} from './recheck-held-v57.mjs';
const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'openshelf-v57-'));
const tool={id:'held',name:'Held',github:'https://github.com/example/held',license:'확인 필요',openSource:false,free:true,stars:200,description:'한국어 설명입니다.',longDescription:'충분한 길이의 상세 정보입니다.'};
const api=async url=>{
 if(url.endsWith('/license'))return new Response(JSON.stringify({license:{spdx_id:'MIT'}}));
 if(url.endsWith('/contents/LICENSE'))return new Response('missing',{status:404});
 if(url.endsWith('/contents/LICENSE.md')||url.endsWith('/contents/LICENSE.txt'))return new Response('missing',{status:404});
 if(url.endsWith('/contents/README.md'))return new Response(JSON.stringify({type:'file',encoding:'base64',size:16,content:Buffer.from('free tier and paid plans').toString('base64')}));
 return new Response('not found',{status:404});
};
try{
 for(const [file,data] of Object.entries({'auto-review-v51.json':{version:1,items:[{id:'held',name:'Held',status:'pending_review',reasons:['old'],tool}]},'tools.json':[],'discovery-denylist.json':[]}))await fs.writeFile(path.join(tmp,file),JSON.stringify(data));
 const result=await recheckHeld({root:tmp,fetcher:api});
 assert.equal(result.checked,1);assert.equal(result.approved,1);
 const state=JSON.parse(await fs.readFile(path.join(tmp,'auto-review-v51.json'),'utf8'));
 assert.ok(state.items[0].lastVerifiedAt);
 assert.equal(state.items[0].documentEvidence.freeClaim,'mixed_or_paid');
 const second=await recheckHeld({root:tmp,fetcher:api});assert.equal(second.checked,0);
}finally{await fs.rm(tmp,{recursive:true,force:true})}
for(const file of ['automation/admin-webapp.gs','automation/OpenShelf_Admin_v6_4_Code.gs']){
 const source=await fs.readFile(file,'utf8');
 assert.match(source,/lastVerifiedAt:x\.lastVerifiedAt/);
 assert.match(source,/마지막 검증:/);
}
console.log('V57 held recheck and Admin evidence reporting passed');
