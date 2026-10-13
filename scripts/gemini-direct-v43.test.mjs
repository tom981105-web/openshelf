import assert from 'node:assert/strict';import fs from 'node:fs';
const client=fs.readFileSync('gemini-direct-client.js','utf8');const ui=fs.readFileSync('unified-search.js','utf8');const vault=fs.readFileSync('gemini-key-vault.js','utf8');
assert.match(client,/generativelanguage\.googleapis\.com/);
assert.match(client,/x-goog-api-key/);
assert.match(client,/allowed\.has\(id\)/);
assert.match(ui,/await recommendWithGemini\(activeGeminiKey,question,candidates\)/);
assert.ok(!ui.includes('Gemini 서버 설정 전입니다.'));
assert.match(vault,/password\.length<4/);
console.log('V43 personal direct Gemini integration verified');