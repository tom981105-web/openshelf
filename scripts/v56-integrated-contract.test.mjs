import fs from 'node:fs';import assert from 'node:assert/strict';
const statuses=['auto_approved','auto_approved_after_recheck','auto_approved_after_license_check','auto_approved_after_document_review'];
for(const p of ['automation/admin-webapp.gs','automation/OpenShelf_Admin_v6_4_Code.gs']){
 const s=fs.readFileSync(p,'utf8');for(const status of statuses)assert.ok(s.includes(status),p+' missing '+status);
 assert.match(s,/githubJsonFile_\('data\/auto-review-v51\.json'\)/);
 assert.match(s,/function renderAutoReview\(data\)/);
}
const html=fs.readFileSync('index.html','utf8');
for(const id of ['search','categoryChips','toolGrid','toolDialog','sortSelect'])assert.ok(html.includes('id="'+id+'"'),id);
console.log('V56 Admin and homepage integration contract passed');