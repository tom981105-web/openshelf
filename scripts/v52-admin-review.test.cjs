const fs=require('node:fs');const assert=require('node:assert/strict');
for(const p of ['automation/admin-webapp.gs','automation/OpenShelf_Admin_v6_4_Code.gs']){
 const s=fs.readFileSync(p,'utf8');
 for(const pattern of [/autoReview = githubJsonFile_/,/autoReview: \{updatedAt:/,/id="autoReviewSummary"/,/id="legacyReviewInbox"/,/function renderAutoReview\(data\)/,/renderAutoReview\(r.autoReview\)/])assert.match(s,pattern,p);
 assert.ok(s.includes('aria-hidden="true"'));
 const span=s.match(/function renderAutoReview\(data\)\{[\s\S]*?\n\}/);
 assert.ok(span,'review function');
 new Function(span[0]);
 const viewStart=s.indexOf('<section class="section review">');
 const viewEnd=s.indexOf('</section>',viewStart);
 assert.ok(viewStart>=0&&viewEnd>viewStart);
 assert.ok(s.slice(viewStart,viewEnd).includes('</div>\n    </section>')===false);
}
console.log('V52 Admin review dashboard structural checks passed');
