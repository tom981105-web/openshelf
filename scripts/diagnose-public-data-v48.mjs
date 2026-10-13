import fs from 'node:fs/promises';
import path from 'node:path';
import {sampleCatalog} from './audit-public-data-v46.mjs';
const norm=x=>String(x||'').replace(/&amp;/g,'&').slice(0,500);
export function analyzePage(html){
 const cleaned=String(html).slice(0,750000);
 const links=[...cleaned.matchAll(/<(?:a|button|form|input)\b[^>]{0,1200}>/gi)].map(x=>x[0]);
 const clues=links.filter(x=>/(download|다운로드|첨부파일|fileDown|fileData|fileId|atch|file_seq)/i.test(x)).slice(0,15)
  .map(x=>norm(x.replace(/\b(value|token|key|auth|password|nonce|csrf)[\s]*=[\s]*(['"])[\s\S]*?\2/gi,'$1="[REDACTED]"')));
 const scripts=[...cleaned.matchAll(/<script\b[^>]*src=["']([^"']+)["']/gi)].map(x=>norm(x[1])).filter(x=>!x.includes('?')).slice(0,20);
 const forms=[...cleaned.matchAll(/<form\b[^>]*>/gi)].map(x=>norm(x[0])).slice(0,10);
 const jsHandlers=[...cleaned.matchAll(/(?:onclick|data-action)=["']([^"']{1,160})["']/gi)].map(x=>norm(x[1])).filter(x=>/down|file|attach/i.test(x)).slice(0,10);
 return {hasDownloadText:/다운로드|download/i.test(cleaned),possibleControls:clues,scriptPaths:scripts,forms,handlerHints:jsHandlers,downloadUrlConfirmed:false};
}
export async function inspectPage(item,{fetcher=fetch}={}){
 const url='https://www.data.go.kr/data/'+item.id+'/fileData.do';
 const out={id:item.id,officialUrl:url,status:'unknown',diagnostic:null};
 try{
  const response=await fetcher(url,{redirect:'manual',signal:AbortSignal.timeout(12000),headers:{accept:'text/html'}});
  out.httpStatus=response.status;
  if(!response.ok||response.status>=300&&response.status<400){out.status='not_accessible';await response.body?.cancel();return out}
  if(!(response.headers.get('content-type')||'').includes('html')){out.status='unexpected_content';await response.body?.cancel();return out}
  // Diagnostic-only bounded HTML; no downloader or javascript execution.
  const reader=response.body?.getReader();if(!reader){out.status='empty';return out}
  let total=0,html='';const decoder=new TextDecoder();
  try{while(total<400000){const next=await reader.read();if(next.done)break;const chunk=next.value.slice(0,400000-total);total+=chunk.length;html+=decoder.decode(chunk,{stream:true})}}finally{await reader.cancel().catch(()=>{})}
  out.status='page_inspected';out.diagnostic=analyzePage(html);return out;
 }catch(e){out.status='network_error';out.errorType=e?.name||'Error';return out}
}
export async function run({fetcher=fetch,count=10,output='audit-output/public-data-v48-diagnostics.json'}={}){
 const {manifest,selected}=await sampleCatalog(process.cwd(),Math.min(100,Math.max(1,count)));
 const results=[];for(const item of selected.slice(0,10))results.push(await inspectPage(item,{fetcher}));
 const report={generatedAt:new Date().toISOString(),catalogTotal:manifest.total,checked:results.length,verifiedDownloadLinks:0,note:'Diagnostic HTML evidence only; never assume download succeeds',results};
 await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({checked:report.checked,inspected:results.filter(x=>x.status==='page_inspected').length,verifiedDownloadLinks:0,output}));
 return report;
}
if(import.meta.url===new URL('file://'+process.argv[1]).href)await run();
