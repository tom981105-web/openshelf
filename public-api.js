function validatedPublicApis(rows){
 if(!Array.isArray(rows))return [];
 const seen=new Set(),result=[];
 for(const x of rows){
  if(!x||!/^\d{7,8}$/.test(String(x.id)))continue;
  const expected='https://www.data.go.kr/data/'+x.id+'/openapi.do';
  if(x.url!==expected||seen.has(x.id))continue;
  if(![x.name,x.provider,x.category,x.summary,x.approval,x.format].every(v=>typeof v==='string'&&v.length>0))continue;
  seen.add(x.id);result.push(x);
 }
 return result;
}
const SECTOR_RULES=[
 ['교통·물류',/교통|물류|항공|철도|도로|해운|자동차|운송/],
 ['환경·에너지',/환경|에너지|기상|기후|대기|수질|폐기물|자연/],
 ['보건·의료',/보건|의료|건강|질병|식품|의약/],
 ['교육·연구',/교육|연구|과학|기술|학교|학술/],
 ['건축·시설',/건축|시설|주택|도시|국토|건설|토목|소방|안전/],
 ['경제·산업',/경제|산업|금융|재정|기업|고용|노동|무역|조달/],
 ['농림·해양',/농림|농업|축산|산림|수산|해양|어업/],
 ['문화·관광',/문화|관광|체육|예술|여가|여행/],
 ['행정·법률',/행정|법률|법무|공공|정치|지방자치|국방|통계/],
 ['사회·복지',/사회|복지|인구|가족|보육|노인|아동/]
];
function sectorOf(category){
 const name=String(category||'').split(/\s*[-–>]\s*/)[0].trim();
 for(const [label,re] of SECTOR_RULES)if(re.test(name))return label;
 return '기타·미분류';
}
const indexedText=new Map();
function createSearchIndex(rows){indexedText.clear();for(const x of rows)indexedText.set(x.id,[x.id,x.name,x.provider,x.category,x.summary,x.approval,x.format].join(' ').toLocaleLowerCase('ko').normalize('NFKC'));}
function filterPublicApis(items,opts={}) {
 const q=String(opts.query||'').trim().toLocaleLowerCase('ko').normalize('NFKC');
 const terms=q.split(/\s+/).filter(Boolean),cat=opts.category||'',approval=opts.approval||'',format=opts.format||'',provider=opts.provider||'',sector=opts.sector||'',verification=opts.verification||'',verified=opts.verifiedIds;
 return items.filter(x=>{
  if(cat&&x.category!==cat)return false;
  if(sector&&sectorOf(x.category)!==sector)return false;
  if(verification&&verified&&((verification==='verified')!==verified.has(x.id)))return false;
  if(provider&&x.provider!==provider)return false;
  if(approval&&!x.approval.includes(approval))return false;
  if(format&&!x.format.toLocaleLowerCase('ko').includes(format.toLocaleLowerCase('ko')))return false;
  const hay=indexedText.get(x.id)||[x.id,x.name,x.provider,x.category,x.summary,x.approval,x.format].join(' ').toLocaleLowerCase('ko').normalize('NFKC');
  return terms.every(term=>hay.includes(term));
 });
}

