import fs from 'node:fs/promises';
const TOOLS='data/tools.json', LOG='data/discovery-log.json', STATE='data/discovery-state.json';
const APPROVAL='data/auto-review-v51.json';
const DENY='data/discovery-denylist.json';
const SAFE_LICENSES=new Set(['MIT','Apache-2.0','BSD-2-Clause','BSD-3-Clause','ISC','MPL-2.0','GPL-2.0','GPL-3.0','LGPL-3.0','LGPL-2.1','AGPL-3.0','Unlicense','CC0-1.0','EPL-2.0']);
const repoKey=x=>{try{const u=new URL(x.github);if(u.hostname!=='github.com')return '';return u.pathname.toLowerCase().replace(/^\/+|\/+$/g,'')}catch{return ''}};
export function decision(tool,{existingRepos=new Set(),deniedRepos=new Set()}={}){
 const reasons=[],key=repoKey(tool);
 if(!key||existingRepos.has(key)||deniedRepos.has(key))reasons.push('중복 또는 금지된 저장소');
 if(!SAFE_LICENSES.has(tool.license))reasons.push('명확히 검증되지 않은 라이선스');
 if(tool.openSource!==true||tool.free!==true)reasons.push('오픈소스 또는 무료 조건 미확인');
 if(tool.githubArchived===true||tool.githubDisabled===true)reasons.push('중단된 저장소');
 if(!Number.isFinite(tool.stars)||tool.stars<50)reasons.push('GitHub 인기 및 활동 근거 부족');
 if(!String(tool.description||'').trim()||!String(tool.longDescription||'').trim())reasons.push('설명 불충분');
 // Gemini already curated the discovery selection, but no Gemini text may override hard checks.
 const status=reasons.length?'pending_review':'auto_approved';
 return {status,reasons};
}
export async function run({root='data',write=true}={}){
 const prefix=root.endsWith('/')?root:root+'/';
 const [tools,log,state,denied]=await Promise.all([
  fs.readFile(prefix+'tools.json','utf8').then(JSON.parse),
  fs.readFile(prefix+'discovery-log.json','utf8').then(JSON.parse),
  fs.readFile(prefix+'discovery-state.json','utf8').then(JSON.parse),
  fs.readFile(prefix+'discovery-denylist.json','utf8').then(JSON.parse)
 ]);
 const latest=log[0],records=Array.isArray(latest?.addedTools)?latest.addedTools:[];
 let old={version:1,items:[]};
 try{old=JSON.parse(await fs.readFile(prefix+'auto-review-v51.json','utf8'))}catch{}
 if(!records.length)return {approved:0,held:0,note:'No newly discovered tools'};
 const ids=new Set(records.map(x=>String(x.id)));
 const fresh=tools.filter(x=>ids.has(String(x.id)));
 if(fresh.length!==records.length)throw Error('Discovery results did not match newly-added tool rows; review aborted');
 const existingRepos=new Set(tools.filter(x=>!ids.has(String(x.id))).map(repoKey).filter(Boolean));
 const deniedRepos=new Set(denied.map(x=>{try{return new URL(String(x).startsWith('http')?x:'https://github.com/'+x).pathname.toLowerCase().replace(/^\/+|\/+$/g,'')}catch{return ''}}));
 const hold=new Set(),results=[];
 for(const tool of fresh){
  const check=decision(tool,{existingRepos,deniedRepos});
  if(check.status!=='auto_approved')hold.add(String(tool.id));
  results.push({id:String(tool.id),name:tool.name,github:tool.github,license:tool.license,status:check.status,reasons:check.reasons,checkedAt:new Date().toISOString(),sourceRun:latest.id,tool:check.status==='pending_review'?tool:undefined});
 }
 if(write){
  const previous=Array.isArray(old.items)?old.items:[];
  const merged=[...results,...previous.filter(x=>!results.some(y=>y.id===x.id))].slice(0,5000);
  await fs.writeFile(prefix+'auto-review-v51.json',JSON.stringify({version:1,updatedAt:new Date().toISOString(),items:merged},null,2)+'\n');
  if(hold.size)await fs.writeFile(prefix+'tools.json',JSON.stringify(tools.filter(x=>!hold.has(String(x.id))),null,2)+'\n');
  latest.autoReview={approved:results.length-hold.size,held:hold.size,processed:results.length};
  await fs.writeFile(prefix+'discovery-log.json',JSON.stringify(log,null,2)+'\n');
  state.lastAutoReview=latest.autoReview;
  await fs.writeFile(prefix+'discovery-state.json',JSON.stringify(state,null,2)+'\n');
 }
 return {approved:results.length-hold.size,held:hold.size,results};
}
if(process.argv[1]?.endsWith('auto-review-v51.mjs')){const result=await run();console.log(JSON.stringify({approved:result.approved,held:result.held}))}
