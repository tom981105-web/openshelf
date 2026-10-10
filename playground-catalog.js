// Only explicitly reviewed GitHub repositories may display a related local demo.
// This is an OpenShelf simulation, never the repository's own code.
const PLAYGROUND_REPOSITORIES=Object.freeze({
  // These catalog entries are confirmed present in data/tools.json.
  // The demonstration is illustrative and does not execute original project code.
  'triggerdotdev/jsonhero-web':'json',
  'tomwright/dasel':'json',
  'kellyjonbrazil/jc':'json',
  'charmbracelet/glow':'markdown',
  'zettlr/zettlr':'markdown',
  'burntsushi/ripgrep':'regex',
  'pemistahl/grex':'regex',
  'excalidraw/excalidraw':'official-excalidraw'
});
function playgroundModeForTool(tool){
  if(!tool||typeof tool.github!=='string')return null;
  try {
    const url=new URL(tool.github);
    if(url.hostname.toLowerCase()!=='github.com')return null;
    const parts=url.pathname.split('/').filter(Boolean);
    if(parts.length!==2)return null;
    const repo=parts.join('/').toLowerCase().replace(/\.git$/,'');
    return PLAYGROUND_REPOSITORIES[repo]||null;
  }catch{return null}
}
function playgroundLink(tool){
  const mode=playgroundModeForTool(tool);
  if(mode==='official-excalidraw')return 'playground-live.html?source='+encodeURIComponent(tool.id);
  if(mode==='json'&&['jsonhero-web','dasel','jc'].includes(tool.id))return 'playground-jsonata.html?source='+encodeURIComponent(tool.id);
  if(mode==='markdown'&&['glow','zettlr'].includes(tool.id))return 'playground-engine.html?source='+encodeURIComponent(tool.id);
  return mode?'playground.html?mode='+encodeURIComponent(mode)+'&source='+encodeURIComponent(tool.id):null;
}

function playgroundIsOfficial(tool){return playgroundModeForTool(tool)==='official-excalidraw'}

function playgroundUsesRealEngine(tool){return !!tool&&['glow','zettlr'].includes(tool.id)&&playgroundModeForTool(tool)==='markdown'}

function playgroundUsesJsonata(tool){return !!tool&&['jsonhero-web','dasel','jc'].includes(tool.id)&&playgroundModeForTool(tool)==='json'}
