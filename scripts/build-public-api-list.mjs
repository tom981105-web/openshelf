import fs from 'node:fs/promises';
import {parseCsv} from './import-public-api-csv.mjs';
const input=process.argv[2],output=process.argv[3]||'data/public-api-official-list.json';
if(!input)throw Error('Usage: node scripts/build-public-api-list.mjs <official-csv-file> [output]');
const rows=parseCsv(await fs.readFile(input,'utf8'));
const headers=rows.shift().map(v=>v.trim());
const col=(name)=>{const index=headers.indexOf(name);if(index<0)throw Error('Missing CSV column '+name);return index};
const keys=['목록키','목록유형','목록명','제공기관','분류체계','설명','확장자(데이터포맷)','심의 유형','목록 URL'];const ix=Object.fromEntries(keys.map(k=>[k,col(k)]));
const out=[],seen=new Set();let apiRows=0;
for(const row of rows){
 if(row[ix['목록유형']]!=='API')continue;
 apiRows++;
 const id=(row[ix['목록키']]||'').trim();
 const url=(row[ix['목록 URL']]||'').trim();
 if(!/^\d{8}$/.test(id)||!url.startsWith('https://www.data.go.kr/data/'+id+'/openapi.do'))continue;
 if(seen.has(id))continue;
 const name=(row[ix['목록명']]||'').trim(),provider=(row[ix['제공기관']]||'').trim();
 if(!name||!provider)continue;
 seen.add(id);
 const approval=(row[ix['심의 유형']]||'').match(/운영단계\s*:\s*(자동승인|심의승인)/)?.[1]||'원문 확인';
 out.push({id,name,provider,category:(row[ix['분류체계']]||'').trim()||'미분류',
 summary:(row[ix['설명']]||'').trim().slice(0,600)||name,
 format:(row[ix['확장자(데이터포맷)']]||'').trim()||'원문 확인',
 approval,url:'https://www.data.go.kr/data/'+id+'/openapi.do'});
}
if(apiRows<10000||out.length!==apiRows)throw Error('Refusing incomplete API catalog: '+out.length+'/'+apiRows);
const data={source:'official-portal-csv',snapshot:'2026-09-30',verification:'metadata-only',items:out};
await fs.writeFile(output,JSON.stringify(data)+'\n');
console.log(JSON.stringify({apiRows,exported:out.length,bytes:Buffer.byteLength(JSON.stringify(data))}));
