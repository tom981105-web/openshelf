import assert from 'node:assert/strict';import {normalize,rank,filterResults,makeUrl} from '../unified-search-core.mjs';
const rows=[{type:'tool',id:'hello',name:'PDF 도구',description:'무료 변환',category:'문서'},{type:'api',id:'15000001',name:'전국 버스 API',provider:'국토교통부',summary:'교통 정보'},{type:'file',id:'15000002',name:'전국 버스 목록',provider:'국토교통부',summary:'공공 파일'}];
assert.equal(normalize(' ＰＤＦ  도구 '),'pdf 도구');assert.equal(filterResults(rows,'버스').length,2);assert.equal(filterResults(rows,'버스','api').length,1);assert.equal(filterResults(rows,'국토교통부 버스').length,2);assert.equal(filterResults(rows,'존재하지않음').length,0);assert.equal(filterResults(rows,'pdf')[0].type,'tool');assert.ok(rank(rows[1],'전국 버스')>rank(rows[1],'교통'));assert.equal(makeUrl(rows[1]),'public-api.html?api=15000001');assert.equal(makeUrl(rows[2]),'public-data.html?file=15000002');assert.equal(makeUrl(rows[0]),'index.html?tool=hello');console.log('V27 unified search regression passed');

// V28: repeated queries keep the exact V27 ordering and original source rows.
const first=filterResults(rows,'버스');assert.deepEqual(filterResults(rows,'버스'),first);assert.strictEqual(first[0],rows[1]);
console.log('V28 cached normalization regression passed');
