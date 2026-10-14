import assert from 'node:assert/strict';
import fs from 'node:fs';
const taxonomy=JSON.parse(fs.readFileSync('data/tool-categories.json','utf8')).categories;
assert.equal(new Set(taxonomy).size,taxonomy.length);
assert.ok(taxonomy.length>13);
const discovery=fs.readFileSync('scripts/discover-tools.mjs','utf8');
assert.match(discovery,/readFile\('data\/tool-categories\.json'/);
assert.ok(discovery.indexOf('const validCategories = ')<discovery.indexOf('const categories = [...validCategories]'));
const home=fs.readFileSync('app.js','utf8');
const order=home.match(/const CATEGORY_ORDER=\[([^\n]+)\]/)?.[1]||'';
for(const cat of taxonomy)assert.ok(order.includes("'"+cat+"'"),'homepage missing '+cat);
assert.match(home,/function orderedCategories\(\)/);
for(const file of ['automation/admin-webapp.gs','automation/OpenShelf_Admin_v6_4_Code.gs']){
 const content=fs.readFileSync(file,'utf8');
 for(const cat of taxonomy)assert.ok(content.includes("'"+cat+"'"),file+' missing '+cat);
 assert.match(content,/function renderAutoReview\(data\)/);
}
console.log('V55 shared category and Admin/web parity passed: '+taxonomy.length);
