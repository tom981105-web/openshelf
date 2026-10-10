// Only explicitly reviewed GitHub repositories may display a related local demo.
// This is an OpenShelf simulation, never the repository's own code.
// Reviewed repository-to-experience registry. No automatic execution by keyword.
const PLAYGROUND_REGISTRY=Object.freeze({
 'triggerdotdev/jsonhero-web':{mode:'json',experience:'json-query'},
 'tomwright/dasel':{mode:'json',experience:'json-query'},
 'kellyjonbrazil/jc':{mode:'json',experience:'json-query'},
 'charmbracelet/glow':{mode:'markdown',experience:'markdown'},
 'zettlr/zettlr':{mode:'markdown',experience:'markdown'},
 'burntsushi/ripgrep':{mode:'regex',experience:'regex'},
 'pemistahl/grex':{mode:'regex',experience:'regex'},
 'excalidraw/excalidraw':{mode:'official-excalidraw',experience:'official'},
 'saulpw/visidata':{mode:'csv',experience:'csv'},
 'harelba/q':{mode:'csv',experience:'sql'}
});
const PLAYGROUND_REPOSITORIES=Object.freeze(Object.fromEntries(Object.entries(PLAYGROUND_REGISTRY).map(([repo,entry])=>[repo,entry.mode])));
function playgroundRegistryEntry(tool){
 if(!tool||typeof tool.github!=='string')return null;
 try{const url=new URL(tool.github);if(url.protocol!=='https:'||url.hostname.toLowerCase()!=='github.com')return null;
 const parts=url.pathname.split('/').filter(Boolean);
 if(parts.length!==2)return null;
 const slug=parts.join('/').toLowerCase().replace(/\.git$/,'');
 return PLAYGROUND_REGISTRY[slug]||null;
 }catch{return null}
}

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
 const entry=playgroundRegistryEntry(tool);
 if(!entry)return null;
 const experience=PLAYGROUND_EXPERIENCES.find(item=>item.key===entry.experience);
 if(!experience)return null;
 const path=experience.href.split('?')[0];
 return path+(experience.href.includes('?')&&entry.experience!=='official'?experience.href.slice(experience.href.indexOf('?'))+'&':'?')+'source='+encodeURIComponent(tool.id);
}

function playgroundIsOfficial(tool){return playgroundModeForTool(tool)==='official-excalidraw'}

function playgroundUsesRealEngine(tool){return !!tool&&['glow','zettlr'].includes(tool.id)&&playgroundModeForTool(tool)==='markdown'}

function playgroundUsesJsonata(tool){return !!tool&&['jsonhero-web','dasel','jc'].includes(tool.id)&&playgroundModeForTool(tool)==='json'}

const PLAYGROUND_EXPERIENCES=Object.freeze([
  {key:'sql',title:'SQL WebAssembly Lab',type:'engine',kind:'실제 WebAssembly 엔진',description:'sql.js의 실제 SQLite WebAssembly를 브라우저에서 실행합니다. q 원본 CLI 실행은 아닙니다.',meta:'SQLite WASM · 격리 Worker',href:'playground-sql.html',action:'SQL 실행하기 ↗'},
  {key:'csv',title:'CSV Engine',type:'engine',kind:'실제 오픈소스 엔진',description:'Papa Parse로 CSV를 분석합니다. VisiData·q 원본 프로그램을 실행하는 것은 아닙니다.',meta:'Papa Parse · 브라우저 실행',href:'playground-csv.html',action:'CSV 분석하기 ↗'},
  {key:'markdown',title:'Markdown Engine',type:'engine',kind:'실제 오픈소스 엔진',description:'Marked 라이브러리로 Markdown·표·코드 블록을 렌더링합니다. 연결 도구의 원본 프로그램을 실행하는 것은 아닙니다.',meta:'Marked · 브라우저 실행',href:'playground-engine.html',action:'Markdown 실행하기 ↗'},
  {key:'json-query',title:'JSON Query Engine',type:'engine',kind:'실제 오픈소스 엔진',description:'JSONata로 JSON 데이터를 조회·필터링합니다. 연결 도구의 원본 프로그램을 실행하는 것은 아닙니다.',meta:'JSONata · Web Worker',href:'playground-jsonata.html',action:'JSON 조회하기 ↗'},
  {key:'official',title:'Excalidraw Live',type:'official',kind:'공식 외부 앱',description:'실제 Excalidraw 공식 웹앱을 연결합니다. 외부 사이트의 이용 및 개인정보 처리 정책이 적용됩니다.',meta:'공식 호스팅 · 외부 서비스',href:'playground-live.html?source=excalidraw',action:'공식 앱 열기 ↗'},
  {key:'json-format',title:'JSON Formatter',type:'demo',kind:'OpenShelf 자체 데모',description:'JSON 형식을 정리하고 문법 오류를 확인합니다. 원본 프로젝트 코드를 실행하지 않습니다.',meta:'OpenShelf 자체 구현',href:'playground.html?mode=json',action:'JSON 포맷 체험 ↗'},
  {key:'regex',title:'Regex Tester',type:'demo',kind:'OpenShelf 자체 데모',description:'JavaScript 기반 정규식을 테스트합니다. ripgrep·grex 원본 엔진은 아닙니다.',meta:'OpenShelf 자체 구현 · 제한된 정규식',href:'playground.html?mode=regex',action:'정규식 체험 ↗'}
]);
function playgroundExperienceForTool(tool){
 return playgroundRegistryEntry(tool)?.experience||null;
}

function playgroundHubEntries(tools){
  const valid=Array.isArray(tools)?tools:[];
  return PLAYGROUND_EXPERIENCES.map(experience=>({
    ...experience,
    tools:valid.filter(tool=>playgroundExperienceForTool(tool)===experience.key).map(tool=>({id:tool.id,name:tool.name,href:playgroundLink(tool)}))
  })).filter(entry=>entry.tools.length>0);
}

function playgroundUsesCsvEngine(tool){return playgroundModeForTool(tool)==='csv'}
