import assert from 'node:assert/strict';
import fs from 'node:fs';
const css=fs.readFileSync('catalog-ui-v33.css','utf8');
for(const file of ['unified-search.html','public-api.html','public-data.html']){
 const html=fs.readFileSync(file,'utf8');
 assert.match(html,/<link rel="stylesheet" href="catalog-ui-v33\.css">/,file+' must load shared styles');
 assert.match(html,/href="unified-search\.html"/,file+' should link unified search');
 assert.match(html,/href="public-api\.html"/,file+' should link public API');
 assert.match(html,/href="public-data\.html"/,file+' should link public data');
}
assert.match(css,/@media\(max-width:760px\)/);
assert.match(css,/prefers-reduced-motion:reduce/);
assert.match(css,/:focus-visible/);
assert.match(css,/\.public-controls input/);
assert.match(css,/\.result-card/);
const wf=fs.readFileSync('.github/workflows/browser-performance-v32.yml','utf8');
assert.match(wf,/catalog-ui-v33\.test\.mjs/);
assert.match(wf,/Measure real Chromium search flows/);
console.log('V33 shared navigation and responsive UI regression checks passed');
