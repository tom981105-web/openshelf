import fs from 'node:fs/promises';
const ORIGIN='https://www.data.go.kr';
const PAGE=ORIGIN+'/data/15062804/fileData.do';
const SELECT=ORIGIN+'/tcs/dss/selectFileDataDownload.do';
const DOWNLOAD=ORIGIN+'/cmm/cmm/fileDownload.do';
export function findDetailIds(html){
 const ids=[...new Set((String(html).match(/uddi:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi)||[]))];
 return ids;
}
export function parseAttachment(response){
 if(!response||response.status!==true)throw Error('Official attachment lookup did not succeed');
 const id=response.atchFileId||response.fileDataRegistVO?.atchFileId;
 const sn=response.fileDetailSn||response.fileDataRegistVO?.fileDetailSn;
 if(!/^FILE_[A-Za-z0-9_]+$/.test(String(id||''))||!(/^[0-9]+$/.test(String(sn||''))))throw Error('Missing official CSV attachment file ID');
 const extension=String(response.fileDataRegistVO?.atchFileExtsn||'').toLowerCase();
 if(extension&&extension!=='csv')throw Error('Official file is not CSV');
 const name=String(response.fileDataRegistVO?.orginlFileNm||response.fileDataRegistVO?.dataNm||'');
 return {id,sn:String(sn),name};
}
export function acceptSingleAttachment(current,next){
 if(current)throw Error('Ambiguous multiple CSV attachments; manual review needed');
 return next;
}
export function isCsv(bytes){
 if(bytes.length<1000000||bytes.length>350000000)throw Error('Unexpected downloaded CSV size');
 const head=bytes.subarray(0,10240).toString('utf8').replace(/^\uFEFF/,'');
 if(/<!doctype|<html|<script|^\s*\{/.test(head.toLowerCase()))throw Error('Downloaded response is HTML/JSON, not CSV');
 for(const field of ['목록키','목록유형','목록명','제공기관'])if(!head.includes(field))throw Error('Missing official CSV field '+field);
 return true;
}
async function get(url,opts={}){
 const response=await fetch(url,{signal:AbortSignal.timeout(300000),redirect:'follow',headers:{'User-Agent':'OpenShelf-public-catalog-updater/1.0','Referer':PAGE,...opts.headers},...opts});
 if(!response.ok)throw Error('Official source HTTP '+response.status);
 if(new URL(response.url).origin!==ORIGIN)throw Error('Unexpected redirect origin');
 return response;
}
export async function downloadOfficialCsv(output,config={}){
 if(!output)throw Error('Output path required');
 const page=await (await get(PAGE)).text();
 const ids=findDetailIds(page);
 if(!ids.length)throw Error('Could not discover latest detail ID from official page; no stale ID fallback');
 if(ids.length>20)throw Error('Ambiguous official file ID list');
 let chosen=null,reason='';
 for(const detail of ids){
  try{
   const url=new URL(SELECT);
   for(const [k,v] of Object.entries({publicDataDetailPk:detail,publicDataPk:'15062804',atchFileId:'',fileDetailSn:'1',publicDataTyCode:'PR0051',url:'/tcs/dss/selectFileDataDownload.do'}))url.searchParams.set(k,v);
   const response=await get(url.href,{headers:{Accept:'application/json'}});
   const info=parseAttachment(await response.json());
   chosen=acceptSingleAttachment(chosen,info);
  }catch(error){
   if(String(error.message||error).includes('Ambiguous multiple CSV attachments'))throw error;
   reason=String(error.message||error);
  }
 }
 if(!chosen)throw Error('Official attachment lookup unsuccessful: '+reason);
 const url=new URL(DOWNLOAD);
 for(const [k,v] of Object.entries({atchFileId:chosen.id,fileDetailSn:chosen.sn,dataNm:chosen.name}))url.searchParams.set(k,v);
 const result=await get(url.href);
 const bytes=Buffer.from(await result.arrayBuffer());
 isCsv(bytes);
 await fs.writeFile(output,bytes);
 console.log(JSON.stringify({downloaded:true,bytes:bytes.length,attachment:chosen.id,output}));
}
export async function probeOfficialSource(){
 const html=await (await get(PAGE)).text();
 const ids=findDetailIds(html);
 if(!ids.length)throw Error('Official page did not reveal current file detail ID');
 const url=new URL(SELECT);
 for(const [k,v] of Object.entries({publicDataDetailPk:ids[0],publicDataPk:'15062804',atchFileId:'',fileDetailSn:'1',publicDataTyCode:'PR0051',url:'/tcs/dss/selectFileDataDownload.do'}))url.searchParams.set(k,v);
 const info=parseAttachment(await (await get(url.href,{headers:{Accept:'application/json'}})).json());
 console.log(JSON.stringify({source:PAGE,foundDetailIds:ids.length,attachmentConfirmed:true,extension:info.name.slice(-4)}));
}
if(process.argv[1]?.endsWith('/download-official-catalog-csv.mjs')){
 if(process.argv[2]==='--probe')await probeOfficialSource();
 else await downloadOfficialCsv(process.argv[2]);
}
