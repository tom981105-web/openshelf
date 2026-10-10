import fs from 'node:fs/promises';
import path from 'node:path';

export const OFFICIAL_DATASET='https://www.data.go.kr/data/15062804/fileData.do';
export function parseCsv(text){
 if(typeof text!=='string')throw Error('Expected UTF-8 CSV text');
 const rows=[];let row=[],cell='',quoted=false;
 const input=text.replace(/^\uFEFF/,'');
 for(let i=0;i<input.length;i++){
  const ch=input[i];
  if(ch==='"'){
   if(quoted&&input[i+1]==='"'){cell+='"';i++}
   else if(quoted){quoted=false}
   else if(cell===''){quoted=true}
   else throw Error('Malformed CSV quote');
  }else if(ch===','&&!quoted){row.push(cell);cell=''}
  else if((ch==='\n'||ch==='\r')&&!quoted){
   if(ch==='\r'&&input[i+1]==='\n')i++;
   row.push(cell);if(row.some(v=>v!==''))rows.push(row);row=[];cell='';
  }else cell+=ch;
 }
 if(quoted)throw Error('Unclosed quoted CSV value');
 if(cell!==''||row.length){row.push(cell);rows.push(row)}
 return rows;
}
const normalize=s=>String(s||'').replace(/\s+/g,'').trim();
const select=(record,...headers)=>{
 for(const name of headers)for(const [key,value] of Object.entries(record))if(normalize(key)===normalize(name))return String(value||'').trim();
 return '';
};
export function extractOfficialApiCandidates(text,existingIds=[]){
 const rows=parseCsv(text);if(rows.length<2)throw Error('Missing CSV header/records');
 const headers=rows.shift().map(v=>v.trim());
 const required=['목록키','목록유형','목록명','제공기관'];
 for(const field of required)if(!headers.some(h=>normalize(h)===normalize(field)))throw Error('Missing required official CSV column: '+field);
 const known=new Set([...existingIds].map(String)), result=[];let skipped=0,apiRows=0;
 for(const row of rows){
  if(row.length!==headers.length){skipped++;continue}
  const record=Object.fromEntries(headers.map((h,i)=>[h,row[i]]));
  const kind=select(record,'목록유형');
  if(!/^(API|오픈API|OpenAPI)$/i.test(kind.replace(/\s+/g,'')))continue;
  apiRows++;
  const id=select(record,'목록키'),name=select(record,'목록명'),provider=select(record,'제공기관');
  const sourceUrl=select(record,'목록URL','목록 URL','데이터URL','데이터 URL');
  const match=sourceUrl.match(/^https:\/\/(?:www\.)?data\.go\.kr\/data\/(\d{8})\/openapi\.do(?:\?.*)?$/i);
  if(!/^\d{8}$/.test(id)||!name||!provider||!match||match[1]!==id||known.has(id)){skipped++;continue}
  known.add(id);
  result.push({id,name,provider,sourceUrl:'https://www.data.go.kr/data/'+id+'/openapi.do',source:'official-catalog-csv',verification:'metadata-only'});
 }
 return {records:result,stats:{rows:rows.length,apiRows,accepted:result.length,skipped}};
}
export async function importCsv({csvPath,outputPath='data/public-api-csv-review.json',catalogPath='data/public-apis.json'}){
 if(!csvPath)throw Error('CSV file path required; download the official source yourself');
 const csv=await fs.readFile(csvPath,'utf8');
 const catalog=JSON.parse(await fs.readFile(catalogPath,'utf8'));
 if(!Array.isArray(catalog.items))throw Error('Invalid published catalog');
 const existing=new Set(catalog.items.map(x=>String(x.id)));
 const result=extractOfficialApiCandidates(csv,existing);
 if(!result.records.length)throw Error('No validated API candidates found. Check CSV schema and URL field.');
 const location=path.resolve(outputPath);
 await fs.writeFile(location,JSON.stringify({source:OFFICIAL_DATASET,verification:'metadata-only',...result},null,2)+'\n');
 console.log(JSON.stringify({...result.stats,output:location}));
 return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===new URL(import.meta.url).pathname){
 await importCsv({csvPath:process.argv[2],outputPath:process.argv[3]});
}
