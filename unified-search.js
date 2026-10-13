import {normalize,rank,filterResults,makeUrl,suggestQueries,sortResults,SORT_MODES,filterFacets,facetOptions} from './unified-search-core.mjs';
import {recommendWithGemini} from './gemini-direct-client.js';
import {hasSavedKey,savePrivateKey,unlockPrivateKey,removeSavedKey} from './gemini-key-vault.js';
let activeGeminiKey=null;
const $=id=>document.getElementById(id);
const types=[['tool','오픈소스'],['api','Public API'],['file','Public Data']];
const state={provider:'',category:'',format:'',sort:new URLSearchParams(location.search).get('sort')||'relevance',rows:[],failed:[],loaded:0,page:1,query:new URLSearchParams(location.search).get('q')||'',type:new URLSearchParams(location.search).get('type')||'all'};
if(!SORT_MODES.includes(state.sort))state.sort='relevance';$('sort').value=state.sort;$('query').value=state.query;$('type').value=types.some(x=>x[0]===state.type)?state.type:'all';
const text=(tag,cls,value)=>{const node=document.createElement(tag);if(cls)node.className=cls;node.textContent=value;return node};
const get=async url=>{const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),20000);try{const res=await fetch(url,{cache:'no-store',signal:controller.signal});if(!res.ok)throw Error('HTTP '+res.status+' '+url);return await res.json()}finally{clearTimeout(timeout)}};
function card(item){
 const node=text('article','result-card','');
 const meta=text('div','result-meta',types.find(t=>t[0]===item.type)?.[1]||'');
 const title=text('h3','',item.name);
 const info=text('p','result-provider',item.provider||item.category||'');
 const summary=text('p','result-summary',item.summary||item.description||'설명이 등록되지 않았습니다.');
 const actions=text('div','result-actions','');
 const detail=text('button','result-detail-btn','요약 보기');
 detail.type='button';detail.addEventListener('click',()=>openDetails(item));
 const link=text('a','result-link','전체 상세정보 ↗');link.href=makeUrl(item);
 actions.append(detail,link);node.append(meta,title,info,summary,actions);return node;
}
let detailsPreviousFocus=null;
function openDetails(item){
 const dialog=$('quickDetail');
 detailsPreviousFocus=document.activeElement;
 $('quickTitle').textContent=item.name;
 $('quickType').textContent=types.find(t=>t[0]===item.type)?.[1]||'';
 $('quickProvider').textContent=item.provider||item.category||'정보 없음';
 $('quickCategory').textContent=item.category||'분류 없음';
 $('quickSummary').textContent=item.summary||item.description||'설명이 등록되지 않았습니다.';
 $('quickId').textContent=item.id||'없음';
 $('quickVerification').textContent=item.type==='tool'?'도구 정보는 등록 내용 기준입니다.':'공식 목록 메타데이터 · 실제 이용 가능 여부는 원문에서 확인하세요.';
 $('quickLink').href=makeUrl(item);
 if(!dialog.open)dialog.showModal();
}
function closeDetails(){const dialog=$('quickDetail');if(dialog.open)dialog.close();if(detailsPreviousFocus?.isConnected)detailsPreviousFocus.focus()}
$('quickClose').addEventListener('click',closeDetails);
$('quickDetail').addEventListener('click',event=>{if(event.target===$('quickDetail'))closeDetails()});
$('quickDetail').addEventListener('close',()=>{if(detailsPreviousFocus?.isConnected)detailsPreviousFocus.focus()});
let previousSuggestionsKey='',previousSuggestions=[];
function renderSuggestions(items){const root=$('suggestions');const key=state.query+'|'+state.type+'|'+state.rows.length;if(key!==previousSuggestionsKey){previousSuggestions=suggestQueries(state.rows,state.query,6);previousSuggestionsKey=key}const suggestions=previousSuggestions;root.replaceChildren(...suggestions.map(value=>{const b=text('button','suggestion-chip',value);b.type='button';b.addEventListener('click',()=>{$('query').value=value;state.query=value;state.page=1;refreshCatalogs();$('query').focus()});return b}));root.hidden=!suggestions.length;root.setAttribute('aria-label','연관 검색어 추천')}
let cachedBaseKey='',cachedBaseRows=null,cachedBaseResults=[];
function baseResults(){const key=state.query+'|'+state.type;if(cachedBaseRows!==state.rows||cachedBaseKey!==key){cachedBaseRows=state.rows;cachedBaseKey=key;cachedBaseResults=filterResults(state.rows,state.query,state.type)}return cachedBaseResults}
let cachedViewKey='',cachedViewBase=null,cachedViewResults=[];
function viewResults(){const base=baseResults(),key=[state.provider,state.category,state.format,state.sort].join('|');if(base!==cachedViewBase||key!==cachedViewKey){cachedViewBase=base;cachedViewKey=key;cachedViewResults=sortResults(filterFacets(base,state),state.sort)}return cachedViewResults}
function render(){const items=viewResults();const pages=Math.max(1,Math.ceil(items.length/24));state.page=Math.min(state.page,pages);$('total').textContent=items.length.toLocaleString('ko-KR');$('page').textContent=state.page+' / '+pages;$('prev').disabled=state.page===1;$('next').disabled=state.page===pages;renderSuggestions(items);const list=$('results');list.replaceChildren(...items.slice((state.page-1)*24,state.page*24).map(card));$('empty').hidden=items.length>0||requiredTypes().some(type=>pending.has(type));const u=new URL(location.href);if(state.query)u.searchParams.set('q',state.query);else u.searchParams.delete('q');if(state.type!=='all')u.searchParams.set('type',state.type);else u.searchParams.delete('type');if(state.sort!=='relevance')u.searchParams.set('sort',state.sort);else u.searchParams.delete('sort');history.replaceState(null,'',u)}
function populateFacets(){const source=baseResults();for(const field of ['provider','category','format']){const select=$(field+'Facet');const options=facetOptions(source,field);const values=new Set(options.map(x=>x.value));if(state[field]&&!values.has(state[field])){options.unshift({value:state[field],count:0})}select.replaceChildren(new Option(field==='provider'?'전체 기관':field==='category'?'전체 분야':'전체 형식',''),...options.map(x=>new Option(x.value+' ('+x.count.toLocaleString('ko-KR')+')',x.value)));select.value=state[field]}};
let timer;$('query').addEventListener('input',e=>{clearTimeout(timer);timer=setTimeout(()=>{state.query=e.target.value;state.page=1;refreshCatalogs()},180)});$('type').addEventListener('change',e=>{state.type=e.target.value;state.page=1;refreshCatalogs()});for(const field of ['provider','category','format'])$(field+'Facet').addEventListener('change',e=>{state[field]=e.target.value;state.page=1;render()});$('clearFacets').addEventListener('click',()=>{for(const field of ['provider','category','format']){state[field]='';$(field+'Facet').value=''}state.page=1;render()});$('sort').addEventListener('change',e=>{state.sort=e.target.value;state.page=1;render()});$('prev').addEventListener('click',()=>{state.page--;render()});$('next').addEventListener('click',()=>{state.page++;render()});
function validItem(item,type){return item&&typeof item.id==='string'&&typeof item.name==='string'&&item.name.trim()&&(type==='tool'||/^\d{7,8}$/.test(item.id))}
async function loadCatalog(manifestFile,type,pattern){const manifest=await get(manifestFile);if(!Array.isArray(manifest.parts)||manifest.parts.length>150||!Number.isInteger(manifest.total))throw Error('Invalid '+type+' manifest');let cursor=0;const groups=Array(manifest.parts.length);const failures=[];await Promise.all(Array.from({length:Math.min(6,manifest.parts.length)},async()=>{while(cursor<manifest.parts.length){const i=cursor++,part=manifest.parts[i];if(!pattern.test(part)){failures.push(part);continue}try{const shard=await get('data/'+part);if(shard.verification!=='metadata-only'||!Array.isArray(shard.items)||shard.items.length>1000)throw Error('Invalid shard');groups[i]=shard.items.filter(item=>validItem(item,type)).map(item=>({...item,type}))}catch(error){failures.push(part)}}}));if(failures.length)throw Error(type+' 일부 파일 누락 ('+failures.length+')');const items=groups.flat();if(items.length!==manifest.total||new Set(items.map(x=>x.id)).size!==items.length)throw Error(type+' count or duplicate mismatch');return items}
// V28: load only the selected catalog; an empty "all" query opens with tools.
const sources={
 tool:async()=>{const data=await get('data/tools.json');if(!Array.isArray(data))throw Error('Invalid tools list');return data.filter(x=>validItem(x,'tool')).map(x=>({...x,type:'tool',summary:x.description||'',provider:x.category||''}))},
 api:()=>loadCatalog('data/public-api-official-list.json','api',new RegExp('^public-api-csv/part-[0-9]{2}[.]json$')),
 file:()=>loadCatalog('data/public-data-official-list.json','file',new RegExp('^public-data-csv/part-[0-9]{2,3}[.]json$'))
};
const cache=new Map(),pending=new Map(),errors=new Map();
function requiredTypes(){return state.type==='all'?(state.query.trim()?['tool','api','file']:['tool']):[state.type]}
function displayState(){const required=requiredTypes();state.rows=required.flatMap(type=>cache.get(type)||[]);populateFacets();render();const wait=required.filter(type=>pending.has(type));const failed=required.filter(type=>errors.has(type));$('status').textContent=wait.length?'목록 불러오는 중: '+wait.join(', ')+' · '+state.rows.length.toLocaleString('ko-KR')+'건 표시':failed.length?'일부 목록 실패: '+failed.join(', ')+' · 다시 불러오기 가능':state.type==='all'&&!state.query.trim()?'오픈소스를 먼저 표시합니다. 전체 검색어를 입력하면 API·파일데이터를 추가로 불러옵니다.':'검색 준비 완료 · '+state.rows.length.toLocaleString('ko-KR')+'건';$('retry').hidden=!failed.length}
async function ensure(type){if(cache.has(type)||pending.has(type))return pending.get(type);const task=sources[type]().then(rows=>{cache.set(type,rows);errors.delete(type)}).catch(error=>{console.error('Catalog load error',type,error);errors.set(type,error)}).finally(()=>{pending.delete(type);displayState()});pending.set(type,task);return task}
function refreshCatalogs(){for(const type of requiredTypes())void ensure(type);displayState()}
$('retry').addEventListener('click',()=>{for(const type of requiredTypes())if(errors.has(type)){cache.delete(type);errors.delete(type)}refreshCatalogs()});
refreshCatalogs();

