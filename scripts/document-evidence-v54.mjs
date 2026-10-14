import fs from 'node:fs/promises';
import {parseRepo,restoreVerifiedMetadata} from './license-evidence-v53.mjs';
import {decision} from './auto-review-v51.mjs';
const LICENSES=new Map([['MIT License','MIT'],['Apache License, Version 2.0','Apache-2.0'],['BSD 3-Clause License','BSD-3-Clause'],['BSD 2-Clause License','BSD-2-Clause'],['ISC License','ISC'],['Mozilla Public License Version 2.0','MPL-2.0'],['GNU GENERAL PUBLIC LICENSE Version 3','GPL-3.0']]);
export function assessText(text){
 const value=String(text||'').slice(0,50000);
 let license=null;for(const [marker,id] of LICENSES)if(value.toLowerCase().includes(marker.toLowerCase())){license=id;break}
 const verified=license==='MIT'&&/permission is hereby granted, free of charge/i.test(value)&&/copies or substantial portions of the software/i.test(value)&&/the software is provided [\"'‘’]as is[\"'‘’]/i.test(value)&&/the above copyright notice and this permission notice/i.test(value);
 return {license,verifiedLicense:verified?'MIT':null,source:verified?'LICENSE complete MIT provisions (text match)':license?'LICENSE header only, unverified':'unknown'};
}
export function assessReadme(text){
 const value=String(text||'').slice(0,30000);
 const paid=/paid plans?|subscription required|pricing tiers|free trial|commercial license required|구독 필수|유료 플랜/i.test(value);
 const free=/free and open.source|free to use|free software|무료로 사용|free tier/i.test(value);
 return {freeClaim:free&&!paid?'claimed_free':paid?'mixed_or_paid':'unknown',source:'README claim only — not verified entitlement'};
}
async function getContent(repo,path,{fetcher,token}){
 const headers={'accept':'application/vnd.github+json','user-agent':'openshelf-evidence-v54'};
 if(token)headers.authorization='Bearer '+token;
 const url='https://api.github.com/repos/'+repo+'/contents/'+path;
 const response=await fetcher(url,{headers,signal:AbortSignal.timeout(10000)});
 if(!response.ok)return null;
 const data=await response.json();
 if(data.type!=='file'||data.encoding!=='base64'||Number(data.size)>50000||typeof data.content!=='string')return null;
 return Buffer.from(data.content.replace(/\s/g,''),'base64').toString('utf8');
}
export async function inspectDocuments(tool,{fetcher=fetch,token=process.env.GITHUB_TOKEN}={}){
 const repo=parseRepo(tool.github);if(!repo)return {license:null,freeClaim:'unknown',notes:['invalid repo']};
 let license=null,readme=null;
 for(const file of ['LICENSE','LICENSE.md','LICENSE.txt']){try{license=await getContent(repo,file,{fetcher,token})}catch{}if(license)break}
 for(const file of ['README.md','README']){try{readme=await getContent(repo,file,{fetcher,token})}catch{}if(readme)break}
 const lp=assessText(license),rp=assessReadme(readme);
 return {license:lp.license,verifiedLicense:lp.verifiedLicense,licenseSource:lp.source,freeClaim:rp.freeClaim,freeSource:rp.source,notes:[]};
}
export async function verifyDocumentEvidence({root='data',fetcher=fetch,token=process.env.GITHUB_TOKEN,limit=10}={}){
 const base=root.replace(/\/$/,'')+'/';
 const [raw,tools,deny]=await Promise.all(['auto-review-v51.json','tools.json','discovery-denylist.json'].map(x=>fs.readFile(base+x,'utf8').then(JSON.parse)));
 const existing=new Set(tools.map(x=>parseRepo(x.github)?.toLowerCase()).filter(Boolean));
 const denied=new Set(deny.map(x=>String(x).toLowerCase().replace(/^https:\/\/github.com\//,'')));
 let checked=0,approved=0;
 for(const entry of raw.items||[]){
  if(checked>=limit)break;
  if(entry.status!=='pending_review'||!entry.tool||entry.documentEvidenceCheckedAt)continue;
  checked++;
  const evidence=await inspectDocuments(entry.tool,{fetcher,token});
  entry.documentEvidenceCheckedAt=new Date().toISOString();
  entry.documentEvidence=evidence;
  // Only a complete MIT text provision match is eligible for auto reassessment.
  // README free statements never override free:false/unknown.
  const candidate={...entry.tool};
  if(evidence.verifiedLicense==='MIT'){
   candidate.license='MIT';candidate.openSource=true;
  }
  const verdict=decision(candidate,{existingRepos:existing,deniedRepos:denied});
  entry.recheckReasons=verdict.reasons;
  if(verdict.status==='auto_approved'&&!tools.some(x=>x.id===candidate.id)){
   tools.unshift(candidate);existing.add(parseRepo(candidate.github).toLowerCase());entry.status='auto_approved_after_document_review';entry.tool=undefined;approved++;
  }
 }
 if(checked){raw.updatedAt=new Date().toISOString();await fs.writeFile(base+'auto-review-v51.json',JSON.stringify(raw,null,2)+'\n');if(approved)await fs.writeFile(base+'tools.json',JSON.stringify(tools,null,2)+'\n')}
 return {checked,approved,held:checked-approved};
}
if(process.argv[1]?.endsWith('/document-evidence-v54.mjs'))console.log(JSON.stringify(await verifyDocumentEvidence()));
