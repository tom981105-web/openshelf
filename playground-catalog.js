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

const PLAYGROUND_EXPERIENCES=Object.freeze([
  {key:'markdown',title:'Markdown Engine',type:'engine',kind:'실제 오픈소스 엔진',description:'Marked 라이브러리로 Markdown·표·코드 블록을 렌더링합니다. 연결 도구의 원본 프로그램을 실행하는 것은 아닙니다.',meta:'Marked · 브라우저 실행',href:'playground-engine.html',action:'Markdown 실행하기 ↗'},
  {key:'json-query',title:'JSON Query Engine',type:'engine',kind:'실제 오픈소스 엔진',description:'JSONata로 JSON 데이터를 조회·필터링합니다. 연결 도구의 원본 프로그램을 실행하는 것은 아닙니다.',meta:'JSONata · Web Worker',href:'playground-jsonata.html',action:'JSON 조회하기 ↗'},
  {key:'official',title:'Excalidraw Live',type:'official',kind:'공식 외부 앱',description:'실제 Excalidraw 공식 웹앱을 연결합니다. 외부 사이트의 이용 및 개인정보 처리 정책이 적용됩니다.',meta:'공식 호스팅 · 외부 서비스',href:'playground-live.html?source=excalidraw',action:'공식 앱 열기 ↗'},
  {key:'json-format',title:'JSON Formatter',type:'demo',kind:'OpenShelf 자체 데모',description:'JSON 형식을 정리하고 문법 오류를 확인합니다. 원본 프로젝트 코드를 실행하지 않습니다.',meta:'OpenShelf 자체 구현',href:'playground.html?mode=json',action:'JSON 포맷 체험 ↗'},
  {key:'regex',title:'Regex Tester',type:'demo',kind:'OpenShelf 자체 데모',description:'JavaScript 기반 정규식을 테스트합니다. ripgrep·grex 원본 엔진은 아닙니다.',meta:'OpenShelf 자체 구현 · 제한된 정규식',href:'playground.html?mode=regex',action:'정규식 체험 ↗'}
]);
function playgroundExperienceForTool(tool){
  if(!playgroundModeForTool(tool))return null;
  if(playgroundIsOfficial(tool))return 'official';
  if(playgroundUsesRealEngine(tool))return 'markdown';
  if(playgroundUsesJsonata(tool))return 'json-query';
  if(playgroundModeForTool(tool)==='regex')return 'regex';
  if(playgroundModeForTool(tool)==='json')return 'json-format';
  return null;
}
function playgroundHubEntries(tools){
  const valid=Array.isArray(tools)?tools:[];
  return PLAYGROUND_EXPERIENCES.map(experience=>({
    ...experience,
    tools:valid.filter(tool=>playgroundExperienceForTool(tool)===experience.key).map(tool=>({id:tool.id,name:tool.name,href:playgroundLink(tool)}))
  })).filter(entry=>entry.tools.length>0);
}