const $=id=>document.getElementById(id);let items=[];let verifiedIds=new Set();
const search=$('apiSearch'),category=$('apiCategory'),approval=$('apiApproval'),providerFilter=$('apiProvider'),formatFilter=$('apiFormat'),sectorFilter=$('apiSector'),verificationFilter=$('apiVerification');
const PAGE_SIZE=24;let page=1;
function show(){
 const filtered=filterPublicApis(items,{query:search.value,category:category.value,approval:approval.value,provider:providerFilter.value,format:formatFilter.value,sector:sectorFilter.value,verification:verificationFilter.value,verifiedIds});
 const totalPages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));page=Math.min(page,totalPages);
 const visible=filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);
 $('apiPagination').hidden=filtered.length<=PAGE_SIZE;
 $('apiPageInfo').textContent=page+' / '+totalPages+' 페이지';
 $('apiPrev').disabled=page===1;$('apiNext').disabled=page===totalPages;
 $('apiList').replaceChildren();$('apiEmpty').hidden=filtered.length!==0;
 $('apiStatus').textContent=items.length.toLocaleString('ko-KR')+'개 API 중 '+filtered.length.toLocaleString('ko-KR')+'개 표시';
 for(const item of visible){
  const card=document.createElement('article');card.className='public-card';
  const meta=document.createElement('div');meta.className='public-meta';
  const provider=document.createElement('span');provider.textContent=item.provider;
  const cat=document.createElement('span');cat.textContent=item.category;meta.append(provider,cat);
  const title=document.createElement('h3');title.textContent=item.name;
  const summary=document.createElement('p');summary.textContent=item.summary;
  const bottom=document.createElement('div');bottom.className='public-card-bottom';
  const badge=document.createElement('span');badge.textContent=(verifiedIds.has(item.id)?'상세페이지 확인':'공식 목록 등록')+' · '+item.approval+' · '+item.format;
  const detail=document.createElement('button');detail.type='button';detail.className='public-detail-trigger';detail.textContent='상세정보 보기';detail.addEventListener('click',()=>openApiDetail(item.id));
  const link=document.createElement('a');link.href=item.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='공식 신청 ↗';
  bottom.append(badge,detail,link);card.append(meta,title,summary,bottom);$('apiList').append(card);
 }
}
let detailPreviousFocus=null;
function closeApiDetail(){
 const dialog=$('apiDetailDialog');
 if(!dialog||dialog.hidden)return;
 dialog.hidden=true;document.body.classList.remove('api-detail-open');
 if(detailPreviousFocus&&document.contains(detailPreviousFocus))detailPreviousFocus.focus();
}
function openApiDetail(id){
 const item=items.find(x=>x.id===id);
 if(!item)return;
 const dialog=$('apiDetailDialog');
 if(!dialog)return;
 detailPreviousFocus=document.activeElement;
 $('detailTitle').textContent=item.name;
 $('detailId').textContent=item.id;
 $('detailProvider').textContent=item.provider;
 $('detailCategory').textContent=item.category;
 $('detailSector').textContent=sectorOf(item.category);
 $('detailFormat').textContent=item.format;
 $('detailApproval').textContent=item.approval;
 $('detailSummary').textContent=item.summary;
 const verified=verifiedIds.has(item.id);
 $('detailVerification').textContent=verified?'공식 상세페이지 정보 확인':'공식 CSV 목록 등록 (상세페이지 미확인)';
 $('detailVerificationNote').textContent=verified
  ?'공식 상세페이지에서 이름·기관 등의 메타데이터를 확인한 항목입니다. 실제 API 호출 성공까지 검증한 것은 아닙니다.'
  :'공식 목록 CSV에 등록된 정보입니다. 상세페이지 메타데이터와 실제 API 호출 성공 여부는 검증하지 않았습니다.';
 const official=$('detailOfficialLink');official.href=item.url;
 dialog.hidden=false;document.body.classList.add('api-detail-open');
 $('apiDetailClose').focus();
 const url=new URL(window.location.href);url.searchParams.set('api',item.id);
 history.replaceState(null,'',url);
}
function detailFromUrl(){
 const id=new URLSearchParams(window.location.search).get('api');
 if(id&&/^\\d{7,8}$/.test(id))openApiDetail(id);
}
$('apiDetailClose')?.addEventListener('click',()=>{
 closeApiDetail();
 const url=new URL(window.location.href);url.searchParams.delete('api');history.replaceState(null,'',url);
});
$('apiDetailDialog')?.addEventListener('click',event=>{
 if(event.target===event.currentTarget){closeApiDetail();const url=new URL(location.href);url.searchParams.delete('api');history.replaceState(null,'',url)}
});
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&!$('apiDetailDialog')?.hidden){closeApiDetail();const url=new URL(location.href);url.searchParams.delete('api');history.replaceState(null,'',url)}
});
async function fetchJson(url,{timeoutMs=12000,retries=1}={}){
 for(let attempt=0;attempt<=retries;attempt++){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
   const response=await fetch(url,{cache:'no-store',signal:controller.signal});
   if(!response.ok)throw new Error('HTTP '+response.status+' '+url);
   return await response.json();
  }catch(error){
   if(attempt===retries)throw error;
   await new Promise(resolve=>setTimeout(resolve,400*(attempt+1)));
  }finally{clearTimeout(timer)}
 }
}
function showLoadError(error){
 console.error('OpenShelf Public API catalog load failed',error);
 $('apiTotal').textContent='—';
 $('apiStatus').textContent='목록을 불러오지 못했습니다. 다시 불러오기를 눌러주세요.';
 const retry=$('apiRetry');if(retry)retry.hidden=false;
}
async function loadCsvParts(manifest){
 if(!Array.isArray(manifest.parts)||manifest.parts.length>30||manifest.total>20000||manifest.total<1)throw Error('Invalid CSV manifest');
 const chunks=new Array(manifest.parts.length),failures=[];let cursor=0;
 const workers=Array.from({length:Math.min(4,manifest.parts.length)},async()=>{
  while(cursor<manifest.parts.length){
   const index=cursor++,file=manifest.parts[index];
   try{
    if(!/^public-api-csv\/part-[0-9]{2}[.]json$/.test(file))throw Error('Invalid shard filename');
    const data=await fetchJson('data/'+file,{timeoutMs:11000,retries:2});
    if(data.verification!=='metadata-only'||!Array.isArray(data.items))throw Error('Invalid shard format');
    chunks[index]=validatedPublicApis(data.items);
    $('apiStatus').textContent='공식 API 목록 '+(chunks.filter(Boolean).length)+' / '+manifest.parts.length+'개 파일 확인 중…';
   }catch(error){failures.push(file);console.warn('CSV shard failed',file,error)}
  }
 });
 await Promise.all(workers);
 const all=chunks.flatMap(x=>x||[]);
 const deduped=validatedPublicApis(all);
 if(failures.length===0&&deduped.length!==manifest.total)throw Error('CSV catalog count mismatch');
 return {items:deduped,failures};
}
let loadVersion=0,searchTimer;
async function loadCatalog(){
 const version=++loadVersion;
 $('apiStatus').textContent='공공 API 목록을 불러오는 중…';
 const retry=$('apiRetry');if(retry)retry.hidden=true;
 try{
  const data=await fetchJson('data/public-apis.json',{timeoutMs:12000,retries:2});
  const confirmed=validatedPublicApis(data.items);
  if(!confirmed.length)throw Error('Verified API catalog is empty');
  let listing=[],failures=[];
  try{
   const manifest=await fetchJson('data/public-api-official-list.json',{timeoutMs:10000,retries:1});
   if(manifest.verification==='metadata-only'){
    if(Array.isArray(manifest.parts)){
     const loaded=await loadCsvParts(manifest);listing=loaded.items;failures=loaded.failures;
    }else listing=validatedPublicApis(manifest.items);
   }
  }catch(error){console.warn('Using verified-only fallback',error);failures=['공식 목록 파일']}
  if(version!==loadVersion)return;
  const merged=new Map(listing.map(x=>[x.id,x]));
  for(const item of confirmed)merged.set(item.id,item);
  items=[...merged.values()];
  verifiedIds=new Set(confirmed.map(x=>x.id));
  createSearchIndex(items);
  page=1;
  category.replaceChildren(new Option('모든 세부 분야',''));
  sectorFilter.replaceChildren(new Option('모든 대분류',''));
  providerFilter.replaceChildren(new Option('모든 기관',''));
  const sectors=[...new Set(items.map(x=>sectorOf(x.category)))].sort((a,b)=>a.localeCompare(b,'ko'));
  const sectorCounts=new Map(sectors.map(name=>[name,items.filter(x=>sectorOf(x.category)===name).length]));
  for(const name of sectors)sectorFilter.add(new Option(name+' ('+sectorCounts.get(name).toLocaleString('ko-KR')+')',name));
  const categories=[...new Set(items.map(x=>x.category))].sort((a,b)=>a.localeCompare(b,'ko'));
  const providers=[...new Set(items.map(x=>x.provider))].sort((a,b)=>a.localeCompare(b,'ko'));
  for(const name of categories)category.add(new Option(name,name));
  for(const name of providers)providerFilter.add(new Option(name,name));
  $('apiTotal').textContent=items.length.toLocaleString('ko-KR');
  const v=$('apiVerifiedCount');if(v)v.textContent=confirmed.length.toLocaleString('ko-KR');
  show();
  detailFromUrl();
  if(failures.length){
   $('apiStatus').textContent+=' · 일부 공식 목록 파일을 불러오지 못했습니다 ('+failures.length+'개). 다시 시도할 수 있습니다.';
   if(retry)retry.hidden=false;
  }
 }catch(error){if(version===loadVersion)showLoadError(error)}
}
$('apiRetry')?.addEventListener('click',loadCatalog);
loadCatalog();
for(const element of [search,sectorFilter,category,approval,providerFilter,formatFilter,verificationFilter])element.addEventListener(element===search?'input':'change',()=>{if(element===search){clearTimeout(searchTimer);searchTimer=setTimeout(()=>{page=1;show()},180)}else{page=1;show()}});
$('apiPrev').addEventListener('click',()=>{if(page>1){page--;show();$('apiStatus').scrollIntoView({block:'start'});}});
$('apiNext').addEventListener('click',()=>{page++;show();$('apiStatus').scrollIntoView({block:'start'});});
