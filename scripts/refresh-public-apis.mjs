import fs from 'node:fs/promises';
import {validatedPublicApis} from '../public-api-core.mjs';
const sourceFile='data/public-apis.json',candidateFile='data/public-api-candidates.json';
export function canonical(x){return {...x,url:'https://www.data.go.kr/data/'+x.id+'/openapi.do'}}
export function pageMatches(html,x){
 if(typeof html!=='string'||html.length<250||html.length>2_000_000)return false;
 const clean=html.replace(/<script\\b[^>]*>[\\s\\S]*?<\\/script>/gi,' ').replace(/<style\\b[^>]*>[\\s\\S]*?<\\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&(?:nbsp|amp|lt|gt);/g,' ').replace(/\\s+/g,' ');
 return clean.includes(x.name)&&clean.includes(x.provider);
}
export async function updatePublicApis({read=fs.readFile,write=fs.writeFile,fetcher=fetch}={}){
 const current=JSON.parse(await read(sourceFile,'utf8')),candidateData=JSON.parse(await read(candidateFile,'utf8'));
 if(!Array.isArray(current.items)||!Array.isArray(candidateData.items))throw Error('Invalid source data');
 const currentRows=validatedPublicApis(current.items);
 if(currentRows.length!==current.items.length||currentRows.length===0)throw Error('Existing catalog contains invalid entries');
 const known=new Set(currentRows.map(x=>x.id));let added=0,checked=0,failed=0;
 for(const c of candidateData.items.slice(0,40)){
  if(!/^\\d{8}$/.test(String(c?.id))||known.has(c.id))continue;
  const row=canonical(c);
  if(validatedPublicApis([row]).length!==1){failed++;continue}
  checked++;
  try{
   const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);
   let response;
   try{response=await fetcher(row.url,{signal:controller.signal,redirect:'error',headers:{'User-Agent':'OpenShelf-PublicAPI-Indexer/1.0'}})}
   finally{clearTimeout(timer)}
   if(!response.ok||!String(response.headers.get('content-type')||'').includes('text/html'))throw Error('Invalid official HTML response');
   const html=await response.text();
   if(!pageMatches(html,row))throw Error('Official name/provider mismatch');
   currentRows.push(row);known.add(row.id);added++;
  }catch(e){failed++;console.warn('Skip unverified API',c.id,String(e.message||e))}
 }
 if(added)await write(sourceFile,JSON.stringify({...current,scope:'verified-curated',items:currentRows},null,2)+'\\n');
 console.log(JSON.stringify({checked,added,failed,total:currentRows.length}));
 return {checked,added,failed,total:currentRows.length};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href)await updatePublicApis();
