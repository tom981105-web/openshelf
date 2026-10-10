import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const js=fs.readFileSync('public-api.js','utf8');
const html=fs.readFileSync('public-api.html','utf8');
const builder=fs.readFileSync('scripts/build-public-api-list.mjs','utf8');
assert.match(js,/public-api-official-list\.json/);
assert.match(js,/metadata-only/);
assert.match(js,/verifiedIds\.has/);
assert.match(js,/\\d\{7,8\}/);
assert.match(builder,/\\d\{7,8\}/);
assert.match(html,/apiVerifiedCount/);
const checks=['public-api.js','scripts/build-public-api-list.mjs'];
for(const file of checks){const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});assert.equal(r.status,0,r.stderr)}
console.log('Full official CSV catalog integration checks passed');
