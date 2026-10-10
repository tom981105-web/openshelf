// Only explicitly reviewed GitHub repositories may display a related local demo.
// This is an OpenShelf simulation, never the repository's own code.
const PLAYGROUND_REPOSITORIES=Object.freeze({
  'prettier/prettier':'json',
  'jqlang/jq':'json',
  'markedjs/marked':'markdown',
  'markdown-it/markdown-it':'markdown',
  'highlightjs/highlight.js':'regex'
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
  return mode?'playground.html?mode='+encodeURIComponent(mode)+'&source='+encodeURIComponent(tool.id):null;
}
