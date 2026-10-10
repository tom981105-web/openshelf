import {discoverIds,searchUrl,parseOfficialDetail} from './discover-public-apis.mjs';
const base='https://www.data.go.kr';
const maxBytes=4_000_000;
export function diagnoseListing(html){
 const ids=discoverIds(html);
 return {htmlBytes:Buffer.byteLength(html,'utf8'),apiIdCount:ids.length,
  signals:{openApiTab:/오픈\s*API|오픈API/.test(html),datasetList:/데이터목록|데이터 목록/.test(html),javascriptLinks:/fn_datasetDetail|goDatasetDetail|onclick/.test(html)},
  discoveredIds:ids.slice(0,10)};
}
export async function probeOfficialCatalog({fetcher=fetch}={}){
 const url=searchUrl(1),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 const started=Date.now();
 try{
  const r=await fetcher(url,{signal:controller.signal,redirect:'error',headers:{'User-Agent':'OpenShelf-public-api-diagnostic/1.0'}});
  const type=r.headers?.get('content-type')||'';
  if(!r.ok||!type.includes('text/html'))return {ok:false,reason:'unexpected response',status:r.status,contentType:type};
  const html=await r.text();
  if(html.length>maxBytes)return {ok:false,reason:'oversized listing'};
  const signals=diagnoseListing(html);
  const ids=signals.discoveredIds;
  let detail=null;
  if(ids.length){
   const c=new AbortController(),t=setTimeout(()=>c.abort(),10000);
   try{
    const d=await fetcher(base+'/data/'+ids[0]+'/openapi.do',{signal:c.signal,redirect:'error'});
    if(d.ok&&(d.headers.get('content-type')||'').includes('text/html')){
     const body=await d.text();detail={status:d.status,parsed:!!parseOfficialDetail(body,ids[0]),htmlBytes:Buffer.byteLength(body)};
    }else detail={status:d.status,parsed:false};
   }catch(e){detail={error:String(e.message||e).slice(0,120)}}finally{clearTimeout(t)}
  }
  return {ok:true,status:r.status,elapsedMs:Date.now()-started,...signals,detail,compatible:ids.length>0&&!!detail?.parsed};
 }catch(e){return {ok:false,reason:String(e.message||e).slice(0,180)}}
 finally{clearTimeout(timer)}
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const report=await probeOfficialCatalog();
 console.log('OFFICIAL_PUBLIC_API_DIAGNOSTIC '+JSON.stringify(report));
 if(process.env.GITHUB_STEP_SUMMARY){
  const fs=await import('node:fs/promises');
  await fs.appendFile(process.env.GITHUB_STEP_SUMMARY,'### Official Public API listing probe\n\n'+
   '| Field | Value |\n|---|---|\n'+Object.entries(report).map(([k,v])=>'| '+k+' | '+JSON.stringify(v).replace(/\\|/g,'/')+' |').join('\n')+'\n');
 }
}
