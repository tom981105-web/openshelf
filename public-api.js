import {filterPublicApis,validatedPublicApis} from './public-api-core.mjs';
const $=id=>document.getElementById(id);let items=[];
const search=$('apiSearch'),category=$('apiCategory'),approval=$('apiApproval');
function show(){
 const filtered=filterPublicApis(items,{query:search.value,category:category.value,approval:approval.value});
 $('apiList').replaceChildren();$('apiEmpty').hidden=filtered.length!==0;
 $('apiStatus').textContent=items.length+'개 확인 목록 중 '+filtered.length+'개 표시';
 for(const item of filtered){
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
fetch('data/public-apis.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then(data=>{
 items=validatedPublicApis(data.items);$('apiTotal').textContent=String(items.length);
 const categories=[...new Set(items.map(x=>x.category))].sort((a,b)=>a.localeCompare(b,'ko'));
 for(const name of categories){const option=document.createElement('option');option.value=name;option.textContent=name;category.append(option)}
 show();
}).catch(()=>{$('apiTotal').textContent='0';$('apiStatus').textContent='목록을 불러오지 못했습니다. 잠시 후 새로고침해 주세요.'});
for(const element of [search,category,approval])element.addEventListener(element===search?'input':'change',show);
