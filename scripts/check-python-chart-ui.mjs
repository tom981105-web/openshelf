import assert from 'node:assert/strict';
import fs from 'node:fs';
const html=fs.readFileSync('playground-python.html','utf8');
const app=fs.readFileSync('playground-python.js','utf8');
for(const id of ['pythonChart','pythonChartSave','pythonExampleChart']){
 const matches=html.match(new RegExp('id="'+id+'"','g'))||[];
 assert.equal(matches.length,1,id+' must exist only once');
}
assert.ok(!html.includes('pythonChartSection'),'Old duplicate canvas chart must be removed');
assert.ok(!html.includes('playground-python-chart.js'),'Unused canvas renderer must not load');
assert.ok(html.includes('type="module" src="playground-python.js"'));
assert.ok(app.includes("JSON.parse(m.chart)"),'Chart JSON must be parsed before rendering');
assert.ok(app.includes("renderChart(document.getElementById('pythonChart'),parsed)"));
assert.ok(app.includes('openshelf-python-chart.png'),'PNG chart export must be wired');
console.log('Single Python chart panel and PNG export checks passed');
