import fs from 'node:fs/promises';
import {parseCsv} from './import-public-api-csv.mjs';

const FIELDS=['목록키','목록유형','목록명','제공기관','분류체계','설명','확장자(데이터포맷)','심의 유형','목록 URL'];
export function csvToApis(csv){
 const rows=parseCsv(csv);if(rows.length<2)throw Error('Official CSV is empty');
 const headers=rows.shift().map(s=>s.trim());
 const col=Object.fromEntries(FIELDS.map(f=>[f,headers.indexOf(f)]));
 if(Object.values(col).some(i=>i<0))throw Error('Official CSV schema changed');
 const seen=new Set(),out=[];let invalid=0,apiCount=0;
 for(const row of rows){
  if(row[col['목록유형']]!=='API')continue;
  apiCount++;
  const id=String(row[col['목록키']]||'').trim();
  const url=String(row[col['목록 URL']]||'').trim();
  if(!/^[0-9]{7,8}$/.test(id)||!url.startsWith('https://www.data.go.kr/data/'+id+'/openapi.do')||seen.has(id)){invalid++;continue}
  const name=String(row[col['목록명']]||'').trim(),provider=String(row[col['제공기관']]||'').trim();
  if(!name||!provider){invalid++;continue}
  seen.add(id);
  out.push({id,name,provider,category:String(row[col['분류체계']]||'').trim()||'미분류',
   summary:String(row[col['설명']]||'').trim().slice(0,600)||name,
   format:String(row[col['확장자(데이터포맷)']]||'').trim()||'원문 확인',
   approval:String(row[col['심의 유형']]||'').match(/운영단계\s*:\s*(자동승인|심의승인)/)?.[1]||'원문 확인',
   url:'https://www.data.go.kr/data/'+id+'/openapi.do'});
 }
 if(apiCount<10000||out.length!==apiCount||invalid)throw Error('Rejecting incomplete/duplicate official API CSV: '+out.length+'/'+apiCount);
 return out;
}
export function compareApis(oldItems,newItems){
 const before=new Map(oldItems.map(x=>[x.id,x])),after=new Map(newItems.map(x=>[x.id,x]));
 const added=[],modified=[],removed=[];
 for(const x of newItems){const previous=before.get(x.id);if(!previous)added.push(x.id);else if(JSON.stringify(previous)!==JSON.stringify(x))modified.push(x.id)}
 for(const x of oldItems)if(!after.has(x.id))removed.push(x.id);
 return {added,modified,removed};
}
export function validateUpdate(oldItems,nextItems,diff){
 if(nextItems.length<Math.floor(oldItems.length*0.95))throw Error('Abnormally large API catalog shrink; manual review required');
 if(diff.removed.length>Math.max(100,Math.floor(oldItems.length*0.02)))throw Error('Too many removed APIs; manual review required');
 if(nextItems.length>20000)throw Error('Excessive API catalog size');
}
export async function refresh({csvPath,snapshot,root='data'}){
 if(!csvPath||!/^20\d{2}-\d{2}-\d{2}$/.test(snapshot||''))throw Error('Usage: node scripts/update-public-api-csv.mjs SOURCE.csv YYYY-MM-DD');
 const manifest=JSON.parse(await fs.readFile(root+'/public-api-official-list.json','utf8'));
 if(manifest.verification!=='metadata-only'||!Array.isArray(manifest.parts))throw Error('Invalid existing manifest');
 if(snapshot<manifest.snapshot)throw Error('Refusing older snapshot');
 const current=(await Promise.all(manifest.parts.map(async p=>{
  if(!/^public-api-csv\/part-\d{2}\.json$/.test(p))throw Error('Invalid existing shard path');
  const part=JSON.parse(await fs.readFile(root+'/'+p,'utf8'));
  return part.items;
 }))).flat();
 if(new Set(current.map(x=>x.id)).size!==manifest.total)throw Error('Corrupt existing catalog');
 const next=csvToApis(await fs.readFile(csvPath,'utf8'));
 const change=compareApis(current,next);
 validateUpdate(current,next,change);
 const report={previous:manifest.snapshot,snapshot,old:current.length,next:next.length,counts:{added:change.added.length,modified:change.modified.length,removed:change.removed.length},...change};
 if(!change.added.length&&!change.modified.length&&!change.removed.length){console.log('PUBLIC_API_V20_REPORT='+JSON.stringify(report));return report}
 const parts=[];
 for(let i=0;i<next.length;i+=1000){
  const p='public-api-csv/part-'+String(parts.length+1).padStart(2,'0')+'.json';
  parts.push(p);
  await fs.writeFile(root+'/'+p,JSON.stringify({source:'official-portal-csv',snapshot,verification:'metadata-only',items:next.slice(i,i+1000)})+'\n');
 }
 for(const old of manifest.parts)if(!parts.includes(old))await fs.unlink(root+'/'+old);
 await fs.writeFile(root+'/public-api-official-list.json',JSON.stringify({...manifest,snapshot,total:next.length,parts},null,2)+'\n');
 await fs.writeFile(root+'/public-api-update-report.json',JSON.stringify(report,null,2)+'\n');
 console.log('PUBLIC_API_V20_REPORT='+JSON.stringify(report));
 return report;
}
if(process.argv[1]?.endsWith('/update-public-api-csv.mjs'))await refresh({csvPath:process.argv[2],snapshot:process.argv[3]});
