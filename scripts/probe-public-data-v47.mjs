import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const MAX_BYTES=2*1024*1024;
const EXT=/\.(csv|xlsx|xls)(?:$|\?)/i;
export function verifyCandidate(raw){
 const u=new URL(raw);
 if(u.protocol!=='https:'||u.username||u.password||u.port||!['www.data.go.kr','data.go.kr'].includes(u.hostname))throw Error('허용되지 않은 다운로드 주소');
 if(!EXT.test(u.pathname))throw Error('CSV 또는 Excel 직접 링크만 허용');
 return u.href;
}
export function sniff(bytes,url,mime=''){
 const extension=new URL(url).pathname.split('.').pop().toLowerCase();
 const magic=bytes.slice(0,8);
 const begins=String.fromCharCode(...bytes.slice(0,Math.min(bytes.length,80))).trimStart().toLowerCase();
 if(begins.startsWith('<!doctype')||begins.startsWith('<html')||begins.startsWith('<?xml'))return 'html_or_xml';
 if(extension==='xlsx')return magic[0]===0x50&&magic[1]===0x4b?'xlsx_zip_signature':'unverified';
 if(extension==='xls')return magic[0]===0xd0&&magic[1]===0xcf&&magic[2]===0x11&&magic[3]===0xe0?'xls_ole_signature':'unverified';
 if(extension==='csv'&&!bytes.includes(0)&&!mime.includes('html'))return 'csv_text_candidate';
 return 'unverified';
}
export async function probe(candidate,{fetcher=fetch,maxBytes=MAX_BYTES}={}){
 const url=verifyCandidate(candidate.url);
 const report={id:String(candidate.id),url,status:'not_checked',bytes:null,kind:null,httpStatus:null};
 const response=await fetcher(url,{redirect:'manual',signal:AbortSignal.timeout(12000),headers:{accept:'text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/octet-stream'}});
 report.httpStatus=response.status;
 if(response.status>=300&&response.status<400){report.status='redirect_unverified';return report}
 if(!response.ok){report.status='http_error';return report}
 const declared=Number(response.headers.get('content-length')||0);
 if(declared>maxBytes){report.status='too_large';report.bytes=declared;await response.body?.cancel();return report}
 const chunks=[];let total=0;
 if(!response.body){report.status='empty';return report}
 const reader=response.body.getReader();
 try{
  while(true){const next=await reader.read();if(next.done)break;total+=next.value.byteLength;
   if(total>maxBytes){report.status='too_large';return report}
   chunks.push(next.value);
  }
 }finally{await reader.cancel().catch(()=>{})}
 const data=new Uint8Array(total);let offset=0;
 for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.byteLength}
 report.bytes=total;report.kind=sniff(data,url,(response.headers.get('content-type')||'').toLowerCase());
 report.status=report.kind==='html_or_xml'?'not_a_file':report.kind==='unverified'?'unverified_format':'download_verified';
 return report;
}
export function candidatesFromAudit(report,limit=20){
 if(!Array.isArray(report?.results))throw Error('유효한 V46 보고서가 필요합니다');
 const candidates=[];
 for(const item of report.results){
  if(!/^\d{7,8}$/.test(String(item.id)))continue;
  for(const url of item.candidateLinks||[]){
   try{candidates.push({id:String(item.id),url:verifyCandidate(url)})}catch{}
   if(candidates.length>=limit)return candidates;
  }
 }
 return candidates;
}
export async function run({input='audit-output/public-data-v46-audit.json',output='audit-output/public-data-v47-report.json',fetcher=fetch}={}){
 const report=JSON.parse(await fs.readFile(input,'utf8'));
 const candidates=candidatesFromAudit(report,20);
 const results=[];
 for(const item of candidates){
  try{results.push(await probe(item,{fetcher}))}catch(e){results.push({id:item.id,url:item.url,status:'network_or_timeout',errorType:e?.name||'Error'})}
 }
 const summary={generatedAt:new Date().toISOString(),source:'V46 candidate links only',limitBytes:MAX_BYTES,checked:results.length,verified:results.filter(x=>x.status==='download_verified').length,results};
 await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify(summary,null,2)+'\n');
 console.log(JSON.stringify({checked:summary.checked,verified:summary.verified,report:output}));
 return summary;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1]))await run();
