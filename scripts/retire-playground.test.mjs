import assert from 'node:assert/strict';
import fs from 'node:fs';
const forbidden=fs.readdirSync('.').filter(x=>/^playground/i.test(x));
assert.deepEqual(forbidden,[],'Playground pages or assets still exist');
for(const f of ['index.html','app.js','public-api.html','public-data.html','.github/workflows/discover-tools.yml']){
 const s=fs.readFileSync(f,'utf8');
 assert.ok(!/playground/i.test(s),f+' still contains Playground references');
}
for(const f of fs.readdirSync('.github/workflows')){
 assert.ok(!/playground/i.test(f)||f==='retire-playground.yml',f+' workflow still active');
}
console.log('Playground removal regression passed; catalog and public data pages retained');
