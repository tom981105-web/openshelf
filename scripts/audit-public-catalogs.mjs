import fs from 'node:fs/promises';
import path from 'node:path';
const CATALOGS=[
 {type:'api',manifest:'public-api-official-list.json',prefix:'public-api-csv',suffix:'openapi.do',min:10000,max:20000},
 {type:'file',manifest:'public-data-official-list.json',prefix:'public-data-csv',suffix:'fileData.do',min:80000,max:120000}
];
const issue=(issues,kind,type,id,detail)=>issues.push({severity:kind,type,id:String(id||''),detail});
export async function auditCatalog(root,config){
 const issues=[],manifest=JSON.parse(await fs.readFile(path.join(root,config.manifest),'utf8'));
 const stats={type:config.type,expected:manifest.total,actual:0,parts:manifest.parts?.length||0,duplicates:0,invalidLinks:0,missingFields:0};
 if(manifest.verification!=='metadata-only'||!Array.isArray(manifest.parts)||!Number.isInteger(manifest.total))throw Error('Invalid manifest '+config.type);
 const seen=new Set();
 for(const part of manifest.parts){
  if(!new RegExp('^'+config.prefix+'/part-[0-9]{2,3}\\.json$').test(part)){issue(issues,'error',config.type,'', 'Invalid shard path '+part);continue}
  let shard;
  try{shard=JSON.parse(await fs.readFile(path.join(root,part),'utf8'))}catch(error){issue(issues,'error',config.type,'','Missing or unreadable shard '+part);continue}
  if(shard.verification!=='metadata-only'||!Array.isArray(shard.items)||shard.items.length>1000){issue(issues,'error',config.type,'','Invalid shard data '+part);continue}
  for(const row of shard.items){
   stats.actual++;
   const id=String(row?.id||'');
   if(seen.has(id)){stats.duplicates++;issue(issues,'error',config.type,id,'Duplicate ID')}
   seen.add(id);
   if(!/^\d{7,8}$/.test(id)||row.url!=='https://www.data.go.kr/data/'+id+'/'+config.suffix){stats.invalidLinks++;issue(issues,'error',config.type,id,'Invalid official URL or ID')}
   const required=config.type==='api'?['name','provider','category','summary','format','approval']:['name','provider','category','summary','format'];
   if(required.some(field=>typeof row[field]!=='string'||!row[field].trim())){stats.missingFields++;issue(issues,'error',config.type,id,'Required metadata missing')}
  }
 }
 if(stats.actual!==manifest.total)issue(issues,'error',config.type,'','Count mismatch: '+stats.actual+'/'+manifest.total);
 if(stats.actual<config.min||stats.actual>config.max)issue(issues,'error',config.type,'','Unusual catalog size');
 return {stats,issues};
}
export async function runAudit(root='data'){
 const outcomes=await Promise.all(CATALOGS.map(c=>auditCatalog(root,c)));
 const issues=outcomes.flatMap(x=>x.issues);
 return {generatedAt:new Date().toISOString(),source:'local-catalog-metadata',checks:'structural only; network availability not verified',summary:outcomes.map(x=>x.stats),totals:{errors:issues.length},issues:issues.slice(0,500),truncated:issues.length>500};
}
if(process.argv[1]?.endsWith('audit-public-catalogs.mjs')){
 const result=await runAudit(process.argv[2]||'data');
 const output=process.argv[3];
 if(output)await fs.writeFile(output,JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({summary:result.summary,errors:result.totals.errors,truncated:result.truncated}));
 if(result.totals.errors)process.exitCode=1;
}
