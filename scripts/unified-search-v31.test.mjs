import assert from 'node:assert/strict';import fs from 'node:fs';import {filterResults,makeUrl} from '../unified-search-core.mjs';
const code=fs.readFileSync('unified-search.js','utf8');
assert.match(code,/AbortController/);assert.match(code,/controller\.abort\(\),20000/);assert.match(code,/verification!=='metadata-only'/);assert.match(code,/duplicate mismatch/);assert.match(code,/previousSuggestionsKey/);assert.match(code,/pending\.has\(type\)/);
const records=[{id:'15000001',type:'api',name:'교통정보',provider:'기관',summary:'버스 데이터'},{id:'15000002',type:'file',name:'버스정보',provider:'기관',summary:'노선'}];
assert.equal(filterResults(records,'버스').length,2);assert.equal(makeUrl(records[0]),'public-api.html?api=15000001');
console.log('V31 stability regression passed');