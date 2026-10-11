import assert from 'node:assert/strict';import fs from 'node:fs';
import {filterFacets,facetOptions,filterResults,sortResults} from '../unified-search-core.mjs';
const rows=[
 {type:'api',id:'15000001',name:'서울 교통 API',provider:'서울시',category:'교통',format:'JSON/XML',summary:'버스'},
 {type:'file',id:'15000002',name:'서울 교통 통계',provider:'서울시',category:'교통',format:'CSV, XLSX',summary:'버스'},
 {type:'file',id:'15000003',name:'환경 파일',provider:'환경부',category:'환경',format:'CSV',summary:'대기'}
];
assert.deepEqual(filterFacets(rows,{provider:'서울시'}).map(x=>x.id),['15000001','15000002']);
assert.deepEqual(filterFacets(rows,{provider:'서울시',category:'교통',format:'CSV'}).map(x=>x.id),['15000002']);
assert.deepEqual(filterFacets(rows,{format:'XLSX'}).map(x=>x.id),['15000002']);
assert.deepEqual(filterFacets(rows,{format:'JSON'}).map(x=>x.id),['15000001']);
assert.equal(filterFacets(rows,{provider:'환경부',format:'JSON'}).length,0);
assert.deepEqual(facetOptions(rows,'provider').map(x=>x.value),['서울시','환경부']);
assert.equal(facetOptions(rows,'format').find(x=>x.value==='CSV').count,2);
assert.deepEqual(sortResults(filterFacets(filterResults(rows,'교통'),{format:'CSV'}),'relevance').map(x=>x.id),['15000002']);
const html=fs.readFileSync('unified-search.html','utf8');
for(const id of ['providerFacet','categoryFacet','formatFacet','clearFacets'])assert.ok(html.includes('id="'+id+'"'));
console.log('V37 combined catalogue facet tests passed');