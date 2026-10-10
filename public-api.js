function validatedPublicApis(rows){
 if(!Array.isArray(rows))return [];
 const seen=new Set(),result=[];
 for(const x of rows){
  if(!x||!/^\d{8}$/.test(String(x.id)))continue;
  const expected='https://www.data.go.kr/data/'+x.id+'/openapi.do';
  if(x.url!==expected||seen.has(x.id))continue;
  if(![x.name,x.provider,x.category,x.summary,x.approval,x.format].every(v=>typeof v==='string'&&v.length>0))continue;
  seen.add(x.id);result.push(x);
 }
 return result;
}
function filterPublicApis(items,opts={}) {
 const q=String(opts.query||'').trim().toLocaleLowerCase('ko').normalize('NFKC');
 const terms=q.split(/\s+/).filter(Boolean),cat=opts.category||'',approval=opts.approval||'',format=opts.format||'',provider=opts.provider||'';
 return items.filter(x=>{
  if(cat&&x.category!==cat)return false;
  if(provider&&x.provider!==provider)return false;
  if(approval&&!x.approval.includes(approval))return false;
  if(format&&!x.format.toLocaleLowerCase('ko').includes(format.toLocaleLowerCase('ko')))return false;
  const hay=[x.id,x.name,x.provider,x.category,x.summary,x.approval,x.format].join(' ').toLocaleLowerCase('ko').normalize('NFKC');
  return terms.every(term=>hay.includes(term));
 });
}

const $=id=>document.getElementById(id);let items=[];
const search=$('apiSearch'),category=$('apiCategory'),approval=$('apiApproval'),providerFilter=$('apiProvider'),formatFilter=$('apiFormat');
const PAGE_SIZE=24;let page=1;
function show(){
 const filtered=filterPublicApis(items,{query:search.value,category:category.value,approval:approval.value,provider:providerFilter.value,format:formatFilter.value});
 const totalPages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));page=Math.min(page,totalPages);
 const visible=filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);
 $('apiPagination').hidden=filtered.length<=PAGE_SIZE;
 $('apiPageInfo').textContent=page+' / '+totalPages+' 페이지';
 $('apiPrev').disabled=page===1;$('apiNext').disabled=page===totalPages;
 $('apiList').replaceChildren();$('apiEmpty').hidden=filtered.length!==0;
 $('apiStatus').textContent=items.length+'개 확인 목록 중 '+filtered.length+'개 표시';
 for(const item of visible){
  const card=document.createElement('article');card.className='public-card';
  const meta=document.createElement('div');meta.className='public-meta';
  const provider=document.createElement('span');provider.textContent=item.provider;
  const cat=document.createElement('span');cat.textContent=item.category;meta.append(provider,cat);
  const title=document.createElement('h3');title.textContent=item.name;
  const summary=document.createElement('p');summary.textContent=item.summary;
  const bottom=document.createElement('div');bottom.className='public-card-bottom';
  const badge=document.createElement('span');badge.textContent=item.approval+' · '+item.format;
  const link=document.createElement('a');link.href=item.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='공식 상세·신청 ↗';
  bottom.append(badge,link);card.append(meta,title,summary,bottom);$('apiList').append(card);
 }
}
async function fetchCatalog(attempt=0){
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),12000);
 try{
  const response=await fetch('data/public-apis.json',{cache:'no-store',signal:controller.signal});
  if(!response.ok)throw new Error('HTTP '+response.status);
  const data=await response.json();
  if(!data||!Array.isArray(data.items))throw new Error('Invalid API catalog format');
  return data;
 }catch(error){
  if(attempt<2){await new Promise(resolve=>setTimeout(resolve,750*(attempt+1)));return fetchCatalog(attempt+1)}
  throw error;
 }finally{clearTimeout(timeout)}
}
function showLoadError(error){
 console.error('OpenShelf Public API catalog load failed',error);
 $('apiTotal').textContent='—';
 $('apiStatus').textContent='목록을 불러오지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.';
 const retry=$('apiRetry');if(retry)retry.hidden=false;
}
async function loadCatalog(){
 $('apiStatus').textContent='공공 API 목록을 불러오는 중…';
 const retry=$('apiRetry');if(retry)retry.hidden=true;
 try{
  const data=await fetchCatalog();
  if(!data.items.length)throw new Error('API catalog is empty');
  category.replaceChildren(new Option('모든 분야',''));
  providerFilter.replaceChildren(new Option('모든 기관',''));

 items=validatedPublicApis(data.items);$('apiTotal').textContent=String(items.length);
 const categories=[...new Set(items.map(x=>x.category))].sort((a,b)=>a.localeCompare(b,'ko'));
 const providers=[...new Set(items.map(x=>x.provider))].sort((a,b)=>a.localeCompare(b,'ko'));
 for(const name of providers){const option=document.createElement('option');option.value=name;option.textContent=name;providerFilter.append(option)}
 for(const name of categories){const option=document.createElement('option');option.value=name;option.textContent=name;category.append(option)}
 show();
}catch(error){showLoadError(error)}
}
$('apiRetry')?.addEventListener('click',loadCatalog);
loadCatalog();
for(const element of [search,category,approval,providerFilter,formatFilter])element.addEventListener(element===search?'input':'change',()=>{page=1;show()});
$('apiPrev').addEventListener('click',()=>{if(page>1){page--;show();$('apiStatus').scrollIntoView({block:'start'})});
$('apiNext').addEventListener('click',()=>{page++;show();$('apiStatus').scrollIntoView({block:'start'})}});
