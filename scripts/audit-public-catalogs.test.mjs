import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
import {auditCatalog,runAudit} from './audit-public-catalogs.mjs';
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'openshelf-v29-'));
const base={type:'api',manifest:'manifest.json',prefix:'public-api-csv',suffix:'openapi.do',min:1,max:100};
try{
 await fs.mkdir(path.join(temp,'public-api-csv'));
 await fs.writeFile(path.join(temp,'manifest.json'),JSON.stringify({total:2,verification:'metadata-only',parts:['public-api-csv/part-01.json']}));
 const item={id:'15000001',name:'Name',provider:'Agency',category:'Category',summary:'Description',format:'JSON',approval:'자동승인',url:'https://www.data.go.kr/data/15000001/openapi.do'};
 await fs.writeFile(path.join(temp,'public-api-csv/part-01.json'),JSON.stringify({verification:'metadata-only',items:[item,{...item}]}));
 const result=await auditCatalog(temp,base);
 assert.equal(result.stats.duplicates,1);assert.equal(result.issues.filter(x=>x.detail==='Duplicate ID').length,1);
 await fs.writeFile(path.join(temp,'public-api-csv/part-01.json'),JSON.stringify({verification:'metadata-only',items:[item,{...item,id:'15000002',url:'https://wrong.example'}]}));
 const invalid=await auditCatalog(temp,base);assert.equal(invalid.stats.invalidLinks,1);
 const prod=await runAudit('data');
 assert.equal(prod.totals.errors,0,'Production catalogs must pass quality audit');
 assert.deepEqual(prod.summary.map(s=>s.actual),[12027,86411]);
 console.log('V29 data quality audit tests passed');
}finally{await fs.rm(temp,{recursive:true,force:true})}
