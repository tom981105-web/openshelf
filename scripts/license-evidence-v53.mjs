import fs from 'node:fs/promises';
import {decision} from './auto-review-v51.mjs';
const ACCEPTED=new Set(['MIT','Apache-2.0','BSD-2-Clause','BSD-3-Clause','ISC','MPL-2.0','GPL-2.0','GPL-3.0','LGPL-3.0','LGPL-2.1','AGPL-3.0','Unlicense','CC0-1.0','EPL-2.0']);
export function parseRepo(url){
 try{const u=new URL(url);const p=u.pathname.split('/').filter(Boolean);
  if(u.protocol!=='https:'||u.hostname!=='github.com'||p.length!==2||!p.every(x=>/^[a-zA-Z0-9_.-]+$/.test(x)))return null;
  return p.join('/');
 }catch{return null}
}
export async function inspectEvidence(tool,{fetcher=fetch,token=process.env.GITHUB_TOKEN}={}){
 const repo=parseRepo(tool.github);
 const result={repo,license:null,licenseSource:null,freeEvidence:'unverified',notes:[]};
 if(!repo){result.notes.push('invalid GitHub repository');return result}
 const headers={'accept':'application/vnd.github+json','user-agent':'openshelf-license-audit','x-github-api-version':'2022-11-28'};
 if(token)headers.authorization='Bearer '+token;
 try{
  const res=await fetcher('https://api.github.com/repos/'+repo+'/license',{headers,signal:AbortSignal.timeout(10000)});
  if(res.status===404){result.notes.push('No GitHub license metadata');return result}
  if(!res.ok){result.notes.push('GitHub API status '+res.status);return result}
  const data=await res.json();
  const spdx=String(data?.license?.spdx_id||'');
  if(ACCEPTED.has(spdx)){result.license=spdx;result.licenseSource='GitHub license endpoint';}
  else result.notes.push('License not verified via SPDX');
 }catch(e){result.notes.push('License API unavailable: '+(e?.name||'error'))}
 return result;
}
export function restoreVerifiedMetadata(tool,evidence){
 if(!evidence.license||!ACCEPTED.has(evidence.license))return {...tool};
 // License SPDX from the GitHub license endpoint is objective evidence of license,
 // but NOT proof that hosted service tiers are free.
 return {...tool,license:evidence.license,openSource:true};
}
export async function verifyHeld({root='data',fetcher=fetch,token=process.env.GITHUB_TOKEN,limit=12}={}){
 const base=root.replace(/\/$/,'')+'/';
 const [raw,tools,deny]=await Promise.all(['auto-review-v51.json','tools.json','discovery-denylist.json'].map(x=>fs.readFile(base+x,'utf8').then(JSON.parse)));
 const existingRepos=new Set(tools.map(x=>parseRepo(x.github)?.toLowerCase()).filter(Boolean));
 const deniedRepos=new Set(deny.map(x=>{const p=String(x).replace(/^https:\/\/github.com\//i,'').toLowerCase();return p}));
 let checked=0,approved=0;
 for(const entry of raw.items||[]){
  if(checked>=limit)break;
  if(entry.status!=='pending_review'||!entry.tool||entry.licenseEvidenceCheckedAt)continue;
  checked++;
  const evidence=await inspectEvidence(entry.tool,{fetcher,token});
  entry.licenseEvidenceCheckedAt=new Date().toISOString();
  entry.licenseEvidence={license:evidence.license,source:evidence.licenseSource,freeEvidence:evidence.freeEvidence,notes:evidence.notes};
  const candidate=restoreVerifiedMetadata(entry.tool,evidence);
  const check=decision(candidate,{existingRepos,deniedRepos});
  entry.recheckReasons=check.reasons;
  if(check.status==='auto_approved'&&!tools.some(x=>String(x.id)===String(candidate.id))){
    tools.unshift(candidate);existingRepos.add(parseRepo(candidate.github).toLowerCase());
    entry.status='auto_approved_after_license_check';entry.tool=undefined;approved++;
  }else entry.tool=candidate;
 }
 if(checked){
  raw.updatedAt=new Date().toISOString();
  await fs.writeFile(base+'auto-review-v51.json',JSON.stringify(raw,null,2)+'\n');
  if(approved)await fs.writeFile(base+'tools.json',JSON.stringify(tools,null,2)+'\n');
 }
 return {checked,approved,held:checked-approved};
}
if(process.argv[1]?.endsWith('/license-evidence-v53.mjs'))console.log(JSON.stringify(await verifyHeld()));
