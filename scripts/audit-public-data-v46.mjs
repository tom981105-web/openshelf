import fs from 'node:fs/promises';
import path from 'node:path';

export function sampleCatalog(root,limit=100){
 return fs.readFile(path.join(root,'data/public-data-official-list.json'),'utf8').then(async raw=>{
  const manifest=JSON.parse(raw);
  if(!Number.isInteger(manifest.total)||manifest.total<1||!Array.isArray(manifest.parts))throw Error('invalid manifest');
  const positions=Array.from({length:Math.min(limit,manifest.total)},(_,i)=>Math.floor((i+0.5)*manifest.total/Math.min(limit,manifest.total)));
  let cursor=0,next=0;const selected=[];
  for(const part of manifest.parts){
   if(!/^public-data-csv\/part-[0-9]{2,3}\.json$/.test(part))throw Error('unsafe shard path');
   const shard=JSON.parse(await fs.readFile(path.join(root,'data',part),'utf8'));
   if(!Array.isArray(shard.items))throw Error('invalid shard');
   while(next<positions.length&&positions[next]<cursor+shard.items.length){
    const item=shard.items[positions[next]-cursor];
    if(!/^\d{7,8}$/.test(String(item?.id))||!item?.name)throw Error('invalid sample item');
    selected.push({id:String(item.id),name:String(item.name),provider:item.provider||'',format:item.format||'',url:item.url||'',category:item.category||''});next++;
   }
   cursor+=shard.items.length;
  }
  if(cursor!==manifest.total||selected.length!==positions.length||new Set(selected.map(x=>x.id)).size!==selected.length)throw Error('catalog size or sample mismatch');
  return {manifest,selected};
 });
}
export function classifyResponse(response,url,content=''){
 const type=(response.headers.get('content-type')||'').toLowerCase();
 const size=Number(response.headers.get('content-length')||0);
 const finalUrl=response.url||url;
 const isOfficial=/^https:\/\/([a-z0-9-]+\.)*data\.go\.kr\//i.test(finalUrl);
 const isHtml=type.includes('text/html')||/<(?:!doctype html|html[\s>])/i.test(content.slice(0,1500));
 const fileType=/(?:csv|spreadsheet|excel|pdf|zip|octet-stream|json|xml|text\/plain)/i.test(type);
 if(!response.ok)return {status:'http_error',httpStatus:response.status,sizeBytes:null,mime:type};
 if(!isOfficial)return {status:'external_redirect_unverified',httpStatus:response.status,sizeBytes:null,mime:type};
 if(isHtml)return {status:'landing_page_only',httpStatus:response.status,sizeBytes:null,mime:type};
 return {status:fileType?'possible_file_response':'unknown_content',httpStatus:response.status,sizeBytes:Number.isFinite(size)&&size>0?size:null,mime:type};
}
export async function inspectItem(item,{fetcher=fetch,timeout=12000}={}){
 const url='https://www.data.go.kr/data/'+item.id+'/fileData.do';
 const output={...item,officialUrl:url,status:'not_checked',httpStatus:null,mime:null,sizeBytes:null,notes:''};
 try{
  const response=await fetcher(url,{method:'GET',redirect:'manual',headers:{accept:'text/html,application/xhtml+xml'},signal:AbortSignal.timeout(timeout)});
  const type=(response.headers.get('content-type')||'').toLowerCase();
  if(response.status>=300&&response.status<400){
   output.status='redirect_unverified';output.httpStatus=response.status;output.notes='Redirect is not interpreted as an accessible file';return output;
  }
  if(!response.ok){output.status='http_error';output.httpStatus=response.status;return output}
  // Read at most 128 KiB. This is an HTML discovery probe, not a bulk file downloader.
  let html='';if(type.includes('html')&&response.body){
   const reader=response.body.getReader(),decoder=new TextDecoder();let read=0;
   try{while(read<131072){const part=await reader.read();if(part.done)break;const bytes=part.value.slice(0,131072-read);read+=bytes.byteLength;html+=decoder.decode(bytes,{stream:true})}}finally{await reader.cancel().catch(()=>{})}
  }else{await response.body?.cancel().catch(()=>{})}
  Object.assign(output,classifyResponse(response,url,html));
  const candidates=[...html.matchAll(/(?:href|data-url)\s*=\s*["']([^"'<>]+\.(?:csv|xlsx?|pdf|json|xml|zip)(?:\?[^"'<>]*)?)["']/gi)]
   .map(match=>{try{return new URL(match[1].replaceAll('&amp;','&'),url)}catch{return null}})
   .filter(link=>link&&link.protocol==='https:'&&link.hostname==='www.data.go.kr')
   .slice(0,5);
  if(candidates.length){output.notes='Possible download links in page markup; not downloaded or verified';output.candidateLinks=candidates.map(x=>x.href)}
  return output;
 }catch(e){output.status=e.name==='TimeoutError'||e.name==='AbortError'?'timeout':'network_error';output.notes=String(e.name||'NetworkError');return output}
}
export async function audit(sample,{fetcher=fetch,concurrency=4,timeout=12000}={}){
 const out=Array(sample.length);let cursor=0;
 await Promise.all(Array.from({length:Math.max(1,Math.min(concurrency,8))},async()=>{while(cursor<sample.length){const i=cursor++;out[i]=await inspectItem(sample[i],{fetcher,timeout})}}));
 const statuses={};for(const result of out)statuses[result.status]=(statuses[result.status]||0)+1;
 return {createdAt:new Date().toISOString(),sampleSize:sample.length,verifiedRawFiles:0,scope:'Landing page accessibility and unverified download-link evidence; no raw file download or availability guarantee',statuses,results:out};
}
export async function main(){
 const root=process.cwd();const count=Math.min(100,Math.max(1,Number(process.env.SAMPLE_SIZE||100)));
 const {manifest,selected}=await sampleCatalog(root,count);
 const report=await audit(selected);
 report.catalogTotal=manifest.total;report.catalogSnapshot=manifest.snapshot;
 await fs.mkdir(path.join(root,'audit-output'),{recursive:true});
 await fs.writeFile(path.join(root,'audit-output/public-data-v46-audit.json'),JSON.stringify(report,null,2)+'\n');
 const md=['# OpenShelf V46 공공 파일데이터 실태 조사','',`조사 시각: ${report.createdAt}`,`모집단: ${report.catalogTotal}건 / 표본: ${report.sampleSize}건`,`메타데이터 기준일: ${report.catalogSnapshot}`,'','## 조사 결과','',...Object.entries(report.statuses).map(([k,v])=>'- '+k+': '+v+'건'),'','**주의:** 상세페이지가 열렸다고 원본 다운로드가 가능한 것은 아닙니다. 이 보고서는 파일 원본 크기나 다운로드 성공을 증명하지 않으며, 원본 파일은 다운로드하거나 GitHub에 저장하지 않았습니다.','', '상세 결과는 JSON 아티팩트를 참고하세요.',''];
 await fs.writeFile(path.join(root,'audit-output/public-data-v46-report.md'),md.join('\n'));
 console.log(JSON.stringify({sampleSize:report.sampleSize,statuses:report.statuses,output:'audit-output/'}));
}
if(import.meta.url===new URL('file://'+process.argv[1]).href)await main();
