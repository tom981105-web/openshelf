import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
import {decision,run} from './auto-review-v51.mjs';
const base={id:'new',name:'Good App',github:'https://github.com/org/good-app',license:'MIT',free:true,openSource:true,stars:310,description:'설명이 충분한 도구입니다.',longDescription:'장기간 사용할 수 있는 유용한 응용프로그램입니다.'};
assert.equal(decision(base).status,'auto_approved');
assert.equal(decision({...base,license:'확인 필요'}).status,'pending_review');
assert.equal(decision(base,{existingRepos:new Set(['org/good-app'])}).status,'pending_review');
assert.equal(decision({...base,githubArchived:true}).status,'pending_review');
const tmp=await mkdtemp(path.join(os.tmpdir(),'openshelf-v51-'));const dir=tmp+'/';
try{
 const existing={...base,id:'existing',name:'Existing',github:'https://github.com/org/old'};
 const unclear={...base,id:'held',name:'Unclear',github:'https://github.com/org/unclear',license:'확인 필요'};
 const files={'tools.json':[base,unclear,existing],'discovery-log.json':[{id:'2026-10-14T21',addedTools:[{id:'new'},{id:'held'}]}],'discovery-state.json':{lastStatus:'success'},'discovery-denylist.json':[]};
 for(const [file,data] of Object.entries(files))await writeFile(dir+file,JSON.stringify(data));
 const out=await run({root:tmp});
 assert.deepEqual([out.approved,out.held],[1,1]);
 const tools=JSON.parse(await readFile(dir+'tools.json','utf8'));
 assert.deepEqual(tools.map(x=>x.id),['new','existing']);
 const history=JSON.parse(await readFile(dir+'auto-review-v51.json','utf8'));
 assert.equal(history.items.find(x=>x.id==='held').tool.name,'Unclear');
 const second=await run({root:tmp}).then(()=>null,e=>e);
 assert.ok(second instanceof Error,'same batch must not be auto processed again');
}finally{await rm(tmp,{recursive:true,force:true})}
console.log('V51 auto approval / hold / preservation regression passed');