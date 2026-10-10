import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'pg-candidates-'));
try{
 const input=path.join(temp,'input.json'),output=path.join(temp,'out.json');
 await fs.writeFile(input,JSON.stringify([
 {id:'demo',name:'Demo',github:'https://github.com/owner/demo',website:'https://demo.sample.org/playground',description:'browser editor'},
 {id:'normal',name:'Normal',github:'https://github.com/owner/normal',website:'https://normal.sample.org'},
 {id:'bad',name:'Bad',github:'https://github.com/owner/bad',website:'javascript:alert(1)'},
 {id:'github',name:'GitHub',github:'https://github.com/owner/github',website:'https://github.com/owner/github'},
 {id:'archive',name:'Archived',github:'https://github.com/owner/archive',website:'https://archive.sample.org',githubArchived:true}
 ]));
 const run=spawnSync(process.execPath,['scripts/playground-candidates.mjs',input,output],{encoding:'utf8'});
 assert.equal(run.status,0,run.stderr);
 const result=JSON.parse(await fs.readFile(output,'utf8'));
 assert.equal(result.reviewRequired,true);
 assert.equal(result.method,'metadata-only');
 assert.deepEqual(result.candidates.map(x=>x.id),['demo','normal']);
 assert.ok(result.candidates.every(x=>x.status==='unverified'));
 console.log('Playground candidate review tests passed');
}finally{await fs.rm(temp,{recursive:true,force:true})}
