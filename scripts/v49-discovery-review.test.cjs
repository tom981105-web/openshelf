const assert=require('node:assert/strict');const fs=require('node:fs');
const discover=fs.readFileSync('scripts/discover-tools.mjs','utf8');
assert.match(discover,/const rotation = Array\.from/);assert.match(discover,/Date\.now\(\) \/ 3600000/);assert.match(discover,/Math\.max\(20, Math\.floor\(MINIMUM_STARS\/4\)\)/);
assert.match(discover,/sort=stars&order=desc/);
for(const path of ['automation/admin-webapp.gs','automation/OpenShelf_Admin_v6_4_Code.gs']){
 const body=fs.readFileSync(path,'utf8');
 assert.match(body,/reviewScoreMemo=new WeakMap/);assert.match(body,/rows\.slice\(0,reviewVisibleLimit\)/);
 assert.match(body,/다음 20개 보기/);
 const js=require('node:vm');new js.Script(body,{filename:path});
}
console.log('V49 rotation and review pagination source checks passed');