function updateKeyStatus(){ $('geminiKeyStatus').textContent=activeGeminiKey?'이 브라우저에서 잠금 해제됨':hasSavedKey()?'암호화된 키가 이 브라우저에 저장됨 · 사용하려면 잠금 해제':'이 브라우저에 저장된 키 없음';}
$('geminiSave').addEventListener('click',async()=>{
 const keyInput=$('geminiKeyInput'),passwordInput=$('geminiPassword'),saveButton=$('geminiSave');
 const key=keyInput.value.trim(),password=passwordInput.value;
 saveButton.disabled=true;
 try{
  await savePrivateKey(key,password);
  activeGeminiKey=await unlockPrivateKey(password);
  keyInput.value='';passwordInput.value='';
  updateKeyStatus();
  $('aiStatus').textContent='이 브라우저에 암호화 저장하고 잠금 해제했습니다. 이제 AI 검색을 사용할 수 있습니다. 새로고침 후에는 잠금 해제가 필요합니다.';
 }catch(error){
  activeGeminiKey=null;
  updateKeyStatus();
  $('aiStatus').textContent='저장하지 못했습니다: '+(error?.message||'브라우저 저장소 접근을 확인해 주세요.');
 }finally{saveButton.disabled=false}
});
$('geminiUnlock').addEventListener('click',async()=>{
 try{activeGeminiKey=await unlockPrivateKey($('geminiPassword').value);$('geminiPassword').value='';updateKeyStatus();$('aiStatus').textContent='개인 Gemini 키 잠금 해제 완료'}
 catch(e){activeGeminiKey=null;$('aiStatus').textContent=e.message;updateKeyStatus()}
});
$('geminiLock').addEventListener('click',()=>{activeGeminiKey=null;$('geminiPassword').value='';updateKeyStatus();$('aiStatus').textContent='잠금 처리했습니다.'});
$('geminiDelete').addEventListener('click',()=>{activeGeminiKey=null;removeSavedKey();$('geminiKeyInput').value='';$('geminiPassword').value='';updateKeyStatus();$('aiStatus').textContent='이 브라우저에 저장된 키를 삭제했습니다.'});
updateKeyStatus();
async function askAi(){
 const question=$('aiQuestion').value.trim(),button=$('aiAsk');
 if(question.length<4){$('aiStatus').textContent='질문을 4자 이상 입력해 주세요.';return}
 $('aiAnswer').hidden=true;
 if(!activeGeminiKey){$('aiStatus').textContent='먼저 이 기기의 Gemini API 키를 저장하고 비밀번호로 잠금 해제하세요.';return}
 button.disabled=true;$('aiStatus').textContent='관련 목록 검색 중…';
 try{
  const pendingTypes=requiredTypes();for(const type of pendingTypes)await ensure(type);
  const rows=pendingTypes.flatMap(type=>cache.get(type)||[]);
  const tokens=normalize(question).split(/\s+/).filter(x=>x.length>=2&&!/^(싶어|해줘|알려줘|찾아줘|어떻게|만들고|싶어요|관련|추천|도구|데이터|정보)$/.test(x)).slice(0,8);
  let candidates=filterResults(rows,question,state.type).slice(0,12);
  if(!candidates.length){const pool=new Map();for(const token of tokens)for(const row of filterResults(rows,token,state.type).slice(0,12)){const id=row.type+':'+row.id;pool.set(id,{row,count:(pool.get(id)?.count||0)+1})}candidates=[...pool.values()].sort((a,b)=>b.count-a.count).slice(0,12).map(x=>x.row)}
  if(!candidates.length){$('aiStatus').textContent='관련 후보를 찾지 못했습니다. 핵심 키워드를 포함해 다시 질문해 주세요.';return}
  const data=await recommendWithGemini(activeGeminiKey,question,candidates);
  const chosen=(data.ids||[]).map(id=>candidates.find(x=>x.id===id)).filter(Boolean);
  $('aiSummary').textContent=String(data.summary||'추천 결과를 확인해 주세요.');
  $('aiMatches').replaceChildren(...chosen.map(card));$('aiAnswer').hidden=false;
  $('aiStatus').textContent='등록된 후보 '+candidates.length+'건을 기준으로 분석했습니다. AI 설명은 정확성을 확인해 주세요.';
 }catch(error){$('aiStatus').textContent=(error?.message||'AI 추천을 사용할 수 없습니다. 기존 통합 검색은 계속 이용할 수 있습니다.');console.warn('AI search unavailable (details redacted)')}
 finally{button.disabled=false}
}
$('aiAsk').addEventListener('click',askAi);
$('aiQuestion').addEventListener('keydown',event=>{if(event.key==='Enter')void askAi()});
