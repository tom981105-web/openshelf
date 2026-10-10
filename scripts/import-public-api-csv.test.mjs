import assert from 'node:assert/strict';
import {parseCsv,extractOfficialApiCandidates} from './import-public-api-csv.mjs';
const csv='\uFEFF목록키,목록유형,목록명,제공기관,목록 URL\r\n'+
'15123456,API,"테스트, API",한국기관,https://www.data.go.kr/data/15123456/openapi.do\r\n'+
'15123457,파일,파일,기관,https://www.data.go.kr/data/15123457/openapi.do\r\n'+
'15123458,API,"여러\n줄 설명",기관,https://www.data.go.kr/data/15123458/openapi.do\r\n'+
'15123459,API,조작 링크,기관,https://example.com/data/15123459/openapi.do\r\n'+
'15123460,API,잘못된 ID,기관,https://www.data.go.kr/data/15123461/openapi.do\r\n';
assert.equal(parseCsv(csv).length,6);
let out=extractOfficialApiCandidates(csv);
assert.equal(out.records.length,2);assert.equal(out.stats.apiRows,4);
assert.equal(out.records[0].name,'테스트, API');assert.equal(out.records[1].name,'여러\n줄 설명');
assert.equal(out.records[0].verification,'metadata-only');
assert.equal(extractOfficialApiCandidates(csv,['15123456']).records.length,1);
assert.throws(()=>extractOfficialApiCandidates('foo,bar\n1,2'),/Missing required/);
assert.throws(()=>parseCsv('a,b\n"bad'),/Unclosed/);
console.log('Official bulk CSV import tests passed');
