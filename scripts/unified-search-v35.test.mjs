import assert from 'node:assert/strict';import {rank,filterResults} from '../unified-search-core.mjs';
const rows=[
 {type:'api',id:'15000001',name:'전국 버스 노선',provider:'교통공사',category:'교통',summary:'노선 상세'},
 {type:'api',id:'15000002',name:'노선 안내',provider:'버스 운영',category:'교통',summary:'전국 버스'},
 {type:'file',id:'15000003',name:'교통 통계',provider:'국가기관',category:'버스·교통',summary:'월별'},
 {type:'tool',id:'tool-a',name:'자료 분석',category:'개발',description:'버스 자료 처리'}
];
assert.equal(filterResults(rows,'전국 버스')[0].id,'15000001','name phrase must win');
assert.equal(filterResults(rows,'15000002')[0].id,'15000002','exact ID must win');
assert.equal(filterResults(rows,'버스').length,4,'category search should work alongside provider');
assert.equal(rank(rows[2],'버스')>rank(rows[3],'버스'),true,'category outranks summary');
assert.equal(filterResults(rows,'버스','file').length,1);
assert.equal(filterResults(rows,'없는자료').length,0);
assert.equal(filterResults(rows,'전국 버스')[0],rows[0]);
console.log('V35 relevance ranking checks passed');
