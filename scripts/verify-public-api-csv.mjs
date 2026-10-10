import fs from 'node:fs/promises';
import {parseOfficialDetail} from './discover-public-apis.mjs';
import {validatedPublicApis} from '../public-api-core.mjs';

const [sourcePath='data/public-api-csv-review.json',batchArg='100']=process.argv.slice(2);
const limit=Math.max(1,Math.min(200,Number(batchArg)||100));
const publishedPath='data/public-apis.json';
const statePath='data/public-api-csv-verify-state.json';
const input=JSON.parse(await fs.readFile(sourcePath,'utf8'));
if(!Array.isArray(input.records)&&!Array.isArray(input.items))throw Error('Expected CSV review candidate records');
const records=input.records||input.items;
const catalog=JSON.parse(await fs.readFile(publishedPath,'utf8'));
const state=await fs.readFile(statePath,'utf8').then(JSON.parse).catch(e=>{if(e.code==='ENOENT')return {failedDetails:[]};throw e});
const already=new Set(catalog.items.map(x=>String(x.id)));
const errors=new Set(state.failedDetails||[]);
let checked=0,added=0,failed=0;
for(const entry of records){
 if(checked>=limit)break;
 const id=String(entry.id);
 if(!/^\d{8}$/.test(id)||already.has(id)||errors.has(id))continue;
 const url='https://www.data.go.kr/data/'+id+'/openapi.do';
 if(entry.sourceUrl&&entry.sourceUrl!==url)continue;
 if(entry.url&&entry.url!==url)continue;
 checked++;
 try{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  let response;
  try{response=await fetch(url,{signal:controller.signal,redirect:'error'})}finally{clearTimeout(timer)}
  if(!response.ok||!String(response.headers.get('content-type')||'').includes('text/html'))throw Error('invalid response');
  const html=await response.text();
  const official=parseOfficialDetail(html,id);
  const normalize=v=>String(v||'').normalize('NFKC').replace(/\s+/g,'').toLocaleLowerCase('ko');
  if(!official||normalize(official.name)!==normalize(entry.name)||normalize(official.provider)!==normalize(entry.provider))throw Error('unverified official title or provider');
  const verified={...official,url};
  if(validatedPublicApis([verified]).length!==1)throw Error('invalid verified metadata');
  catalog.items.push(verified);already.add(id);added++;
 }catch(error){errors.add(id);failed++;console.warn('Skipped',id,String(error.message||error))}
}
if(validatedPublicApis(catalog.items).length!==catalog.items.length)throw Error('catalog duplicate or invalid');
await fs.writeFile(publishedPath,JSON.stringify(catalog,null,2)+'\n');
await fs.writeFile(statePath,JSON.stringify({failedDetails:[...errors]},null,2)+'\n');
console.log('OFFICIAL_CSV_VERIFICATION='+JSON.stringify({checked,added,failed,total:catalog.items.length,pendingRetry:errors.size}));
