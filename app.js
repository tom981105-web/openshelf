const state={category:'전체',query:'',openSource:false,free:false,favoritesOnly:false,todayOnly:false,platform:'all',sort:'popular'};
let tools=[];
let discoveryState=null;
const FAVORITES_KEY='openshelf-favorites-v1';
const RECENT_SEARCHES_KEY='openshelf-recent-searches-v1';
const RECENTLY_VIEWED_KEY='openshelf-recently-viewed-v1';
// Browser storage is optional: malformed values or blocked storage must not break the site.
function readStoredList(key,limit=Infinity){
  try{
    const value=JSON.parse(localStorage.getItem(key)||'[]');
    return Array.isArray(value)?value.filter(x=>typeof x==='string'&&x.length>0).slice(0,limit):[];
  }catch(error){
    console.warn('OpenShelf: local preference unavailable',key,error);
    return [];
  }
}
function writeStoredList(key,values){
  try{localStorage.setItem(key,JSON.stringify(values));}
  catch(error){console.warn('OpenShelf: could not persist local preference',key,error);}
}
function removeStoredList(key){
  try{localStorage.removeItem(key);}
  catch(error){console.warn('OpenShelf: could not remove local preference',key,error);}
}
const favorites=new Set(readStoredList(FAVORITES_KEY));
let recentSearches=readStoredList(RECENT_SEARCHES_KEY,6);
let searchSuggestionIndex=-1;
let recentlyViewed=readStoredList(RECENTLY_VIEWED_KEY,8);
const compareSelected=new Set();
let currentPreviewId='';
let previewToolIds=[];
let previewHoverTimer=null;
const categoryDescriptions={
  'AI 에이전트':'AI 에이전트·스킬·오케스트레이션',
  '개발 도구':'코딩·디버깅·SDK·개발 워크플로',
  '업무 자동화':'반복 업무·워크플로 자동화',
  '지식·검색':'검색·크롤링·지식베이스·RAG',
  '디자인·시각화':'UI·다이어그램·그래픽 제작',
  '문서':'PDF·HWP·Office 문서 처리',
  '브라우저 자동화':'브라우저 조작·웹 작업 자동화',
  'AI 모델':'모델 실행·최적화·분류',
  'AI 평가':'AI 에이전트 평가·감사·품질 진단',
  '교육·학습':'AI 기반 학습·교육·튜토리얼',
  '공간정보':'지도·GEOINT·위치 분석',
  '3D·CAD':'3D 모델링·CAD 설계',
  '영상·애니메이션':'영상·애니메이션 제작'
};
const CATEGORY_ORDER=['AI 에이전트','개발 도구','업무 자동화','지식·검색','디자인·시각화','문서','브라우저 자동화','AI 모델','AI 평가','교육·학습','공간정보','3D·CAD','영상·애니메이션'];
const collections=[
  {id:'quick-web',kicker:'NO INSTALL',title:'설치 없이 바로',description:'브라우저만 열면 바로 사용할 수 있는 웹 기반 도구.',filter:t=>t.platforms.includes('Web')},
  {id:'windows',kicker:'WINDOWS KIT',title:'윈도우 필수 도구',description:'Windows에서 바로 설치해 쓸 만한 생산성·미디어 도구.',filter:t=>t.platforms.includes('Windows')},
  {id:'selfhost',kicker:'SELF HOSTED',title:'내가 직접 운영하기',description:'외부 서비스에 맡기지 않고 직접 운영할 수 있는 도구.',filter:t=>(t.tags||[]).includes('셀프호스트')}
];

const els={
  adminGate:document.querySelector('#adminGate'),search:document.querySelector('#search'),searchWrap:document.querySelector('#searchWrap'),categoryChips:document.querySelector('#categoryChips'),categoryGrid:document.querySelector('#categoryGrid'),
  collectionGrid:document.querySelector('#collectionGrid'),openSourceOnly:document.querySelector('#openSourceOnly'),freeOnly:document.querySelector('#freeOnly'),
  favoritesOnly:document.querySelector('#favoritesOnly'),todayOnly:document.querySelector('#todayOnly'),platformFilter:document.querySelector('#platformFilter'),sortSelect:document.querySelector('#sortSelect'),
  toolGrid:document.querySelector('#toolGrid'),resultCount:document.querySelector('#resultCount'),emptyState:document.querySelector('#emptyState'),
  favoriteCount:document.querySelector('#favoriteCount'),favoritesNav:document.querySelector('#favoritesNav'),mobileFavorites:document.querySelector('#mobileFavorites'),
  mobileFavoriteCount:document.querySelector('#mobileFavoriteCount'),latestGrid:document.querySelector('#latestGrid'),heroToolCount:document.querySelector('#heroToolCount'),
  toolDialog:document.querySelector('#toolDialog'),dialogContent:document.querySelector('#dialogContent'),dialogClose:document.querySelector('#dialogClose'),
  resetFilters:document.querySelector('#resetFilters'),scrollToAll:document.querySelector('#scrollToAll'),statCategories:document.querySelector('#statCategories'),
  statPlatforms:document.querySelector('#statPlatforms'),statOpenSource:document.querySelector('#statOpenSource'),mobileMenuButton:document.querySelector('#mobileMenuButton'),
  mobileMenu:document.querySelector('#mobileMenu'),activeFilters:document.querySelector('#activeFilters'),resultContext:document.querySelector('#resultContext'),loadingState:document.querySelector('#loadingState'),errorState:document.querySelector('#errorState'),retryLoad:document.querySelector('#retryLoad'),searchSuggestions:document.querySelector('#searchSuggestions'),searchFacets:document.querySelector('#searchFacets'),trendingSection:document.querySelector('#trending'),trendingGrid:document.querySelector('#trendingGrid'),recentlyViewedSection:document.querySelector('#recentlyViewed'),recentlyViewedGrid:document.querySelector('#recentlyViewedGrid'),clearRecentlyViewed:document.querySelector('#clearRecentlyViewed'),dailyDiscoveryGrid:document.querySelector('#dailyDiscoveryGrid'),dailyDiscoveryDate:document.querySelector('#dailyDiscoveryDate'),workflowGrid:document.querySelector('#workflowGrid'),aiFinderForm:document.querySelector('#aiFinderForm'),aiFinderInput:document.querySelector('#aiFinderInput'),aiFinderSubmit:document.querySelector('#aiFinderSubmit'),aiFinderStatus:document.querySelector('#aiFinderStatus'),aiFinderResult:document.querySelector('#aiFinderResult'),compareBar:document.querySelector('#compareBar'),compareCount:document.querySelector('#compareCount'),clearCompare:document.querySelector('#clearCompare'),openCompare:document.querySelector('#openCompare'),compareDialog:document.querySelector('#compareDialog'),compareDialogContent:document.querySelector('#compareDialogContent'),compareDialogClose:document.querySelector('#compareDialogClose'),quickPreview:document.querySelector('#quickPreview'),quickPreviewContent:document.querySelector('#quickPreviewContent'),quickPreviewClose:document.querySelector('#quickPreviewClose'),quickPreviewPrev:document.querySelector('#quickPreviewPrev'),quickPreviewNext:document.querySelector('#quickPreviewNext'),quickPreviewPosition:document.querySelector('#quickPreviewPosition'),heroCategoryCount:document.querySelector('#heroCategoryCount'),heroOpenSourceCount:document.querySelector('#heroOpenSourceCount'),discoveryStatusBadge:document.querySelector('#discoveryStatusBadge'),discoveryLastRun:document.querySelector('#discoveryLastRun'),discoveryLastAdded:document.querySelector('#discoveryLastAdded'),discoveryRejected:document.querySelector('#discoveryRejected'),discoveryTotal:document.querySelector('#discoveryTotal'),discoveryBatch:document.querySelector('#discoveryBatch'),discoveryNextRun:document.querySelector('#discoveryNextRun')
};

