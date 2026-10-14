import fs from 'node:fs/promises';
import {inspectEvidence,restoreVerifiedMetadata,parseRepo} from './license-evidence-v53.mjs';
import {inspectDocuments} from './document-evidence-v54.mjs';
import {decision} from './auto-review-v51.mjs';
export async function recheckHeld({root='data',fetcher=fetch,token=process.env.GITHUB_TOKEN,limit=15}={}){
 const base=root.replace(/\/$/,'')+'/';
 const [raw,tools,deny]=await Promise.all(['auto-review-v51.json','tools.json','discovery-denylist.json'].map(x=>fs.readFile(base+x,'utf8').then(JSON.parse)));
 const entries=Array.isArray(raw.items)?raw.items:[];
 const published=new Set(tools.map(x=>parseRepo(x.github)?.toLowerCase()).filter(Boolean));
 const denied=new Set(deny.map(x=>String(x).replace(/^https:\/\/github.com\//i,'').toLowerCase()));
 let checked=0,approved=0;const results=[];
 for(const entry of entries){
  if(checked>=limit)break;
  if(entry.status!=='pending_review'||!entry.tool)continue;
  checked++;
  const previous=entry.tool;
  const license=await inspectEvidence(previous,{fetcher,token});
  const document=await inspectDocuments(previous,{fetcher,token});
  let candidate=restoreVerifiedMetadata(previous,license);
  if(!license.license&&document.verifiedLicense==='MIT')candidate={...candidate,license:'MIT',openSource:true};
  // A free claim in README is informational, not an entitlement or a hard-gate override.
  const check=decision(candidate,{existingRepos:published,deniedRepos:denied});
  entry.tool=candidate;entry.licenseEvidenceCheckedAt=new Date().toISOString();
  entry.documentEvidenceCheckedAt=entry.licenseEvidenceCheckedAt;
  entry.lastVerifiedAt=entry.licenseEvidenceCheckedAt;
  entry.licenseEvidence={license:license.license,source:license.licenseSource,notes:license.notes};
  entry.documentEvidence=document;
  entry.recheckReasons=check.reasons;
  if(check.status==='auto_approved'&&!tools.some(x=>String(x.id)===String(candidate.id))){
   tools.unshift(candidate);published.add(parseRepo(candidate.github).toLowerCase());
   entry.status='auto_approved_after_license_check';entry.tool=undefined;approved++;
  }
  results.push({id:entry.id,status:entry.status,reasons:check.reasons});
 }
 if(checked){raw.updatedAt=new Date().toISOString();await fs.writeFile(base+'auto-review-v51.json',JSON.stringify(raw,null,2)+'\n');if(approved)await fs.writeFile(base+'tools.json',JSON.stringify(tools,null,2)+'\n')}
 console.log(JSON.stringify({checked,approved,held:checked-approved,results}));
 return {checked,approved,held:checked-approved,results};
}
if(process.argv[1]?.endsWith('/recheck-held-v57.mjs'))await recheckHeld();
