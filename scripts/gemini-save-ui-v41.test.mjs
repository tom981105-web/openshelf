import assert from 'node:assert/strict';import fs from 'node:fs';
for(const path of ['public-data.html','public-api.html']){const html=fs.readFileSync(path,'utf8');const links=html.match(/<a href="unified-search\.html">통합 검색<\/a>/g)||[];assert.equal(links.length,1,path+' should have exactly one unified search link')}
const js=fs.readFileSync('unified-search.js','utf8');
const save=js.slice(js.indexOf("$('geminiSave').addEventListener("),js.indexOf("$('geminiUnlock').addEventListener("));
assert.match(save,/await savePrivateKey\(key,password\)/);
assert.match(save,/activeGeminiKey=await unlockPrivateKey\(password\)/);
assert.match(save,/저장하지 못했습니다/);
assert.match(save,/finally\{saveButton.disabled=false\}/);
console.log('V41 navigation and Gemini save integration checks passed');