function saveFavorites(){writeStoredList(FAVORITES_KEY,[...favorites]);els.favoriteCount.textContent=favorites.size;els.mobileFavoriteCount.textContent=favorites.size}
const SEARCH_ALIASES={
  'ai':['인공지능','llm','모델','에이전트'],'인공지능':['ai','llm'],'agent':['에이전트','agent skill','에이전트 스킬'],'에이전트':['agent','agent skill','에이전트 스킬'],
  'automation':['자동화','workflow','워크플로'],'자동화':['automation','workflow','워크플로'],'workflow':['워크플로','자동화'],'워크플로':['workflow','자동화'],
  'browser':['브라우저','chrome','크롬'],'브라우저':['browser','chrome','크롬'],'chrome':['크롬','브라우저'],'크롬':['chrome','브라우저'],
  'document':['문서','pdf','hwp','hwpx','office'],'문서':['document','pdf','hwp','hwpx','office'],'pdf':['문서'],'hwp':['문서','한글'],'hwpx':['문서','한글'],
  'design':['디자인','ui','ux','시각화'],'디자인':['design','ui','ux','시각화'],'diagram':['다이어그램','시각화'],'다이어그램':['diagram','시각화'],
  'search':['검색','크롤링','crawler','scraper'],'검색':['search','크롤링','crawler','scraper'],'crawl':['크롤링','crawler','scraper'],'크롤링':['crawl','crawler','scraper'],
  'memory':['메모리','기억'],'메모리':['memory','기억'],'rag':['지식','검색','knowledge'],'knowledge':['지식','검색'],'지식':['knowledge','rag'],
  'cad':['3d','3d 모델링','캐드'],'캐드':['cad','3d'],'video':['영상','애니메이션'],'영상':['video','애니메이션'],'animation':['애니메이션','영상'],'애니메이션':['animation','video'],
  'learn':['학습','교육','튜토리얼'],'학습':['learn','교육','튜토리얼'],'education':['교육','학습'],'교육':['education','학습'],
  'map':['지도','공간정보','geoint','geo'],'지도':['map','공간정보','geoint','geo'],'geo':['공간정보','지도','geoint'],'공간정보':['geo','지도','geoint'],
  'code':['코드','개발','coding'],'코드':['code','개발','coding'],'dev':['개발','developer'],'개발':['dev','developer','code']
};
function normalizeSearch(value){return String(value||'').normalize('NFKC').toLowerCase().replace(/[·/_,.()\[\]{}:;|+\-]+/g,' ').replace(/\s+/g,' ').trim()}
function compactSearch(value){return normalizeSearch(value).replace(/\s+/g,'')}
const CHOSEONG=['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
function choseong(value){return [...String(value||'')].map(ch=>{const code=ch.charCodeAt(0)-0xAC00;if(code>=0&&code<=11171)return CHOSEONG[Math.floor(code/588)];return /[ㄱ-ㅎ]/.test(ch)?ch:''}).join('')}
function searchText(tool){return normalizeSearch([tool.name,tool.description,tool.longDescription,tool.category,tool.license,tool.github,tool.website,...(tool.tags||[]),...(tool.platforms||[]),...(tool.requirements||[]),...(tool.supportedAgents||[]),...(tool.usageSteps||[]),...(tool.install||[]).flatMap(x=>[x.title,x.command,x.note]),tool.examplePrompt,tool.usageNote].filter(Boolean).join(' '))}
function editDistance(a,b){if(a===b)return 0;if(!a.length)return b.length;if(!b.length)return a.length;const prev=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let last=prev[0];prev[0]=i;for(let j=1;j<=b.length;j++){const tmp=prev[j];prev[j]=Math.min(prev[j]+1,prev[j-1]+1,last+(a[i-1]===b[j-1]?0:1));last=tmp}}return prev[b.length]}
function expandedTerms(query){const base=normalizeSearch(query).split(' ').filter(Boolean);return base.map(term=>({term,variants:[term,...(SEARCH_ALIASES[term]||[]).map(normalizeSearch)]}))}
function fuzzyWordMatch(term,words){if(term.length<4)return false;const max=term.length>=8?2:1;return words.some(word=>Math.abs(word.length-term.length)<=max&&editDistance(term,word)<=max)}
const SEARCH_STOPWORDS=new Set(['좀','조금','그냥','하는','할','할수있는','할수','있는','있어','있나','싶어','싶은데','원해','필요해','도구','툴','프로그램','앱','추천','찾아줘','찾고','쓰고','사용하고','이용하고','만들고','해주는','해줘','하고','해서','한테','에게','으로','로','에서','위한','같은','것','거','뭐','무엇','내가']);
const SEARCH_INTENTS=[
  {label:'웹 크롤링·AI 활용',test:/((웹|사이트|페이지).*(긁|수집|크롤|스크랩))|((긁|수집|크롤|스크랩).*(웹|사이트|페이지))/i,terms:['크롤링','ai']},
  {label:'코딩 에이전트',test:/(코딩|개발|코드).*(에이전트|agent)|(에이전트|agent).*(코딩|개발|코드)/i,terms:['에이전트','개발']},
  {label:'문서 변환',test:/(pdf|hwp|hwpx|문서|오피스).*(변환|변환해|마크다운)|(변환|마크다운).*(pdf|hwp|hwpx|문서|오피스)/i,terms:['문서','변환']},
  {label:'업무 자동화',test:/(반복|업무|워크플로|workflow).*(자동|줄이|연동)|(자동화).*(업무|워크플로|연동)/i,terms:['자동화']},
  {label:'브라우저 자동화',test:/(브라우저|chrome|크롬|웹).*(조작|자동|클릭|로그인)|(자동화).*(브라우저|chrome|크롬)/i,terms:['브라우저','자동화']},
  {label:'AI 장기기억',test:/(기억|메모리|memory).*(ai|에이전트|대화)|(ai|에이전트).*(기억|메모리|memory)/i,terms:['메모리','에이전트']},
  {label:'지도·실시간 공간정보',test:/(지도|위치|공간|geo|geoint).*(실시간|항공|선박|위성|추적)|(실시간).*(지도|위치|공간)/i,terms:['공간정보']},
  {label:'디자인·UI 개선',test:/(ui|ux|디자인|프론트).*(개선|예쁘|퀄리티|품질)|(예쁘|개선).*(ui|디자인|화면)/i,terms:['디자인']},
  {label:'학습·교육',test:/(배우|공부|학습|강의|교육|튜토리얼).*(ai|코딩|개발)?/i,terms:['학습']},
  {label:'3D·CAD 제작',test:/(3d|cad|캐드|stl|step).*(만들|생성|설계|모델링)|(설계|모델링).*(3d|cad|캐드)/i,terms:['cad']},
  {label:'영상·애니메이션',test:/(영상|애니메이션|animation).*(만들|제작|생성)|(만들|제작).*(영상|애니메이션)/i,terms:['애니메이션']}
];
function inferSearchIntent(raw){const labels=[],terms=[];for(const rule of SEARCH_INTENTS){if(rule.test.test(raw)){labels.push(rule.label);terms.push(...rule.terms)}}return {labels:[...new Set(labels)],terms:[...new Set(terms)]}}
function meaningfulSearchTokens(tokens){return tokens.filter(token=>{const n=normalizeSearch(token);if(!n||SEARCH_STOPWORDS.has(n))return false;if(n.length===1&&!/[a-z0-9ㄱ-ㅎ]/i.test(n))return false;return true})}
function splitOrQuery(query){return String(query||'').split(/\s+(?:OR|또는)\s+|\s*\|\s*/i).map(x=>x.trim()).filter(Boolean)}
function parseSmartQuery(query){
  const raw=String(query||'').trim();
  const phrases=[...raw.matchAll(/"([^"]+)"/g)].map(m=>m[1]);
  let rest=raw.replace(/"([^"]+)"/g,' ');
  const filters={categories:[],platforms:[],licenses:[],tags:[],minStars:null,maxStars:null,free:null,open:null,negative:[],phrases};
  const tokens=rest.split(/\s+/).filter(Boolean);
  const positive=[];
  for(const token of tokens){
    const lower=token.toLowerCase();
    if(token.startsWith('-')&&token.length>1){filters.negative.push(token.slice(1));continue}
    const idx=token.indexOf(':');
    if(idx>0){
      const key=lower.slice(0,idx),value=token.slice(idx+1);
      if(['category','cat','카테고리'].includes(key)){filters.categories.push(value);continue}
      if(['platform','os','플랫폼'].includes(key)){filters.platforms.push(value);continue}
      if(['license','라이선스'].includes(key)){filters.licenses.push(value);continue}
      if(['tag','태그'].includes(key)){filters.tags.push(value);continue}
      if(['free','무료'].includes(key)){filters.free=!['false','0','no','아니오'].includes(value.toLowerCase());continue}
      if(['open','opensource','오픈소스'].includes(key)){filters.open=!['false','0','no','아니오'].includes(value.toLowerCase());continue}
      if(['stars','star','별'].includes(key)){const m=value.match(/^(>=|>|<=|<)?(\d+)$/);if(m){const n=Number(m[2]);if(m[1]==='<'||m[1]==='<=')filters.maxStars=n;else filters.minStars=n;continue}}
    }
    if(/^(무료|free)$/i.test(token)){filters.free=true;continue}
    if(/^(오픈소스|opensource|open-source)$/i.test(token)){filters.open=true;continue}
    if(/^(윈도우|windows)$/i.test(token)){filters.platforms.push('Windows');continue}
    if(/^(맥|맥os|mac|macos)$/i.test(token)){filters.platforms.push('macOS');continue}
    if(/^(리눅스|linux)$/i.test(token)){filters.platforms.push('Linux');continue}
    if(/^(웹|web)$/i.test(token)){filters.platforms.push('Web');continue}
    positive.push(token);
  }
  const intent=inferSearchIntent(raw);
  const cleaned=meaningfulSearchTokens(positive);
  const naturalLanguage=intent.terms.length>0||cleaned.length>=4;
  const textParts=intent.terms.length?[...phrases,...intent.terms,...cleaned.filter(x=>!SEARCH_STOPWORDS.has(normalizeSearch(x)))]:[...phrases,...cleaned];
  return {text:[...new Set(textParts)].join(' ').trim(),filters,intent,naturalLanguage};
}
function smartFilterMatch(tool,filters){
  const hay=searchText(tool);
  if(filters.phrases?.length&&!filters.phrases.every(x=>hay.includes(normalizeSearch(x))))return false;
  if(filters.negative.some(x=>hay.includes(normalizeSearch(x))))return false;
  if(filters.categories.length&&!filters.categories.every(x=>normalizeSearch(tool.category).includes(normalizeSearch(x))))return false;
  if(filters.platforms.length&&!filters.platforms.every(x=>(tool.platforms||[]).some(p=>normalizeSearch(p)===normalizeSearch(x))))return false;
  if(filters.licenses.length&&!filters.licenses.every(x=>normalizeSearch(tool.license).includes(normalizeSearch(x))))return false;
  if(filters.tags.length&&!filters.tags.every(x=>normalizeSearch((tool.tags||[]).join(' ')).includes(normalizeSearch(x))))return false;
  if(filters.free!==null&&Boolean(tool.free)!==filters.free)return false;
  if(filters.open!==null&&Boolean(tool.openSource)!==filters.open)return false;
  if(filters.minStars!==null&&Number(tool.stars||0)<filters.minStars)return false;
  if(filters.maxStars!==null&&Number(tool.stars||0)>filters.maxStars)return false;
  return true;
}
function searchScore(tool,query=state.query){
  const alternatives=splitOrQuery(query);
  if(alternatives.length>1)return Math.max(...alternatives.map(q=>searchScore(tool,q)));
  const parsed=parseSmartQuery(query);const normalized=normalizeSearch(parsed.text);
  if(!smartFilterMatch(tool,parsed.filters))return 0;
  if(!normalized)return 1;
  const groups=expandedTerms(normalized);
  const name=normalizeSearch(tool.name),nameCompact=compactSearch(tool.name),nameCho=choseong(tool.name);
  const category=normalizeSearch(tool.category),tags=normalizeSearch((tool.tags||[]).join(' '));
  const desc=normalizeSearch([tool.description,tool.longDescription].filter(Boolean).join(' '));
  const rest=searchText(tool),restCompact=compactSearch(rest),words=rest.split(' ').filter(Boolean);
  const queryCompact=compactSearch(normalized),queryCho=choseong(normalized);
  let score=0,matched=0;
  if(parsed.filters.phrases?.length)score+=parsed.filters.phrases.length*80;
  if(queryCompact&&nameCompact===queryCompact)score+=170;else if(queryCompact&&nameCompact.startsWith(queryCompact))score+=125;else if(queryCompact&&nameCompact.includes(queryCompact))score+=95;
  if(queryCho&&queryCho.length>=2&&nameCho.includes(queryCho))score+=85;
  for(const g of groups){
    let best=0;
    for(const v of g.variants){
      const vc=compactSearch(v);
      if(name===v)best=Math.max(best,130);else if(name.startsWith(v))best=Math.max(best,100);else if(name.includes(v)||nameCompact.includes(vc))best=Math.max(best,82);
      if(category.includes(v))best=Math.max(best,62);
      if(tags.includes(v))best=Math.max(best,58);
      if(desc.includes(v))best=Math.max(best,34);
      if(rest.includes(v)||restCompact.includes(vc))best=Math.max(best,18);else if(fuzzyWordMatch(v,words))best=Math.max(best,11);
    }
    if(!best&&g.term&&/^[ㄱ-ㅎ]+$/.test(g.term)&&nameCho.includes(g.term))best=70;
    if(best){matched++;score+=best}else if(!parsed.naturalLanguage)return 0;
  }
  if(parsed.naturalLanguage){const required=Math.max(1,Math.ceil(groups.length*.45));if(matched<required)return 0;score+=matched/groups.length*35;}
  const popularity=Math.min(12,Number(tool.stars||0)>0?Math.log10(Number(tool.stars)+1)*1.8:0);
  return score+popularity;
}
function toolMatches(tool){if(state.todayOnly&&!isAddedToday(tool))return false;const queryMatch=!state.query||searchScore(tool,state.query)>0;return queryMatch&&(state.category==='전체'||tool.category===state.category)&&(!state.openSource||tool.openSource)&&(!state.free||tool.free)&&(!state.favoritesOnly||favorites.has(tool.id))&&(state.platform==='all'||tool.platforms.includes(state.platform))}
function saveRecentSearch(query){const q=String(query||'').trim();if(q.length<2)return;recentSearches=[q,...recentSearches.filter(x=>normalizeSearch(x)!==normalizeSearch(q))].slice(0,6);writeStoredList(RECENT_SEARCHES_KEY,recentSearches)}
function searchSuggestionItems(){if(!state.query)return[];return tools.map(tool=>({tool,score:searchScore(tool,state.query)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||(b.tool.stars||0)-(a.tool.stars||0)).slice(0,7)}
function popularSearchTerms(){const categories=orderedCategories().slice(0,4);const tagCounts=new Map();for(const tool of tools){for(const tag of tool.tags||[]){const t=String(tag).trim();if(t.length<2)continue;tagCounts.set(t,(tagCounts.get(t)||0)+1)}}const tags=[...tagCounts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,4).map(x=>x[0]);return [...new Set([...categories,...tags])].slice(0,7)}
function applySearchQuery(query,commit=false){state.query=String(query||'').trim();els.search.value=state.query;if(state.query&&state.category!=='전체'){state.category='전체';renderChips()}if(commit)saveRecentSearch(state.query);renderTools();renderSearchSuggestions()}
function nearestSearchTerms(query){
  const q=normalizeSearch(parseSmartQuery(query).text).split(' ').filter(Boolean).pop()||'';
  if(q.length<3)return[];
  const vocab=new Set();
  for(const tool of tools){vocab.add(normalizeSearch(tool.name));for(const tag of tool.tags||[])vocab.add(normalizeSearch(tag));vocab.add(normalizeSearch(tool.category))}
  return [...vocab].filter(x=>x&&x.length>=3&&Math.abs(x.length-q.length)<=3).map(x=>({x,d:editDistance(q,x)})).filter(v=>v.d<=Math.max(2,Math.floor(q.length*.35))).sort((a,b)=>a.d-b.d||a.x.length-b.x.length).slice(0,5).map(v=>v.x);
}
function renderSearchSuggestions(){
  if(!els.searchSuggestions)return;
  searchSuggestionIndex=-1;
  const query=state.query.trim();
  if(!query){
    const recent=recentSearches.map(q=>'<button type="button" class="search-history-chip" data-search-query="'+q+'">최근 · '+q+'</button>').join('');
    const popular=popularSearchTerms().map(q=>'<button type="button" class="search-history-chip" data-search-query="'+q+'">'+q+'</button>').join('');
    const syntax='<div class="search-syntax"><span>고급 검색</span><code>무료 windows pdf</code><code>category:문서</code><code>stars:>10000</code><code>-교육 agent</code><code>pdf OR hwp</code><code>웹사이트 자료 긁어서 AI에 넣고 싶어</code></div>';
    if(!recent&&!popular){els.searchSuggestions.hidden=true;return}
    els.searchSuggestions.innerHTML='<div class="search-suggestion-section">'+(recent?'<b>최근 검색</b><div class="search-chip-row">'+recent+'</div>':'')+'<b>추천 검색</b><div class="search-chip-row">'+popular+'</div>'+syntax+'</div>';
    els.searchSuggestions.hidden=false;
  }else{
    const suggestions=searchSuggestionItems();
    const intent=queryIntentLabel(query);
    const intentBanner=intent?'<div class="search-intent"><span>검색 의도</span><strong>'+escapeHtml(intent)+'</strong><small>자연어에서 핵심 용도를 추려 관련도에 반영했어요.</small></div>':'';
    if(!suggestions.length){
      const near=nearestSearchTerms(query);
      const nearHtml=near.length?'<span>혹시 이걸 찾았나요?</span><div class="search-chip-row">'+near.map(q=>'<button type="button" class="search-history-chip" data-search-query="'+escapeHtml(q)+'">'+escapeHtml(q)+'</button>').join('')+'</div>':'';
      const alternates=popularSearchTerms().slice(0,5).map(q=>'<button type="button" class="search-history-chip" data-search-query="'+q+'">'+q+'</button>').join('');
      els.searchSuggestions.innerHTML=intentBanner+'<div class="search-suggestion-empty"><strong>일치하는 도구가 없어요.</strong>'+nearHtml+'<span>추천 검색어</span><div class="search-chip-row">'+alternates+'</div></div>';
    }else{
      els.searchSuggestions.innerHTML=intentBanner+suggestions.map(x=>'<button type="button" class="search-suggestion" data-search-tool="'+x.tool.id+'"><span><strong>'+escapeHtml(x.tool.name)+'</strong><small>'+escapeHtml(x.tool.category)+'</small></span><em>'+escapeHtml(searchMatchReason(x.tool))+' · ★ '+compactNumber(x.tool.stars||0)+'</em></button>').join('');
    }
    els.searchSuggestions.hidden=false;
  }
  els.searchSuggestions.querySelectorAll('button').forEach(btn=>btn.addEventListener('mousedown',e=>e.preventDefault()));
  els.searchSuggestions.querySelectorAll('[data-search-tool]').forEach(btn=>btn.addEventListener('click',()=>{saveRecentSearch(state.query);els.searchSuggestions.hidden=true;openDetail(btn.dataset.searchTool)}));
  els.searchSuggestions.querySelectorAll('[data-search-query]').forEach(btn=>btn.addEventListener('click',()=>applySearchQuery(btn.dataset.searchQuery,true)));
}
function moveSearchSuggestion(direction){if(!els.searchSuggestions||els.searchSuggestions.hidden)return false;const buttons=[...els.searchSuggestions.querySelectorAll('.search-suggestion')];if(!buttons.length)return false;searchSuggestionIndex=(searchSuggestionIndex+direction+buttons.length)%buttons.length;buttons.forEach((b,i)=>b.classList.toggle('keyboard-active',i===searchSuggestionIndex));buttons[searchSuggestionIndex].scrollIntoView({block:'nearest'});return true}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
function highlightText(value,query=state.query){const text=String(value??'');const terms=normalizeSearch(parseSmartQuery(query).text).split(' ').filter(x=>x.length>1);if(!terms.length)return escapeHtml(text);const escaped=escapeHtml(text);const unique=[...new Set(terms)].sort((a,b)=>b.length-a.length);try{const parts=unique.map(x=>x.replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&'));const re=new RegExp('('+parts.join('|')+')','gi');return escaped.replace(re,'<mark>$1</mark>')}catch{return escaped}}
function orderedCategories(){const found=[...new Set(tools.map(t=>t.category))];return found.sort((a,b)=>{const ai=CATEGORY_ORDER.indexOf(a),bi=CATEGORY_ORDER.indexOf(b);if(ai===-1&&bi===-1)return a.localeCompare(b,'ko');if(ai===-1)return 1;if(bi===-1)return-1;return ai-bi})}
function renderChips(){const categories=['전체',...orderedCategories()];els.categoryChips.innerHTML=categories.map(c=>`<button class="chip ${state.category===c?'active':''}" data-category="${c}">${c}</button>`).join('');els.categoryChips.querySelectorAll('.chip').forEach(btn=>btn.addEventListener('click',()=>applyCategory(btn.dataset.category)))}
function applyCategory(category){state.category=category;renderChips();renderTools();document.querySelector('#tools').scrollIntoView({behavior:'smooth'})}
function renderCategories(){const categories=orderedCategories();const remainder=categories.length%4;els.categoryGrid.dataset.remainder=String(remainder);els.categoryGrid.innerHTML=categories.map((c,i)=>{const count=tools.filter(t=>t.category===c).length;return `<article class="category-card" data-tone="${categoryTone(c)}" data-category-card="${c}" tabindex="0"><span class="index">${String(i+1).padStart(2,'0')}</span><div><h3>${c}</h3><p>${categoryDescriptions[c]||'분류된 도구 모음'}</p></div><footer><span>${count} tools</span><span>Explore</span></footer></article>`}).join('');els.categoryGrid.querySelectorAll('[data-category-card]').forEach(el=>{const go=()=>applyCategory(el.dataset.categoryCard);el.addEventListener('click',go);el.addEventListener('keydown',e=>{if(e.key==='Enter')go()})})}
function renderCollections(){els.collectionGrid.innerHTML=collections.map(c=>{const count=tools.filter(c.filter).length;return `<article class="collection-card" data-collection="${c.id}" tabindex="0"><span>${c.kicker}</span><h3>${c.title}</h3><p>${c.description}</p><button type="button">${count}개 보기 →</button></article>`}).join('');els.collectionGrid.querySelectorAll('[data-collection]').forEach(el=>{const go=()=>{const c=collections.find(x=>x.id===el.dataset.collection);resetFilters(false);if(c.id==='quick-web'){state.platform='Web';els.platformFilter.value='Web'}else if(c.id==='windows'){state.platform='Windows';els.platformFilter.value='Windows'}else if(c.id==='selfhost'){state.query='셀프호스트';els.search.value='셀프호스트'}renderTools();document.querySelector('#tools').scrollIntoView({behavior:'smooth'})};el.addEventListener('click',go);el.addEventListener('keydown',e=>{if(e.key==='Enter')go()})})}
function tagsFor(tool){return[...(tool.tags||[]),...(tool.free?['무료']:[]),...(tool.openSource?['오픈소스']:[])]}
function tagMarkup(tag){return `<button type="button" class="tag tag-button" data-tag="${encodeURIComponent(tag)}">${escapeHtml(tag)}</button>`}
function applyTagFilter(tag){state.query=`"${tag}"`;els.search.value=tag;if(state.category!=='전체'){state.category='전체';renderChips()}renderTools();saveRecentSearch(tag);document.querySelector('#tools').scrollIntoView({behavior:'smooth'})}
function categoryTone(category){if(category==='AI 에이전트'||category==='AI 모델'||category==='AI 평가')return'ai';if(category==='디자인·시각화'||category==='3D·CAD')return'design';if(category==='개발 도구')return'dev';if(category==='업무 자동화')return'productivity';if(category==='문서'||category==='지식·검색')return'document';if(category==='영상·애니메이션')return'media';return'default'}
function iconUrl(tool){if(tool.icon)return tool.icon;if(!tool.website)return'';try{const host=new URL(tool.website).hostname;return `https://www.google.com/s2/favicons?domain=${host}&sz=128`}catch{return''}}
function visualMarkup(tool,large=false){const url=iconUrl(tool);const cls=large?'dialog-logo tool-visual':'logo tool-visual';const letter=tool.name.slice(0,1).toUpperCase();return `<div class="${cls}">${url?`<img src="${url}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.hidden=true">`:''}<span class="fallback-letter">${letter}</span></div>`}
function compactNumber(n){if(!Number.isFinite(Number(n)))return'—';const v=Number(n);if(v>=1000000)return (v/1000000).toFixed(v>=10000000?0:1).replace(/\.0$/,'')+'m';if(v>=1000)return (v/1000).toFixed(v>=10000?0:1).replace(/\.0$/,'')+'k';return String(v)}
function daysSince(value){if(!value)return Infinity;const d=new Date(value);if(Number.isNaN(d.getTime()))return Infinity;return Math.max(0,(Date.now()-d.getTime())/86400000)}
function activityStatus(tool){
  if(tool.githubArchived)return {label:'Archived',tone:'dead'};
  const days=daysSince(tool.githubPushedAt||tool.githubUpdatedAt);
  if(days<=14)return {label:'활발히 개발 중',tone:'active'};
  if(days<=60)return {label:'최근 업데이트',tone:'fresh'};
  if(days<=180)return {label:'유지보수 중',tone:'maintained'};
  if(days<=365)return {label:'업데이트 뜸함',tone:'quiet'};
  if(Number.isFinite(days))return {label:'1년 이상 업데이트 없음',tone:'stale'};
  return {label:'활동 정보 확인 중',tone:'unknown'};
}
function openShelfScore(tool){
  let score=0;const parts=[];
  if(tool.githubArchived){parts.push(['보관됨',0]);return {score:Math.min(35,Math.round(20+Math.min(15,Math.log10(Number(tool.stars||0)+1)*3))),parts}}
  const days=daysSince(tool.githubPushedAt||tool.githubUpdatedAt);
  let activity=0;if(days<=14)activity=30;else if(days<=60)activity=26;else if(days<=180)activity=20;else if(days<=365)activity=12;else if(Number.isFinite(days))activity=4;
  score+=activity;parts.push(['최근 활동',activity]);
  const license=tool.license&&!/확인 필요|unknown|noassertion/i.test(String(tool.license))?15:3;score+=license;parts.push(['라이선스',license]);
  const open=tool.openSource?12:5;score+=open;parts.push(['오픈소스',open]);
  const stars=Number(tool.stars||0);const popularity=Math.min(18,Math.max(0,Math.log10(stars+1)*3.4));score+=popularity;parts.push(['인기도',Math.round(popularity)]);
  const release=tool.latestRelease?.publishedAt?10:0;score+=release;parts.push(['릴리즈',release]);
  const docs=(tool.longDescription?4:0)+(tool.usageSteps?.length?4:0)+(tool.install?.length?4:0)+(tool.requirements?.length?3:0);score+=Math.min(15,docs);parts.push(['정보 충실도',Math.min(15,docs)]);
  return {score:Math.max(0,Math.min(100,Math.round(score))),parts};
}
function scoreLabel(score){if(score>=85)return'매우 우수';if(score>=70)return'우수';if(score>=55)return'양호';if(score>=40)return'보통';return'주의'}
function relativeActivityDate(value){const days=Math.floor(daysSince(value));if(!Number.isFinite(days))return'확인 중';if(days===0)return'오늘';if(days===1)return'어제';if(days<30)return `${days}일 전`;if(days<365)return `${Math.floor(days/30)}개월 전`;return `${Math.floor(days/365)}년 전`}
function projectHealthMarkup(tool){const status=activityStatus(tool),score=openShelfScore(tool).score;return `<div class="health-meta" title="${status.label}"><span class="activity-dot ${status.tone}" aria-hidden="true"></span><span class="score-badge" title="OpenShelf Score ${score}/100">OS ${score}</span></div>`}
function popularityMeta(tool){return tool.github&&Number.isFinite(Number(tool.stars))?`<div class="popularity-meta" title="GitHub Stars"><span>★ ${compactNumber(tool.stars)}</span>${Number(tool.starDelta1d||0)>0?`<span class="trend-mini">+${compactNumber(tool.starDelta1d)}</span>`:''}</div>`:''}
function searchableSections(tool){return [
  ['이름',tool.name],['한줄 설명',tool.description],['상세 설명',tool.longDescription],['카테고리',tool.category],
  ['태그',(tool.tags||[]).join(' · ')],['지원 에이전트',(tool.supportedAgents||[]).join(' · ')],
  ['필요 환경',(tool.requirements||[]).join(' · ')],['사용 방법',(tool.usageSteps||[]).join(' ')],
  ['설치',(tool.install||[]).flatMap(x=>[x.title,x.command,x.note]).filter(Boolean).join(' · ')],['라이선스',tool.license]
].filter(x=>x[1])}
function snippetTerms(query=state.query){const parsed=parseSmartQuery(query);return expandedTerms(parsed.text).flatMap(g=>g.variants).map(normalizeSearch).filter(x=>x.length>1)}
function searchSnippet(tool,query=state.query){
  if(!query)return null;
  const terms=snippetTerms(query),sections=searchableSections(tool);
  let best=null;
  for(const [label,value] of sections){const raw=String(value),norm=normalizeSearch(raw);let pos=-1,matched='';for(const t of terms){const p=norm.indexOf(t);if(p>=0&&(pos<0||p<pos)){pos=p;matched=t}}if(pos<0)continue;const weight=label==='이름'?100:label==='카테고리'?80:label==='태그'?75:label==='지원 에이전트'?72:label==='한줄 설명'?65:label==='상세 설명'?55:40;const candidate={label,raw,pos,matched,weight};if(!best||candidate.weight>best.weight)best=candidate}
  if(!best){const reason=searchMatchReason(tool,query);return {label:reason,text:tool.description||tool.longDescription||''}}
  const raw=best.raw;const lc=raw.toLowerCase();const hit=Math.max(0,lc.indexOf(best.matched.toLowerCase()));const start=Math.max(0,hit-55);const end=Math.min(raw.length,hit+best.matched.length+105);let text=raw.slice(start,end).trim();if(start>0)text='…'+text;if(end<raw.length)text+='…';return {label:best.label,text};
}
function facetSource(){return tools.filter(tool=>{if(state.query&&searchScore(tool,state.query)<=0)return false;if(state.category!=='전체'&&tool.category!==state.category)return false;if(state.favoritesOnly&&!favorites.has(tool.id))return false;return true})}
function renderSearchFacets(){
  if(!els.searchFacets)return;
  if(!state.query){els.searchFacets.hidden=true;els.searchFacets.innerHTML='';return}
  const base=facetSource();if(!base.length){els.searchFacets.hidden=true;els.searchFacets.innerHTML='';return}
  const platformCounts=['Web','Windows','macOS','Linux'].map(p=>[p,base.filter(t=>(t.platforms||[]).includes(p)).length]).filter(x=>x[1]>0);
  const categoryCounts=[...new Set(base.map(t=>t.category))].map(c=>[c,base.filter(t=>t.category===c).length]).sort((a,b)=>b[1]-a[1]).slice(0,3);
  const freeCount=base.filter(t=>t.free).length,openCount=base.filter(t=>t.openSource).length;
  const buttons=[];
  for(const [p,n] of platformCounts)buttons.push(`<button type="button" data-facet-platform="${p}" class="${state.platform===p?'active':''}">${p} <b>${n}</b></button>`);
  if(freeCount)buttons.push(`<button type="button" data-facet-free class="${state.free?'active':''}">무료 <b>${freeCount}</b></button>`);
  if(openCount)buttons.push(`<button type="button" data-facet-open class="${state.openSource?'active':''}">오픈소스 <b>${openCount}</b></button>`);
  for(const [c,n] of categoryCounts)buttons.push(`<button type="button" data-facet-category="${c}" class="${state.category===c?'active':''}">${c} <b>${n}</b></button>`);
  els.searchFacets.innerHTML='<span>빠르게 좁히기</span>'+buttons.join('');els.searchFacets.hidden=false;
  els.searchFacets.querySelectorAll('[data-facet-platform]').forEach(btn=>btn.addEventListener('click',()=>{state.platform=state.platform===btn.dataset.facetPlatform?'all':btn.dataset.facetPlatform;els.platformFilter.value=state.platform;renderTools()}));
  els.searchFacets.querySelectorAll('[data-facet-free]').forEach(btn=>btn.addEventListener('click',()=>{state.free=!state.free;els.freeOnly.checked=state.free;renderTools()}));
  els.searchFacets.querySelectorAll('[data-facet-open]').forEach(btn=>btn.addEventListener('click',()=>{state.openSource=!state.openSource;els.openSourceOnly.checked=state.openSource;renderTools()}));
  els.searchFacets.querySelectorAll('[data-facet-category]').forEach(btn=>btn.addEventListener('click',()=>{state.category=state.category===btn.dataset.facetCategory?'전체':btn.dataset.facetCategory;renderChips();renderTools()}));
}
function queryIntentLabel(query=state.query){const parts=splitOrQuery(query);const labels=[...new Set(parts.flatMap(q=>parseSmartQuery(q).intent?.labels||[]))];return labels.slice(0,2).join(' · ')}
function searchMatchReason(tool,query=state.query){
  if(!query)return'';
  const parsed=parseSmartQuery(query);const q=normalizeSearch(parsed.text);
  if(!q)return '조건 일치';
  const name=normalizeSearch(tool.name),cat=normalizeSearch(tool.category),tags=normalizeSearch((tool.tags||[]).join(' ')),desc=normalizeSearch([tool.description,tool.longDescription].join(' '));
  const terms=expandedTerms(q).flatMap(g=>g.variants);
  if(terms.some(t=>name.includes(t)))return '이름 일치';
  if(terms.some(t=>cat.includes(t)))return '카테고리 일치';
  if(terms.some(t=>tags.includes(t)))return '태그 일치';
  if(terms.some(t=>desc.includes(t)))return '설명 일치';
  const intent=queryIntentLabel(query);return intent?`의도 · ${intent}`:'유사 검색';
}
function seoulDateKey(date=new Date()){return new Date(date.getTime()+9*60*60*1000).toISOString().slice(0,10)}
function isAddedToday(tool){return String(tool.added||'')===seoulDateKey()}
function isLatestDiscoveryRun(tool){if(!tool)return false;if(discoveryState?.lastRun&&tool.addedAt)return tool.addedAt===discoveryState.lastRun;const fallbackCount=Math.max(0,Number(discoveryState?.lastAddedCount||20));return tools.slice(0,fallbackCount).some(t=>t.id===tool.id)}
function formatSeoulDateTime(value){if(!value)return'—';const d=new Date(value);if(Number.isNaN(d.getTime()))return'—';return new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(d)}
function nextDiscoveryText(){const now=new Date();const kst=new Date(now.getTime()+9*60*60*1000);kst.setUTCMinutes(0,0,0);kst.setUTCHours(kst.getUTCHours()+1);return String(kst.getUTCHours()).padStart(2,'0')+':00경'}
function renderDiscoveryStatus(){if(!els.discoveryStatusBadge)return;const s=discoveryState||{};const status=s.lastStatus||'success';els.discoveryStatusBadge.textContent=status==='partial'?'PARTIAL':status==='success'?'ONLINE':'READY';els.discoveryStatusBadge.dataset.status=status;els.discoveryLastRun.textContent=formatSeoulDateTime(s.lastRun);els.discoveryLastAdded.textContent=Number.isFinite(Number(s.lastAddedCount))?'+'+Number(s.lastAddedCount):'—';els.discoveryRejected.textContent=Number.isFinite(Number(s.lastRejectedCount))?String(Number(s.lastRejectedCount)):'—';els.discoveryTotal.textContent=Number(s.totalAutoAdded||0).toLocaleString();const errors=Array.isArray(s.lastBatchErrors)?s.lastBatchErrors.length:0;els.discoveryBatch.textContent=errors?errors+'건':'없음';els.discoveryNextRun.textContent=nextDiscoveryText()}
function card(tool){
  const snippet=state.query?searchSnippet(tool):null;
  return `<article class="card" data-tone="${categoryTone(tool.category)}" data-id="${tool.id}">${isLatestDiscoveryRun(tool)?'<span class="card-new-badge">NEW</span>':''}<div class="card-head">${visualMarkup(tool)}<div class="card-meta"><span class="category">${tool.category}</span>${projectHealthMarkup(tool)}${state.query?`<span class="match-reason">${searchMatchReason(tool)}</span>`:''}<button class="favorite-btn ${favorites.has(tool.id)?'active':''}" data-favorite="${tool.id}" type="button" aria-label="즐겨찾기">${favorites.has(tool.id)?'♥':'♡'}</button></div></div><h2>${highlightText(tool.name)}</h2><p>${highlightText(tool.description)}</p>${snippet&&snippet.text&&normalizeSearch(snippet.text)!==normalizeSearch(tool.description)?`<div class="search-snippet"><span>${escapeHtml(snippet.label)}</span><p>${highlightText(snippet.text)}</p></div>`:''}<div class="tags">${tagsFor(tool).slice(0,3).map(tagMarkup).join('')}</div><div class="card-bottom-meta"><div class="platforms">${tool.platforms.join(' · ')}</div>${popularityMeta(tool)}</div><div class="card-actions">${tool.website?`<a class="primary" href="${tool.website}" target="_blank" rel="noreferrer">사용하기 ↗</a>`:''}<button type="button" data-preview="${tool.id}">미리보기</button><button type="button" data-detail="${tool.id}">자세히</button><button type="button" class="compare-pick ${compareSelected.has(tool.id)?'active':''}" data-compare="${tool.id}">${compareSelected.has(tool.id)?'비교중':'비교'}</button></div></article>`;
}
function syncUrl(detailId=null){const p=new URLSearchParams();if(state.query)p.set('q',state.query);if(state.category!=='전체')p.set('category',state.category);if(state.platform!=='all')p.set('platform',state.platform);if(state.openSource)p.set('open','1');if(state.free)p.set('free','1');if(state.favoritesOnly)p.set('favorites','1');if(state.todayOnly)p.set('today','1');if(state.sort!=='popular')p.set('sort',state.sort);if(detailId)p.set('tool',detailId);const next=location.pathname+(p.toString()?'?'+p.toString():'')+location.hash;history.replaceState(null,'',next)}
function restoreStateFromUrl(){const p=new URLSearchParams(location.search);state.query=(p.get('q')||'').toLowerCase();state.category=p.get('category')||'전체';state.platform=p.get('platform')||'all';state.openSource=p.get('open')==='1';state.free=p.get('free')==='1';state.favoritesOnly=p.get('favorites')==='1';state.todayOnly=p.get('today')==='1';state.sort=p.get('sort')||'popular';els.search.value=state.query;els.platformFilter.value=state.platform;els.openSourceOnly.checked=state.openSource;els.freeOnly.checked=state.free;els.favoritesOnly.checked=state.favoritesOnly;if(els.todayOnly)els.todayOnly.checked=state.todayOnly;els.sortSelect.value=state.sort}
function renderTools(){let results=tools.filter(toolMatches);if(state.query)results.sort((a,b)=>searchScore(b,state.query)-searchScore(a,state.query)||(b.stars||0)-(a.stars||0));else if(state.sort==='name')results.sort((a,b)=>a.name.localeCompare(b.name));else if(state.sort==='newest')results.sort((a,b)=>String(b.addedAt||b.added||'').localeCompare(String(a.addedAt||a.added||'')));else if(state.sort==='featured')results.sort((a,b)=>(b.featured||0)-(a.featured||0)||(b.stars||0)-(a.stars||0));else if(state.sort==='trending')results.sort((a,b)=>Number(b.starDelta1d||0)-Number(a.starDelta1d||0)||(b.stars||0)-(a.stars||0));else if(state.sort==='score')results.sort((a,b)=>openShelfScore(b).score-openShelfScore(a).score||(b.stars||0)-(a.stars||0));else results.sort((a,b)=>(b.stars||0)-(a.stars||0)||(b.forks||0)-(a.forks||0)||(b.featured||0)-(a.featured||0));previewToolIds=results.map(t=>t.id);els.toolGrid.innerHTML=results.map(card).join('');els.resultCount.textContent=`${results.length} tools`;els.resultContext.textContent=resultContextText();els.emptyState.hidden=results.length!==0;renderActiveFilters();renderSearchFacets();bindDynamicEvents();syncUrl()}
function miniToolCard(tool,badge=''){return `<article class="latest-card" data-tone="${categoryTone(tool.category)}" data-mini-tool="${tool.id}" tabindex="0"><div class="latest-top">${visualMarkup(tool)}${badge?`<span class="latest-badge">${badge}</span>`:''}</div><span class="latest-category">${escapeHtml(tool.category)}</span><h3>${escapeHtml(tool.name)}</h3><p>${escapeHtml(tool.description)}</p><time>${tool.starDelta1d>0?`★ +${Number(tool.starDelta1d).toLocaleString()} / 24h`:(tool.added||'')}</time></article>`}
function bindMiniCards(root){root?.querySelectorAll('[data-mini-tool]').forEach(el=>{const open=()=>openDetail(el.dataset.miniTool);el.addEventListener('click',open);el.addEventListener('keydown',e=>{if(e.key==='Enter')open()})})}
function renderTrending(){if(!els.trendingGrid||!els.trendingSection)return;const rising=[...tools].filter(t=>Number(t.starDelta1d||0)>0).sort((a,b)=>Number(b.starDelta1d||0)-Number(a.starDelta1d||0)||(b.stars||0)-(a.stars||0)).slice(0,4);if(!rising.length){els.trendingSection.hidden=true;return}els.trendingSection.hidden=false;els.trendingGrid.innerHTML=rising.map(t=>miniToolCard(t,`+${compactNumber(t.starDelta1d)}`)).join('');bindMiniCards(els.trendingGrid)}
function stableHash(text){
  let h=2166136261;
  for(const ch of String(text||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}
  return h>>>0;
}
function dailyDiscoveryCandidates(){
  const day=seoulDateKey();
  const ranked=[...tools].filter(t=>!t.githubArchived&&activityStatus(t).tone!=='dead').map(t=>{
    const score=openShelfScore(t).score;
    const stars=Math.log10(Number(t.stars||0)+1)*6;
    const activity=Math.max(0,14-Math.min(14,daysSince(t.githubPushedAt||t.githubUpdatedAt)/15));
    const recent=String(t.added||'')===day?16:Math.max(0,8-Math.min(8,daysSince(t.addedAt||t.added)/10));
    const jitter=(stableHash(day+'|'+t.id)%1000)/100;
    return {tool:t,rank:score*1.4+stars+activity+recent+jitter};
  }).sort((a,b)=>b.rank-a.rank);

  const picked=[],categories=new Set();
  for(const x of ranked){
    if(picked.length>=5)break;
    if(categories.has(x.tool.category)&&picked.length<4)continue;
    picked.push(x.tool);categories.add(x.tool.category);
  }
  for(const x of ranked){
    if(picked.length>=5)break;
    if(!picked.some(t=>t.id===x.tool.id))picked.push(x.tool);
  }
  return picked;
}
function renderDailyDiscovery(){
  if(!els.dailyDiscoveryGrid)return;
  const day=seoulDateKey();
  const picked=dailyDiscoveryCandidates();
  if(els.dailyDiscoveryDate)els.dailyDiscoveryDate.textContent=day.replaceAll('-','.')+' · 매일 새롭게 고르는 5개';
  els.dailyDiscoveryGrid.innerHTML=picked.map((t,i)=>{
    const status=activityStatus(t);
    return '<article class="daily-card" data-daily-tool="'+escapeHtml(t.id)+'" tabindex="0"><div class="daily-index">0'+(i+1)+'</div><div class="daily-main"><div class="daily-top">'+visualMarkup(t)+'<div><span>'+escapeHtml(t.category)+'</span><b>'+escapeHtml(scoreLabel(openShelfScore(t).score))+' · OS '+openShelfScore(t).score+'</b></div></div><h3>'+escapeHtml(t.name)+'</h3><p>'+escapeHtml(t.description)+'</p><footer><span class="activity-dot '+status.tone+'"></span>'+escapeHtml(status.label)+'<strong>★ '+compactNumber(t.stars||0)+'</strong></footer></div></article>';
  }).join('');
  els.dailyDiscoveryGrid.querySelectorAll('[data-daily-tool]').forEach(el=>{
    const open=()=>openDetail(el.dataset.dailyTool);
    el.addEventListener('click',open);
    el.addEventListener('keydown',e=>{if(e.key==='Enter')open()});
  });
}
const workflowDefinitions=[
  {
    id:'research',
    kicker:'RESEARCH FLOW',
    title:'웹 자료를 찾고 정리하기',
    description:'웹에서 자료를 모으고, 필요한 내용을 찾고, AI로 정리하는 흐름.',
    steps:[
      {label:'수집',match:t=>t.category==='브라우저 자동화'||(t.tags||[]).some(x=>/크롤|스크랩|browser/i.test(x))},
      {label:'검색',match:t=>t.category==='지식·검색'},
      {label:'정리',match:t=>t.category==='AI 에이전트'||t.category==='AI 모델'}
    ]
  },
  {
    id:'build',
    kicker:'BUILD FLOW',
    title:'AI로 개발 작업 이어가기',
    description:'코딩 보조부터 자동화, 지식 연결까지 개발 흐름을 한 번에.',
    steps:[
      {label:'개발',match:t=>t.category==='개발 도구'},
      {label:'에이전트',match:t=>t.category==='AI 에이전트'},
      {label:'자동화',match:t=>t.category==='업무 자동화'}
    ]
  },
  {
    id:'docs',
    kicker:'KNOWLEDGE FLOW',
    title:'문서를 만들고 지식으로 쌓기',
    description:'문서를 다루고 검색 가능한 지식으로 만든 뒤 반복 작업까지 줄이는 조합.',
    steps:[
      {label:'문서',match:t=>t.category==='문서'},
      {label:'지식',match:t=>t.category==='지식·검색'},
      {label:'자동화',match:t=>t.category==='업무 자동화'}
    ]
  },
  {
    id:'create',
    kicker:'CREATE FLOW',
    title:'아이디어를 시각 결과물로',
    description:'아이디어 생성부터 디자인과 영상 결과물까지 이어지는 제작 조합.',
    steps:[
      {label:'아이디어',match:t=>t.category==='AI 모델'||t.category==='AI 에이전트'},
      {label:'디자인',match:t=>t.category==='디자인·시각화'},
      {label:'영상',match:t=>t.category==='영상·애니메이션'}
    ]
  }
];
function workflowPick(match,used){
  return tools.filter(t=>!used.has(t.id)&&match(t)&&!t.githubArchived).sort((a,b)=>{
    const as=openShelfScore(a).score,bs=openShelfScore(b).score;
    return bs-as||Number(b.stars||0)-Number(a.stars||0);
  })[0]||null;
}
function renderWorkflows(){
  if(!els.workflowGrid)return;
  els.workflowGrid.innerHTML=workflowDefinitions.map(w=>{
    const used=new Set();
    const selected=w.steps.map(step=>{const tool=workflowPick(step.match,used);if(tool)used.add(tool.id);return {step,tool}}).filter(x=>x.tool);
    if(selected.length<2)return '';
    return '<article class="workflow-card"><div class="workflow-head"><span>'+escapeHtml(w.kicker)+'</span><h3>'+escapeHtml(w.title)+'</h3><p>'+escapeHtml(w.description)+'</p></div><div class="workflow-steps">'+selected.map((x,i)=>'<button type="button" data-workflow-tool="'+escapeHtml(x.tool.id)+'"><em>0'+(i+1)+'</em><span>'+escapeHtml(x.step.label)+'</span><strong>'+escapeHtml(x.tool.name)+'</strong><small>'+escapeHtml(x.tool.description)+'</small></button>').join('')+'</div></article>';
  }).join('');
  els.workflowGrid.querySelectorAll('[data-workflow-tool]').forEach(btn=>btn.addEventListener('click',()=>openDetail(btn.dataset.workflowTool)));
}
const AI_CLIENT_KEY='openshelf-ai-client-v1';
function getAiClientId(){
  let id='';
  try{id=localStorage.getItem(AI_CLIENT_KEY)||'';}
  catch(error){console.warn('OpenShelf: AI client ID storage unavailable',error);}
  if(!id){
    id='c_'+Math.random().toString(36).slice(2)+Date.now().toString(36);
    try{localStorage.setItem(AI_CLIENT_KEY,id);}
    catch(error){console.warn('OpenShelf: AI client ID not persisted',error);}
  }
  return id;
}
function requestAiRecommendation(query){
  return new Promise((resolve,reject)=>{
    const base=window.OPENSHELF_AI_URL||window.OPENSHELF_ADMIN_URL||'';
    if(!base){reject(new Error('AI 추천 서버 주소가 설정되지 않았습니다.'));return}
    const callback='__openshelfAi_'+Date.now()+'_'+Math.random().toString(36).slice(2);
    const script=document.createElement('script');
    const cleanup=()=>{try{delete window[callback]}catch{};script.remove()};
    const timer=setTimeout(()=>{cleanup();reject(new Error('AI 추천 응답 시간이 초과되었습니다.'))},30000);
    window[callback]=data=>{clearTimeout(timer);cleanup();resolve(data)};
    script.onerror=()=>{clearTimeout(timer);cleanup();reject(new Error('AI 추천 서버에 연결하지 못했습니다.'))};
    const sep=base.includes('?')?'&':'?';
    script.src=base+sep+'action=recommend&q='+encodeURIComponent(query)+'&client='+encodeURIComponent(getAiClientId())+'&callback='+encodeURIComponent(callback)+'&_='+Date.now();
    document.head.appendChild(script);
  });
}
function renderAiRecommendation(data){
  if(!els.aiFinderResult)return;
  const steps=Array.isArray(data.steps)?data.steps:[];
  const alternatives=Array.isArray(data.alternatives)?data.alternatives:[];
  const stepMarkup=steps.map((step,i)=>{
    const tool=tools.find(t=>String(t.id)===String(step.toolId));
    if(!tool)return'';
    return '<article class="ai-step"><div class="ai-step-no">0'+(i+1)+'</div><div class="ai-step-body"><span>'+escapeHtml(step.role||'추천 단계')+'</span><h3>'+escapeHtml(tool.name)+'</h3><p>'+escapeHtml(step.reason||tool.description||'')+'</p><div class="ai-step-meta">'+escapeHtml(tool.category)+' · OS '+openShelfScore(tool).score+' · ★ '+compactNumber(tool.stars||0)+'</div><button type="button" data-ai-open="'+escapeHtml(tool.id)+'">도구 자세히 보기 →</button></div></article>';
  }).join('');
  const altMarkup=alternatives.map(a=>{
    const tool=tools.find(t=>String(t.id)===String(a.toolId));
    if(!tool)return'';
    return '<button type="button" class="ai-alt" data-ai-open="'+escapeHtml(tool.id)+'"><strong>'+escapeHtml(tool.name)+'</strong><span>'+escapeHtml(a.reason||tool.description||'')+'</span></button>';
  }).join('');
  els.aiFinderResult.innerHTML='<div class="ai-result-head"><span>GEMINI RECOMMENDATION</span><h3>'+escapeHtml(data.title||'추천 워크플로')+'</h3><p>'+escapeHtml(data.summary||'')+'</p></div><div class="ai-steps">'+stepMarkup+'</div>'+(altMarkup?'<div class="ai-alternatives"><h4>대체 도구</h4>'+altMarkup+'</div>':'');
  els.aiFinderResult.hidden=false;
  els.aiFinderResult.querySelectorAll('[data-ai-open]').forEach(btn=>btn.addEventListener('click',()=>openDetail(btn.dataset.aiOpen)));
}
function setupAiFinder(){
  if(!els.aiFinderForm||els.aiFinderForm.dataset.ready==='1')return;
  els.aiFinderForm.dataset.ready='1';
  document.querySelectorAll('[data-ai-example]').forEach(btn=>btn.addEventListener('click',()=>{
    els.aiFinderInput.value=btn.dataset.aiExample||'';
    els.aiFinderInput.focus();
  }));
  els.aiFinderForm.addEventListener('submit',async e=>{
    e.preventDefault();
    const query=String(els.aiFinderInput.value||'').trim();
    if(query.length<4){
      els.aiFinderStatus.hidden=false;
      els.aiFinderStatus.className='ai-finder-status error';
      els.aiFinderStatus.textContent='하고 싶은 일을 조금 더 자세히 적어주세요.';
      return;
    }
    els.aiFinderSubmit.disabled=true;
    els.aiFinderSubmit.textContent='Gemini가 조합 찾는 중...';
    els.aiFinderStatus.hidden=false;
    els.aiFinderStatus.className='ai-finder-status loading';
    els.aiFinderStatus.textContent='OpenShelf 도구를 분석해 작업 조합을 만들고 있습니다.';
    els.aiFinderResult.hidden=true;
    try{
      const data=await requestAiRecommendation(query);
      if(!data||!data.ok)throw new Error((data&&data.error)||'추천 결과를 만들지 못했습니다.');
      els.aiFinderStatus.hidden=true;
      renderAiRecommendation(data);
    }catch(err){
      els.aiFinderStatus.hidden=false;
      els.aiFinderStatus.className='ai-finder-status error';
      els.aiFinderStatus.textContent=String(err&&err.message?err.message:err);
    }finally{
      els.aiFinderSubmit.disabled=false;
      els.aiFinderSubmit.textContent='AI로 조합 찾기 →';
    }
  });
}
function rememberRecentlyViewed(id){recentlyViewed=[id,...recentlyViewed.filter(x=>x!==id)].slice(0,8);writeStoredList(RECENTLY_VIEWED_KEY,recentlyViewed);renderRecentlyViewed()}
function renderRecentlyViewed(){if(!els.recentlyViewedGrid||!els.recentlyViewedSection)return;const items=recentlyViewed.map(id=>tools.find(t=>t.id===id)).filter(Boolean).slice(0,4);if(!items.length){els.recentlyViewedSection.hidden=true;return}els.recentlyViewedSection.hidden=false;els.recentlyViewedGrid.innerHTML=items.map(t=>miniToolCard(t,'RECENT')).join('');bindMiniCards(els.recentlyViewedGrid)}
function renderCompareBar(){if(!els.compareBar)return;const n=compareSelected.size;els.compareBar.hidden=n===0;els.compareCount.textContent=n;els.openCompare.disabled=n<2;document.body.classList.toggle('compare-active',n>0)}
function toggleCompare(id){if(compareSelected.has(id))compareSelected.delete(id);else if(compareSelected.size<4)compareSelected.add(id);renderCompareBar();renderTools()}
function compareValue(tool,key){if(key==='score')return `${openShelfScore(tool).score}/100`;if(key==='status')return activityStatus(tool).label;if(key==='activity')return relativeActivityDate(tool.githubPushedAt||tool.githubUpdatedAt);if(key==='platforms')return (tool.platforms||[]).join(', ')||'—';if(key==='license')return tool.license||'확인 필요';if(key==='price')return tool.free?'무료':'유/무료 혼합';if(key==='open')return tool.openSource?'오픈소스':'아님/확인 필요';if(key==='stars')return Number(tool.stars||0).toLocaleString();if(key==='trend')return Number(tool.starDelta1d||0)>0?`+${Number(tool.starDelta1d).toLocaleString()}`:'—';if(key==='agents')return (tool.supportedAgents||[]).slice(0,5).join(', ')||'—';return'—'}
function openCompareDialog(){const selected=[...compareSelected].map(id=>tools.find(t=>t.id===id)).filter(Boolean);if(selected.length<2)return;const rows=[['OpenShelf Score','score'],['프로젝트 상태','status'],['최근 GitHub 활동','activity'],['카테고리','category'],['플랫폼','platforms'],['라이선스','license'],['가격','price'],['오픈소스','open'],['GitHub Stars','stars'],['24시간 증가','trend'],['지원 에이전트','agents']];els.compareDialogContent.innerHTML=`<div class="dialog-body"><div class="usage-guide-title"><span>COMPARE TOOLS</span><h3>도구 비교</h3></div><div class="compare-table-wrap"><table class="compare-table"><thead><tr><th>항목</th>${selected.map(t=>`<th><button type="button" data-compare-detail="${t.id}">${escapeHtml(t.name)}</button></th>`).join('')}</tr></thead><tbody>${rows.map(([label,key])=>`<tr><th>${label}</th>${selected.map(t=>`<td>${key==='category'?escapeHtml(t.category):escapeHtml(compareValue(t,key))}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;els.compareDialogContent.querySelectorAll('[data-compare-detail]').forEach(btn=>btn.addEventListener('click',()=>{els.compareDialog.close();openDetail(btn.dataset.compareDetail)}));els.compareDialog.showModal();document.body.classList.add('dialog-open')}
function renderLatest(){const latest=[...tools].sort((a,b)=>String(b.addedAt||b.added||'').localeCompare(String(a.addedAt||a.added||''))).slice(0,4);els.latestGrid.innerHTML=latest.map(tool=>`<article class="latest-card" data-tone="${categoryTone(tool.category)}" data-latest="${tool.id}" tabindex="0"><div class="latest-top">${visualMarkup(tool)}${isLatestDiscoveryRun(tool)?'<span class="latest-badge">NEW</span>':''}</div><span class="latest-category">${tool.category}</span><h3>${tool.name}</h3><p>${tool.description}</p><time datetime="${tool.added||''}">${tool.added||''}</time></article>`).join('');els.latestGrid.querySelectorAll('[data-latest]').forEach(el=>{const open=()=>openDetail(el.dataset.latest);el.addEventListener('click',open);el.addEventListener('keydown',e=>{if(e.key==='Enter')open()})})}
function relatedTools(tool){
  const sourceTags=new Set((tool.tags||[]).map(x=>normalizeSearch(x)));
  return tools.filter(t=>t.id!==tool.id&&!t.githubArchived&&(t.category===tool.category||(t.tags||[]).some(tag=>sourceTags.has(normalizeSearch(tag))))).map(t=>{
    const shared=(t.tags||[]).filter(tag=>sourceTags.has(normalizeSearch(tag))).length;
    return {tool:t,rank:(t.category===tool.category?18:0)+shared*7+openShelfScore(t).score/10+Math.log10(Number(t.stars||0)+1)};
  }).sort((a,b)=>b.rank-a.rank).slice(0,4).map(x=>x.tool);
}
const companionCategoryMap={
  '문서':['지식·검색','업무 자동화','AI 에이전트'],
  '지식·검색':['문서','AI 에이전트','브라우저 자동화'],
  '브라우저 자동화':['업무 자동화','지식·검색','AI 에이전트'],
  '개발 도구':['AI 에이전트','업무 자동화','AI 평가'],
  'AI 에이전트':['개발 도구','지식·검색','업무 자동화'],
  'AI 모델':['AI 평가','개발 도구','AI 에이전트'],
  'AI 평가':['AI 모델','AI 에이전트','개발 도구'],
  '디자인·시각화':['영상·애니메이션','AI 모델','3D·CAD'],
  '영상·애니메이션':['디자인·시각화','AI 모델','업무 자동화'],
  '3D·CAD':['디자인·시각화','업무 자동화','개발 도구'],
  '교육·학습':['지식·검색','문서','AI 에이전트'],
  '공간정보':['디자인·시각화','개발 도구','지식·검색'],
  '업무 자동화':['AI 에이전트','브라우저 자동화','문서']
};
function companionTools(tool){
  const preferred=companionCategoryMap[tool.category]||[];
  const sourceTags=new Set((tool.tags||[]).map(x=>normalizeSearch(x)));
  return tools.filter(t=>t.id!==tool.id&&!t.githubArchived&&t.category!==tool.category).map(t=>{
    const categoryRank=preferred.indexOf(t.category);
    const shared=(t.tags||[]).filter(tag=>sourceTags.has(normalizeSearch(tag))).length;
    const rank=(categoryRank>=0?30-categoryRank*5:0)+shared*4+openShelfScore(t).score/12+Math.log10(Number(t.stars||0)+1);
    return {tool:t,rank};
  }).filter(x=>x.rank>7).sort((a,b)=>b.rank-a.rank).slice(0,3).map(x=>x.tool);
}
function categoryAudience(tool){
  const map={
    'AI 에이전트':'AI 작업을 여러 단계로 연결하거나 반복 업무를 에이전트에 맡기려는 사용자',
    '개발 도구':'코딩·디버깅·개발 환경을 더 빠르게 다루려는 개발자',
    '업무 자동화':'반복 작업을 줄이고 여러 서비스를 연결하려는 사용자',
    '지식·검색':'자료를 찾고 모아 검색 가능한 지식으로 만들려는 사용자',
    '디자인·시각화':'아이디어를 화면·다이어그램·그래픽으로 빠르게 표현하려는 사용자',
    '문서':'PDF·Office 등 문서를 만들고 변환하거나 정리하려는 사용자',
    '브라우저 자동화':'브라우저에서 반복되는 클릭·수집 작업을 자동화하려는 사용자',
    'AI 모델':'AI 모델을 직접 실행·비교·활용하려는 사용자',
    'AI 평가':'AI 모델이나 에이전트의 품질을 점검하려는 사용자',
    '교육·학습':'학습 자료를 만들거나 학습 과정을 보조하려는 사용자',
    '공간정보':'지도·위치·공간 데이터를 분석하거나 시각화하려는 사용자',
    '3D·CAD':'3D 모델이나 CAD 작업을 만들고 편집하려는 사용자',
    '영상·애니메이션':'영상·애니메이션 제작 과정을 보조하거나 자동화하려는 사용자'
  };
  return map[tool.category]||'이 분야의 작업을 더 효율적으로 처리하려는 사용자';
}
function detailQuickSummaryMarkup(tool){
  const platforms=(tool.platforms||[]).join(', ')||'플랫폼 정보 확인 필요';
  const firstStep=tool.usageSteps?.[0]||tool.usageNote||tool.description;
  const fit=categoryAudience(tool);
  return `<div class="detail-group quick-summary"><div class="detail-group-head"><span>3-MINUTE BRIEF</span><h3>3분 요약</h3></div><div class="quick-summary-grid"><article><span>무엇을 하는 도구?</span><p>${escapeHtml(tool.description)}</p></article><article><span>누구에게 맞나?</span><p>${escapeHtml(fit)}</p></article><article><span>언제 쓰면 좋나?</span><p>${escapeHtml(firstStep)}</p></article><article><span>바로 확인할 것</span><p>${escapeHtml(platforms)} · ${escapeHtml(tool.license||'라이선스 확인 필요')}</p></article></div></div>`;
}
function quickStartMarkup(tool){
  const hasInstall=Array.isArray(tool.install)&&tool.install.length;
  const hasSteps=Array.isArray(tool.usageSteps)&&tool.usageSteps.length;
  if(!hasInstall&&!hasSteps&&!tool.examplePrompt)return'';
  const install=hasInstall?`<div class="quick-start-command"><span>INSTALL</span><code>${escapeHtml(tool.install[0].command||'')}</code><button type="button" data-copy-command="0">복사</button></div>`:'';
  const steps=hasSteps?`<ol class="quick-start-steps">${tool.usageSteps.slice(0,3).map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ol>`:'';
  const prompt=tool.examplePrompt?`<div class="quick-start-prompt"><span>EXAMPLE</span><p>${escapeHtml(tool.examplePrompt)}</p><button type="button" data-copy-prompt>예시 복사</button></div>`:'';
  return `<div class="detail-group quick-start"><div class="detail-group-head"><span>QUICK START</span><h3>빠른 시작</h3></div>${install}${steps}${prompt}</div>`;
}
function cautionMarkup(tool){
  const cautions=[];
  const status=activityStatus(tool);
  if(status.tone==='stale'||status.tone==='quiet')cautions.push('최근 업데이트 주기가 긴 편입니다. 도입 전 현재 유지보수 상태를 확인하세요.');
  if(!tool.license||/확인 필요|unknown|noassertion/i.test(String(tool.license)))cautions.push('라이선스가 명확히 확인되지 않았습니다.');
  if(!(tool.platforms||[]).length)cautions.push('지원 플랫폼 정보가 충분하지 않습니다.');
  if(!(tool.install||[]).length)cautions.push('OpenShelf에 검증된 설치 명령이 아직 등록되지 않았습니다.');
  if(tool.requirements?.length)cautions.push('필요 환경: '+tool.requirements.slice(0,3).join(' · '));
  if(!cautions.length)cautions.push('현재 등록 정보 기준으로 큰 주의사항은 확인되지 않았습니다. 실제 도입 전 공식 문서를 함께 확인하세요.');
  return `<div class="detail-group detail-cautions"><div class="detail-group-head"><span>BEFORE YOU USE</span><h3>사용 전 체크</h3></div><ul>${cautions.slice(0,4).map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul></div>`;
}
function toolRelationCard(tool,label){
  return `<button type="button" class="relation-card" data-related="${escapeHtml(tool.id)}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(tool.name)}</strong><small>${escapeHtml(tool.category)} · OS ${openShelfScore(tool).score}</small><p>${escapeHtml(tool.description)}</p></button>`;
}
function usageGuideMarkup(tool){if(!tool.install?.length&&!tool.usageSteps?.length&&!tool.requirements?.length&&!tool.examplePrompt)return'';const requirements=tool.requirements?.length?`<div class="usage-subsection"><h4>필요한 환경</h4><div class="requirement-list">${tool.requirements.map(x=>`<span>${escapeHtml(x)}</span>`).join('')}</div></div>`:'';const installs=tool.install?.length?`<div class="usage-subsection"><h4>설치</h4>${tool.install.map((x,i)=>`<div class="install-block"><div class="install-head"><strong>${escapeHtml(x.title||'설치 명령어')}</strong><button type="button" data-copy-command="${i}">복사</button></div><code>${escapeHtml(x.command)}</code>${x.note?`<p>${escapeHtml(x.note)}</p>`:''}</div>`).join('')}</div>`:'';const steps=tool.usageSteps?.length?`<div class="usage-subsection"><h4>사용 순서</h4><ol class="usage-steps">${tool.usageSteps.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ol></div>`:'';const prompt=tool.examplePrompt?`<div class="usage-subsection"><h4>예시 요청</h4><div class="prompt-example"><code>${escapeHtml(tool.examplePrompt)}</code><button type="button" data-copy-prompt>복사</button></div></div>`:'';const agents=tool.supportedAgents?.length?`<div class="usage-subsection"><h4>지원 에이전트</h4><div class="requirement-list">${tool.supportedAgents.map(x=>`<span>${escapeHtml(x)}</span>`).join('')}</div></div>`:'';return `<div class="usage-guide"><div class="usage-guide-title"><span>FULL GUIDE</span><h3>전체 사용 정보</h3></div>${tool.usageNote?`<p class="usage-note">${escapeHtml(tool.usageNote)}</p>`:''}${requirements}${installs}${steps}${prompt}${agents}</div>`}
function bindUsageCopy(tool){els.dialogContent.querySelectorAll('[data-copy-command]').forEach(btn=>btn.addEventListener('click',async()=>{const item=tool.install?.[Number(btn.dataset.copyCommand)];if(!item)return;try{await navigator.clipboard.writeText(item.command);const old=btn.textContent;btn.textContent='복사됨';setTimeout(()=>btn.textContent=old,1200)}catch{}}));const promptBtn=els.dialogContent.querySelector('[data-copy-prompt]');if(promptBtn&&tool.examplePrompt)promptBtn.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(tool.examplePrompt);const old=promptBtn.textContent;promptBtn.textContent='복사됨';setTimeout(()=>promptBtn.textContent=old,1200)}catch{}})}
function detailSummaryMarkup(tool){
  const score=openShelfScore(tool).score,status=activityStatus(tool);
  return `<div class="detail-summary"><div><span>OpenShelf Score</span><strong>${score}</strong><small>/100 · ${scoreLabel(score)}</small></div><div><span>프로젝트 상태</span><strong class="summary-status"><i class="activity-dot ${status.tone}"></i>${status.label}</strong><small>${relativeActivityDate(tool.githubPushedAt||tool.githubUpdatedAt)}</small></div><div><span>GitHub</span><strong>★ ${compactNumber(tool.stars||0)}</strong><small>${Number(tool.starDelta1d||0)>0?'24h +'+compactNumber(tool.starDelta1d):'최근 증가량 없음'}</small></div></div>`;
}
function projectInfoMarkup(tool){
  const release=tool.latestRelease?.tag||tool.latestRelease?.name||'없음/확인되지 않음';
  return `<div class="detail-group"><div class="detail-group-head"><span>PROJECT INFO</span><h3>프로젝트 정보</h3></div><div class="detail-meta"><div class="detail-box"><span>플랫폼</span><strong>${escapeHtml((tool.platforms||[]).join(', ')||'—')}</strong></div><div class="detail-box"><span>라이선스</span><strong>${escapeHtml(tool.license||'확인 필요')}</strong></div><div class="detail-box"><span>가격</span><strong>${tool.free?'무료':'유/무료 혼합'}</strong></div><div class="detail-box"><span>오픈소스</span><strong>${tool.openSource?'예':'아니오/확인 필요'}</strong></div><div class="detail-box"><span>최근 GitHub 활동</span><strong>${relativeActivityDate(tool.githubPushedAt||tool.githubUpdatedAt)}</strong></div><div class="detail-box"><span>최신 릴리즈</span><strong>${escapeHtml(release)}</strong></div><div class="detail-box"><span>Forks</span><strong>${Number(tool.forks||0).toLocaleString()}</strong></div><div class="detail-box"><span>Open Issues</span><strong>${Number(tool.openIssues||0).toLocaleString()}</strong></div></div></div>`;
}
function qualityPanelMarkup(tool){
  const score=openShelfScore(tool),status=activityStatus(tool);
  const release=tool.latestRelease?.tag||tool.latestRelease?.name||'없음/확인되지 않음';
  const pushed=relativeActivityDate(tool.githubPushedAt||tool.githubUpdatedAt);
  return `<div class="quality-panel"><div class="quality-head"><div><span>OPENSHELF SCORE</span><strong>${score.score}<small>/100</small></strong><em>${scoreLabel(score.score)}</em></div><div><span class="activity-badge ${status.tone}">${status.label}</span><p>최근 GitHub 활동: ${pushed}</p><p>최신 릴리즈: ${escapeHtml(release)}</p><p>Open issues: ${Number(tool.openIssues||0).toLocaleString()}</p></div></div><div class="score-breakdown">${score.parts.map(([label,value])=>`<div><span>${label}</span><b>${value}</b></div>`).join('')}</div><p class="score-note">점수는 프로젝트 활동성·라이선스·오픈소스 여부·인기도·릴리즈·OpenShelf 정보 충실도를 합산한 참고 지표입니다.</p></div>`;
}
function openDetail(id){
  const tool=tools.find(t=>t.id===id);if(!tool)return;
  rememberRecentlyViewed(id);
  const related=relatedTools(tool),companions=companionTools(tool),isFav=favorites.has(tool.id);
  els.dialogContent.innerHTML=`<div class="dialog-body detail-v2" style="--tool-tint:var(--soft)">
    <div class="dialog-hero">${visualMarkup(tool,true)}<div><span class="dialog-kicker">${escapeHtml(tool.category)}</span><div class="dialog-title-row"><h2>${escapeHtml(tool.name)}</h2><button class="dialog-favorite ${isFav?'active':''}" type="button" data-dialog-favorite="${escapeHtml(tool.id)}">${isFav?'♥ 저장됨':'♡ 즐겨찾기'}</button></div><p>${escapeHtml(tool.longDescription||tool.description)}</p></div></div>
    ${detailSummaryMarkup(tool)}
    <div class="detail-primary-actions">${tool.website?`<a class="primary" href="${escapeHtml(tool.website)}" target="_blank" rel="noreferrer">사용하기 ↗</a>`:''}${tool.github?`<a href="${escapeHtml(tool.github)}" target="_blank" rel="noreferrer">GitHub ↗</a>`:''}</div>
    ${detailQuickSummaryMarkup(tool)}
    ${quickStartMarkup(tool)}
    <div class="detail-group"><div class="detail-group-head"><span>OVERVIEW</span><h3>기능과 특징</h3></div><div class="tags">${tagsFor(tool).map(tagMarkup).join('')}</div><p class="detail-usecase">${escapeHtml(tool.longDescription||tool.description)}</p></div>
    ${cautionMarkup(tool)}
    ${usageGuideMarkup(tool)}
    ${projectInfoMarkup(tool)}
    ${qualityPanelMarkup(tool)}
    ${related.length?`<div class="detail-group relation-section"><div class="detail-group-head"><span>SIMILAR TOOLS</span><h3>비슷한 도구</h3></div><div class="relation-grid">${related.map(r=>toolRelationCard(r,'대체재')).join('')}</div></div>`:''}
    ${companions.length?`<div class="detail-group relation-section companion-section"><div class="detail-group-head"><span>WORKS WELL WITH</span><h3>함께 쓰면 좋은 도구</h3></div><p class="relation-intro">같은 기능을 대체하는 도구가 아니라, 이 도구의 앞·뒤 작업을 보완할 만한 도구입니다.</p><div class="relation-grid">${companions.map(r=>toolRelationCard(r,'보완 도구')).join('')}</div></div>`:''}
  </div>`;
  els.dialogContent.querySelectorAll('[data-related]').forEach(btn=>btn.addEventListener('click',()=>openDetail(btn.dataset.related)));
  const favBtn=els.dialogContent.querySelector('[data-dialog-favorite]');if(favBtn)favBtn.addEventListener('click',()=>{toggleFavorite(tool.id);openDetail(tool.id)});
  els.dialogContent.querySelectorAll('[data-tag]').forEach(btn=>btn.addEventListener('click',()=>{const tag=decodeURIComponent(btn.dataset.tag);closeDialog();applyTagFilter(tag)}));
  bindUsageCopy(tool);els.toolDialog.showModal();document.body.classList.add('dialog-open');syncUrl(tool.id);
}
function quickPreviewMarkup(tool){
  const score=openShelfScore(tool).score;
  const status=activityStatus(tool);
  const install=tool.install?.[0]?.command||'';
  const platforms=(tool.platforms||[]).join(' · ')||'플랫폼 정보 확인 중';
  return `<div class="quick-preview-hero">${visualMarkup(tool,true)}<div><span>${escapeHtml(tool.category)}</span><h2>${escapeHtml(tool.name)}</h2><p>${escapeHtml(tool.description)}</p></div></div>
    <div class="quick-preview-facts">
      <div><span>OpenShelf Score</span><strong>${score}/100</strong><small>${escapeHtml(scoreLabel(score))}</small></div>
      <div><span>프로젝트 상태</span><strong><i class="activity-dot ${status.tone}"></i>${escapeHtml(status.label)}</strong><small>${escapeHtml(relativeActivityDate(tool.githubPushedAt||tool.githubUpdatedAt))}</small></div>
      <div><span>플랫폼</span><strong>${escapeHtml(platforms)}</strong><small>${escapeHtml(tool.license||'라이선스 확인 필요')}</small></div>
      <div><span>GitHub Stars</span><strong>★ ${compactNumber(tool.stars||0)}</strong><small>${Number(tool.starDelta1d||0)>0?'24h +'+compactNumber(tool.starDelta1d):'최근 증가량 없음'}</small></div>
    </div>
    ${install?`<div class="quick-preview-install"><span>INSTALL</span><code>${escapeHtml(install)}</code><button type="button" data-preview-copy>복사</button></div>`:''}
    <div class="quick-preview-actions">
      ${tool.website?`<a class="primary" href="${escapeHtml(tool.website)}" target="_blank" rel="noreferrer">사용하기 ↗</a>`:''}
      ${tool.github?`<a href="${escapeHtml(tool.github)}" target="_blank" rel="noreferrer">GitHub ↗</a>`:''}
      <button type="button" data-preview-detail="${escapeHtml(tool.id)}">상세보기 →</button>
    </div>`;
}
function openQuickPreview(id){
  const tool=tools.find(t=>t.id===id);if(!tool||!els.quickPreview)return;
  currentPreviewId=id;
  els.quickPreviewContent.innerHTML=quickPreviewMarkup(tool);
  els.quickPreview.classList.add('open');
  els.quickPreview.setAttribute('aria-hidden','false');
  document.body.classList.add('preview-open');
  const idx=previewToolIds.indexOf(id);
  if(els.quickPreviewPosition)els.quickPreviewPosition.textContent=(idx>=0?idx+1:1)+' / '+Math.max(previewToolIds.length,1);
  if(els.quickPreviewPrev)els.quickPreviewPrev.disabled=idx<=0;
  if(els.quickPreviewNext)els.quickPreviewNext.disabled=idx<0||idx>=previewToolIds.length-1;
  els.quickPreviewContent.querySelector('[data-preview-detail]')?.addEventListener('click',()=>{closeQuickPreview();openDetail(id)});
  els.quickPreviewContent.querySelector('[data-preview-copy]')?.addEventListener('click',async e=>{
    const command=tool.install?.[0]?.command||'';
    if(!command)return;
    try{await navigator.clipboard.writeText(command);const old=e.currentTarget.textContent;e.currentTarget.textContent='복사됨';setTimeout(()=>e.currentTarget.textContent=old,1000)}catch{}
  });
}
function closeQuickPreview(){
  if(!els.quickPreview)return;
  currentPreviewId='';
  els.quickPreview.classList.remove('open');
  els.quickPreview.setAttribute('aria-hidden','true');
  document.body.classList.remove('preview-open');
}
function moveQuickPreview(direction){
  if(!currentPreviewId||!previewToolIds.length)return;
  const idx=previewToolIds.indexOf(currentPreviewId);
  const next=Math.max(0,Math.min(previewToolIds.length-1,idx+direction));
  if(next!==idx)openQuickPreview(previewToolIds[next]);
}
function closeDialog(){els.toolDialog.close();document.body.classList.remove('dialog-open');syncUrl()}
function toggleFavorite(id){favorites.has(id)?favorites.delete(id):favorites.add(id);saveFavorites();renderTools()}
function bindDynamicEvents(){els.toolGrid.querySelectorAll('[data-favorite]').forEach(btn=>btn.addEventListener('click',e=>{e.stopPropagation();toggleFavorite(btn.dataset.favorite)}));els.toolGrid.querySelectorAll('[data-preview]').forEach(btn=>btn.addEventListener('click',e=>{e.stopPropagation();openQuickPreview(btn.dataset.preview)}));els.toolGrid.querySelectorAll('.card[data-id]').forEach(cardEl=>{cardEl.addEventListener('mouseenter',()=>{if(window.matchMedia('(hover:hover) and (pointer:fine)').matches){clearTimeout(previewHoverTimer);previewHoverTimer=setTimeout(()=>openQuickPreview(cardEl.dataset.id),450)}});cardEl.addEventListener('mouseleave',()=>clearTimeout(previewHoverTimer))});els.toolGrid.querySelectorAll('[data-detail]').forEach(btn=>btn.addEventListener('click',()=>{closeQuickPreview();openDetail(btn.dataset.detail)}));els.toolGrid.querySelectorAll('[data-tag]').forEach(btn=>btn.addEventListener('click',e=>{e.stopPropagation();applyTagFilter(decodeURIComponent(btn.dataset.tag))}));els.toolGrid.querySelectorAll('[data-compare]').forEach(btn=>btn.addEventListener('click',e=>{e.stopPropagation();toggleCompare(btn.dataset.compare)}))}
function resetFilters(scroll=true){clearTimeout(searchRenderTimer);searchRenderTimer=null;Object.assign(state,{category:'전체',query:'',openSource:false,free:false,favoritesOnly:false,todayOnly:false,platform:'all',sort:'popular'});els.search.value='';if(els.searchSuggestions){els.searchSuggestions.hidden=true;els.searchSuggestions.innerHTML=''};if(els.searchFacets){els.searchFacets.hidden=true;els.searchFacets.innerHTML=''};if(els.searchSuggestions){els.searchSuggestions.hidden=true;els.searchSuggestions.innerHTML=''};els.openSourceOnly.checked=false;els.freeOnly.checked=false;els.favoritesOnly.checked=false;if(els.todayOnly)els.todayOnly.checked=false;els.platformFilter.value='all';els.sortSelect.value='popular';renderChips();renderTools();if(scroll)document.querySelector('#tools').scrollIntoView({behavior:'smooth'})}
function renderStats(){const categoryCount=new Set(tools.map(t=>t.category)).size;const platformCount=new Set(tools.flatMap(t=>t.platforms)).size;const openCount=tools.filter(t=>t.openSource).length;els.statCategories.textContent=categoryCount;els.statPlatforms.textContent=platformCount;els.statOpenSource.textContent=openCount;if(els.heroCategoryCount)els.heroCategoryCount.textContent=categoryCount;if(els.heroOpenSourceCount)els.heroOpenSourceCount.textContent=openCount}
function resultContextText(){const parts=[];if(state.query){const intent=queryIntentLabel(state.query);parts.push(`“${state.query}” 관련도순${intent?' · '+intent:''}`);}if(state.category!=='전체')parts.push(state.category);if(state.platform!=='all')parts.push(state.platform);if(state.openSource)parts.push('오픈소스');if(state.free)parts.push('무료');if(state.favoritesOnly)parts.push('즐겨찾기');if(state.todayOnly)parts.push('오늘 추가');return parts.length?' · '+parts.join(' · '):' · 전체 도구'}
function activeFilterItems(){const items=[];if(state.query)items.push({key:'query',label:`검색: ${state.query}`});if(state.category!=='전체')items.push({key:'category',label:state.category});if(state.platform!=='all')items.push({key:'platform',label:state.platform});if(state.openSource)items.push({key:'openSource',label:'오픈소스'});if(state.free)items.push({key:'free',label:'무료'});if(state.favoritesOnly)items.push({key:'favoritesOnly',label:'즐겨찾기'});if(state.todayOnly)items.push({key:'todayOnly',label:'오늘 추가'});return items}
function clearOneFilter(key){if(key==='query'){state.query='';els.search.value=''}else if(key==='category'){state.category='전체';renderChips()}else if(key==='platform'){state.platform='all';els.platformFilter.value='all'}else if(key==='openSource'){state.openSource=false;els.openSourceOnly.checked=false}else if(key==='free'){state.free=false;els.freeOnly.checked=false}else if(key==='favoritesOnly'){state.favoritesOnly=false;els.favoritesOnly.checked=false}else if(key==='todayOnly'){state.todayOnly=false;if(els.todayOnly)els.todayOnly.checked=false}renderTools()}
function renderActiveFilters(){const items=activeFilterItems();els.activeFilters.hidden=items.length===0;if(!items.length){els.activeFilters.innerHTML='';return}els.activeFilters.innerHTML=items.map(x=>`<span class="active-filter">${x.label}<button type="button" data-clear-filter="${x.key}" aria-label="${x.label} 제거">×</button></span>`).join('')+`<button type="button" class="active-filter clear-all" data-clear-all>전체 해제</button>`;els.activeFilters.querySelectorAll('[data-clear-filter]').forEach(btn=>btn.addEventListener('click',()=>clearOneFilter(btn.dataset.clearFilter)));els.activeFilters.querySelector('[data-clear-all]').addEventListener('click',()=>resetFilters(false))}
function openFavorites(){state.favoritesOnly=true;els.favoritesOnly.checked=true;closeMobileMenu();document.querySelector('#tools').scrollIntoView({behavior:'smooth'});renderTools()}
function toggleMobileMenu(){const open=!els.mobileMenu.classList.contains('open');els.mobileMenu.classList.toggle('open',open);els.mobileMenuButton.classList.toggle('active',open);els.mobileMenuButton.setAttribute('aria-expanded',String(open));els.mobileMenu.setAttribute('aria-hidden',String(!open));document.body.classList.toggle('menu-open',open)}
function closeMobileMenu(){els.mobileMenu.classList.remove('open');els.mobileMenuButton.classList.remove('active');els.mobileMenuButton.setAttribute('aria-expanded','false');els.mobileMenu.setAttribute('aria-hidden','true');document.body.classList.remove('menu-open')}
function setupReveal(){const items=document.querySelectorAll('.reveal');if(!('IntersectionObserver'in window)){items.forEach(x=>x.classList.add('visible'));return}const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');io.unobserve(e.target)}}),{threshold:.12});items.forEach(x=>io.observe(x))}
function setupActiveNav(){const navLinks=[...document.querySelectorAll('[data-nav]')];const sections=navLinks.map(a=>document.querySelector('#'+a.dataset.nav)).filter(Boolean);const update=()=>{const probe=window.scrollY+120;let active='';for(const section of sections){if(probe>=section.offsetTop)active=section.id}navLinks.forEach(a=>a.classList.toggle('active',!!active&&a.dataset.nav===active));document.querySelector('.topbar')?.classList.toggle('compact',window.scrollY>120)};let scheduled=false;const scheduleUpdate=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;update()})};window.addEventListener('scroll',scheduleUpdate,{passive:true});window.addEventListener('resize',scheduleUpdate);update()}
let searchRenderTimer=null;
function flushSearchRender(){clearTimeout(searchRenderTimer);searchRenderTimer=null;renderTools();renderSearchSuggestions()}
els.search.addEventListener('input',e=>{state.query=e.target.value.trim();if(state.query&&state.category!=='전체'){state.category='전체';renderChips()}clearTimeout(searchRenderTimer);searchRenderTimer=setTimeout(flushSearchRender,120)});
els.search.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){if(moveSearchSuggestion(1))e.preventDefault();return}if(e.key==='ArrowUp'){if(moveSearchSuggestion(-1))e.preventDefault();return}if(e.key==='Enter'){e.preventDefault();clearTimeout(searchRenderTimer);searchRenderTimer=null;const active=els.searchSuggestions?.querySelector('.search-suggestion.keyboard-active');if(active){saveRecentSearch(state.query);els.searchSuggestions.hidden=true;openDetail(active.dataset.searchTool);return}saveRecentSearch(state.query);els.searchSuggestions.hidden=true;renderTools();document.querySelector('#tools').scrollIntoView({behavior:'smooth',block:'start'})}else if(e.key==='Escape'){els.searchSuggestions.hidden=true}});
els.search.addEventListener('focus',()=>{els.searchWrap.classList.add('focused');renderSearchSuggestions()});
els.search.addEventListener('blur',()=>{els.searchWrap.classList.remove('focused');setTimeout(()=>{if(els.searchSuggestions)els.searchSuggestions.hidden=true},120)});
els.openSourceOnly.addEventListener('change',e=>{state.openSource=e.target.checked;renderTools()});els.freeOnly.addEventListener('change',e=>{state.free=e.target.checked;renderTools()});els.favoritesOnly.addEventListener('change',e=>{state.favoritesOnly=e.target.checked;renderTools()});els.todayOnly?.addEventListener('change',e=>{state.todayOnly=e.target.checked;renderTools()});els.platformFilter.addEventListener('change',e=>{state.platform=e.target.value;renderTools()});els.sortSelect.addEventListener('change',e=>{state.sort=e.target.value;renderTools()});
let adminGateClicks=0;
let adminGateTimer=null;
els.adminGate?.addEventListener('click',()=>{
  adminGateClicks+=1;
  clearTimeout(adminGateTimer);
  adminGateTimer=setTimeout(()=>{adminGateClicks=0},3500);
  if(adminGateClicks<5)return;
  adminGateClicks=0;
  clearTimeout(adminGateTimer);
  const url=String(window.OPENSHELF_ADMIN_URL||'').trim();
  if(!url){
    alert('관리자 페이지 주소가 아직 연결되지 않았습니다.');
    return;
  }
  window.open(url,'openshelf-admin','noopener,noreferrer');
});
els.favoritesNav.addEventListener('click',openFavorites);els.mobileFavorites.addEventListener('click',openFavorites);els.scrollToAll.addEventListener('click',()=>document.querySelector('#tools').scrollIntoView({behavior:'smooth'}));els.resetFilters.addEventListener('click',()=>resetFilters());els.dialogClose.addEventListener('click',closeDialog);els.toolDialog.addEventListener('click',e=>{if(e.target===els.toolDialog)closeDialog()});els.mobileMenuButton.addEventListener('click',toggleMobileMenu);els.mobileMenu.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',closeMobileMenu));
document.addEventListener('keydown',e=>{if(e.key==='/'&&document.activeElement!==els.search){e.preventDefault();els.search.focus()}if(e.key==='Escape'&&els.toolDialog.open)closeDialog();else if(e.key==='Escape')closeMobileMenu()});
async function loadTools(){els.loadingState.hidden=false;els.errorState.hidden=true;els.toolGrid.hidden=true;try{const [r,sr]=await Promise.all([fetch('./data/tools.json',{cache:'no-store'}),fetch('./data/discovery-state.json',{cache:'no-store'})]);if(!r.ok)throw new Error('load failed');tools=await r.json();discoveryState=sr.ok?await sr.json():null;restoreStateFromUrl();els.heroToolCount.textContent=tools.length;saveFavorites();renderChips();renderCategories();renderCollections();renderLatest();renderTrending();renderDailyDiscovery();renderWorkflows();setupAiFinder();renderRecentlyViewed();renderStats();renderDiscoveryStatus();renderTools();els.loadingState.hidden=true;els.toolGrid.hidden=false;setupReveal();setupActiveNav();const detailId=new URLSearchParams(location.search).get('tool');if(detailId&&tools.some(t=>t.id===detailId))openDetail(detailId)}catch{els.loadingState.hidden=true;els.errorState.hidden=false;els.toolGrid.hidden=true}}
els.retryLoad.addEventListener('click',loadTools);
window.addEventListener('popstate',()=>{if(!tools.length)return;restoreStateFromUrl();renderChips();renderTools();const detailId=new URLSearchParams(location.search).get('tool');if(detailId)openDetail(detailId);else if(els.toolDialog.open)closeDialog()});
els.clearRecentlyViewed?.addEventListener('click',()=>{recentlyViewed=[];removeStoredList(RECENTLY_VIEWED_KEY);renderRecentlyViewed()});
els.clearCompare?.addEventListener('click',()=>{compareSelected.clear();renderCompareBar();renderTools()});
els.openCompare?.addEventListener('click',openCompareDialog);
els.compareDialogClose?.addEventListener('click',()=>{els.compareDialog.close();document.body.classList.remove('dialog-open')});
els.compareDialog?.addEventListener('click',e=>{if(e.target===els.compareDialog){els.compareDialog.close();document.body.classList.remove('dialog-open')}});
els.quickPreviewClose?.addEventListener('click',closeQuickPreview);
els.quickPreviewPrev?.addEventListener('click',()=>moveQuickPreview(-1));
els.quickPreviewNext?.addEventListener('click',()=>moveQuickPreview(1));
document.addEventListener('keydown',e=>{
  if(!els.quickPreview?.classList.contains('open')||els.toolDialog?.open||els.compareDialog?.open)return;
  if(e.key==='Escape'){closeQuickPreview();return}
  if(e.key==='ArrowLeft')moveQuickPreview(-1);
  if(e.key==='ArrowRight')moveQuickPreview(1);
});
loadTools();
