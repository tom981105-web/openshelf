import assert from 'node:assert/strict';
import {suggestMetadata,applySuggestion} from './gemini-recheck-v51.mjs';
const tool={name:'Test',github:'https://github.com/sample/test',license:'확인 필요',description:'설명',longDescription:'상세'};
const fetcher=async()=>new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({description:'새 설명',license:'MIT'})}]}}]}));
const suggestion=await suggestMetadata(tool,{key:'test',fetcher});
const next=applySuggestion(tool,suggestion);
assert.equal(next.description,'새 설명');assert.equal(next.license,'확인 필요');
console.log('Gemini recheck boundaries passed');
