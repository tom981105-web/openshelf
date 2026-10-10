import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {publicAddress,acceptableUrl,checkCandidate,probeQueue} from './probe-playground-candidates.mjs';
for(const ip of ['127.0.0.1','10.1.2.3','192.168.1.2','169.254.169.254','172.16.0.5','::1','fc00::1'])assert.equal(publicAddress(ip),false,ip);
for(const ip of ['8.8.8.8','1.1.1.1','2606:4700:4700::1111'])assert.equal(publicAddress(ip),true,ip);
for(const u of ['http://test.example.org','https://127.0.0.1','https://localhost','https://user:pass@test.example.org','https://demo.example.org:8443'])assert.equal(acceptableUrl(u),null);
assert.ok(acceptableUrl('https://demo.sample.org/path'));
assert.equal((await checkCandidate('https://demo.sample.org',{resolve:async()=>[{address:'127.0.0.1'}]})).status,'unsafe-dns');
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'openshelf-probe-'));
try{
  const input=path.join(dir,'queue.json'),output=path.join(dir,'results.json');
  await fs.writeFile(input,JSON.stringify({reviewRequired:true,candidates:[{id:'a',url:'https://a.sample.org',status:'unverified'},{id:'b',url:'https://b.sample.org',status:'unverified'},{id:'c',url:'https://c.sample.org',status:'approved'}]}));
  const result=await probeQueue(input,output,20,async()=>({status:'reachable',httpStatus:200}));
  assert.equal(result.checks.length,2);
  assert.ok(result.checks.every(x=>x.reviewStatus==='unverified'));
  assert.equal(JSON.parse(await fs.readFile(output,'utf8')).checks.length,2);
}finally{await fs.rm(dir,{recursive:true,force:true})}
console.log('Playground probing safety and no-auto-approval tests passed');
