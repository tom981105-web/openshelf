import assert from 'node:assert/strict';
import fs from 'node:fs';
const css=fs.readFileSync('styles.css','utf8');
assert.match(css,/#categoryChips\.chips\s*\{[\s\S]*?flex-wrap:wrap/);
assert.match(css,/@media \(max-width:767px\)\s*\{\s*#categoryChips\.chips\s*\{[\s\S]*?overflow-x:auto/);
assert.match(css,/#categoryChips\.chips::-webkit-scrollbar\{display:block/);
const html=fs.readFileSync('index.html','utf8');
assert.match(html,/id="categoryChips" class="chips"/);
console.log('Category navigation wrapping and mobile scroll visibility checks passed');
