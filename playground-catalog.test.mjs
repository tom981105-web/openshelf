import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context={URL,encodeURIComponent};
vm.runInNewContext(fs.readFileSync('playground-catalog.js','utf8')+';globalThis.lookup={playgroundModeForTool,playgroundLink,playgroundHubEntries,playgroundExperienceForTool,playgroundUsesSqlEngine,playgroundUsesCsvEngine}',context);
const {playgroundModeForTool,playgroundLink}=context.lookup;
const catalog=JSON.parse(fs.readFileSync('data/tools.json','utf8'));
const expected=new Map([
  ['jsonhero-web','json'],
  ['dasel','json'],
  ['jc','json'],
  ['glow','markdown'],
  ['zettlr','markdown'],
  ['ripgrep','regex'],
  ['grex','regex'],
  ['excalidraw','official-excalidraw'],
  ['visidata','csv'],
  ['q','csv']
]);
for(const [id,mode] of expected){
  const tool=catalog.find(t=>t.id===id);
  assert.ok(tool,'Registered demo tool not found: '+id);
  assert.equal(playgroundModeForTool(tool),mode,'Wrong demo mode for '+id);
  assert.equal(playgroundLink(tool),mode==='csv'?(id==='q'?'playground-sql.html?source='+encodeURIComponent(id):'playground-csv.html?source='+encodeURIComponent(id)):mode==='official-excalidraw'?'playground-live.html?source='+encodeURIComponent(id):['glow','zettlr'].includes(id)?'playground-engine.html?source='+encodeURIComponent(id):['jsonhero-web','dasel','jc'].includes(id)?'playground-jsonata.html?source='+encodeURIComponent(id):'playground.html?mode='+mode+'&source='+encodeURIComponent(id));
}
assert.equal(playgroundModeForTool({id:'unknown',github:'https://github.com/unknown/repo'}),null);
assert.equal(playgroundModeForTool({id:'bad',github:'https://notgithub.com/charmbracelet/glow'}),null);
assert.equal(playgroundModeForTool({id:'bad',github:'https://github.com/charmbracelet/glow/issues'}),null);
assert.equal(playgroundModeForTool({id:'old',github:'https://github.com/prettier/prettier'}),null);
assert.equal(playgroundModeForTool({id:'fake',github:'https://notgithub.com/excalidraw/excalidraw'}),null);
assert.equal(playgroundLink({id:'glow',github:'https://github.com/charmbracelet/glow'}),'playground-engine.html?source=glow');
console.log('Playground links verified for '+expected.size+' registered tools');

const hub= context.lookup.playgroundHubEntries(catalog);
assert.equal(hub.length,6,'Only populated experience types should be shown; JSON formatter has no catalog links');
const linkedIds=hub.flatMap(entry=>entry.tools.map(tool=>tool.id));
assert.equal(linkedIds.length,expected.size,'All verified catalog tools must be represented once');
assert.equal(new Set(linkedIds).size,linkedIds.length,'No duplicated linked tools');
for(const id of expected.keys())assert.ok(linkedIds.includes(id),'Missing in Hub: '+id);
const reduced=context.lookup.playgroundHubEntries(catalog.filter(t=>t.id==='glow'));
assert.equal(reduced.length,1,'Missing tool data must hide unsupported/empty experiences');
assert.equal(reduced[0].key,'markdown');
assert.equal(context.lookup.playgroundHubEntries([]).length,0);
assert.equal(context.lookup.playgroundHubEntries([{id:'other',github:'https://github.com/x/y'}]).length,0);
console.log('Live Playground Hub grouping and zero-false-positive tests passed');

assert.equal(context.lookup.playgroundExperienceForTool(catalog.find(t=>t.id==='q')),'sql');
assert.equal(context.lookup.playgroundUsesSqlEngine(catalog.find(t=>t.id==='q')),true);
assert.equal(context.lookup.playgroundUsesCsvEngine(catalog.find(t=>t.id==='q')),false);
assert.equal(context.lookup.playgroundUsesCsvEngine(catalog.find(t=>t.id==='visidata')),true);
assert.equal(playgroundLink({id:'unregistered',github:'https://github.com/unknown/unregistered'}),null);
console.log('Unified registry engine classifications verified');
