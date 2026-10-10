import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context={URL,encodeURIComponent};
vm.runInNewContext(fs.readFileSync('playground-catalog.js','utf8')+';globalThis.lookup={playgroundModeForTool,playgroundLink}',context);
const {playgroundModeForTool,playgroundLink}=context.lookup;
const catalog=JSON.parse(fs.readFileSync('data/tools.json','utf8'));
const expected=new Map([
  ['jsonhero-web','json'],
  ['dasel','json'],
  ['jc','json'],
  ['glow','markdown'],
  ['zettlr','markdown'],
  ['ripgrep','regex'],
  ['grex','regex']
]);
for(const [id,mode] of expected){
  const tool=catalog.find(t=>t.id===id);
  assert.ok(tool,'Registered demo tool not found: '+id);
  assert.equal(playgroundModeForTool(tool),mode,'Wrong demo mode for '+id);
  assert.equal(playgroundLink(tool),'playground.html?mode='+mode+'&source='+encodeURIComponent(id));
}
assert.equal(playgroundModeForTool({id:'unknown',github:'https://github.com/unknown/repo'}),null);
assert.equal(playgroundModeForTool({id:'bad',github:'https://notgithub.com/charmbracelet/glow'}),null);
assert.equal(playgroundModeForTool({id:'bad',github:'https://github.com/charmbracelet/glow/issues'}),null);
assert.equal(playgroundModeForTool({id:'old',github:'https://github.com/prettier/prettier'}),null);
console.log('Playground links verified for '+expected.size+' registered tools');
