import fs from 'node:fs/promises';
import {validatedPublicApis} from '../public-api-core.mjs';
import {parseOfficialDetail} from './discover-public-apis.mjs';
const sourceFile='data/public-apis.json',candidateFile='data/public-api-candidates.json';
export function canonical(x){return {...x,url:'https://www.data.go.kr/data/'+x.id+'/openapi.do'}}
function comparable(v){return String(v||'').normalize('NFKC').replace(/\s+/g,'').toLocaleLowerCase('ko')}
export function matchesOfficial(candidate,official){
 return !!official&&String(candidate.id)===String(official.id)&&comparable(candidate.name)===comparable(official.name)&&comparable(candidate.provider)===comparable(official.provider);
}
export function pageMatches(html,x){return matchesOfficial(x,parseOfficialDetail(html,String(x.id)))}
export async function updatePublicApis({read=fs.readFile,write=fs.writeFile,fetcher=fetch,limit=120}={}){
 const current=JSON.parse(await read(sourceFile,'utf8')),candidateData=JSON.parse(await read(candidateFile,'utf8'));
 if(!Array.isArray(current.items)||!Array.isArray(candidateData.items))throw Error('Invalid source data');
 const currentRows=validatedPublicApis(current.items);
 if(currentRows.length!==current.items.length||currentRows.length===0)throw Error('Existing catalog contains invalid entries');
 const known=new Set(currentRows.map(x=>String(x.id)));let added=0,checked=0,failed=0;
 const max=Math.max(1,Math.min(200,Number(limit)||120));
 for(const c of candidateData.items){
  if(checked>=max)break;
  if(!/^\d{8}$/.test(String(c?.id))||known.has(String(c.id)))continue;
  const row=canonical(c);
  if(validatedPublicApis([row]).length!==1){failed++;continue}
  checked++;
  try{
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
   let response;
   try{response=await fetcher(row.url,{signal:controller.signal,redirect:'error',headers:{'User-Agent':'OpenShelf-PublicAPI-Indexer/1.0'}})}
   finally{clearTimeout(timer)}
   if(!response.ok||!String(response.headers.get('content-type')||'').includes('text/html'))throw Error('Invalid official HTML response');
   const html=await response.text();
   if(html.length>3_000_000)throw Error('Official HTML too large');
   const official=parseOfficialDetail(html,String(c.id));
   if(!matchesOfficial(c,official))throw Error('Official name/provider mismatch or unparsable record');
   const verified=canonical({...official,approval:official.approval||'원문 확인',format:official.format||'원문 확인'});
   if(validatedPublicApis([verified]).length!==1)throw Error('Incomplete official metadata');
   currentRows.push(verified);known.add(String(c.id));added++;
  }catch(e){failed++;console.warn('Skip unverified API',c.id,String(e.message||e))}
 }
 if(added)await write(sourceFile,JSON.stringify({...current,scope:'verified-curated',items:currentRows},null,2)+'\n');
 console.log(JSON.stringify({checked,added,failed,total:currentRows.length}));
 return {checked,added,failed,total:currentRows.length};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href)await updatePublicApis();
