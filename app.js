const state={category:'전체',query:'',openSource:false,free:false,favoritesOnly:false,platform:'all',sort:'featured'};
let tools=[];
const FAVORITES_KEY='openshelf-favorites-v1';
const favorites=new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY)||'[]'));

const els={
  search:document.querySelector('#search'),categoryChips:document.querySelector('#categoryChips'),
  openSourceOnly:document.querySelector('#openSourceOnly'),freeOnly:document.querySelector('#freeOnly'),
  favoritesOnly:document.querySelector('#favoritesOnly'),platformFilter:document.querySelector('#platformFilter'),
  sortSelect:document.querySelector('#sortSelect'),toolGrid:document.querySelector('#toolGrid'),
  resultCount:document.querySelector('#resultCount'),emptyState:document.querySelector('#emptyState'),
  favoriteCount:document.querySelector('#favoriteCount'),favoritesNav:document.querySelector('#favoritesNav'),
  latestGrid:document.querySelector('#latestGrid'),heroToolCount:document.querySelector('#heroToolCount'),
  toolDialog:document.querySelector('#toolDialog'),dialogContent:document.querySelector('#dialogContent'),
  dialogClose:document.querySelector('#dialogClose'),resetFilters:document.querySelector('#resetFilters'),
  scrollToAll:document.querySelector('#scrollToAll')
};

function saveFavorites(){
  localStorage.setItem(FAVORITES_KEY,JSON.stringify([...favorites]));
  els.favoriteCount.textContent=favorites.size;
}

function toolMatches(tool){
  const haystack=[tool.name,tool.description,tool.category,...(tool.tags||[]),...(tool.platforms||[])].join(' ').toLowerCase();
  return(!state.query||haystack.includes(state.query))&&
    (state.category==='전체'||tool.category===state.category)&&
    (!state.openSource||tool.openSource)&&(!state.free||tool.free)&&
    (!state.favoritesOnly||favorites.has(tool.id))&&
    (state.platform==='all'||tool.platforms.includes(state.platform));
}

function renderChips(){
  const categories=['전체',...new Set(tools.map(t=>t.category))];
  els.categoryChips.innerHTML=categories.map(c=>`<button class="chip ${state.category===c?'active':''}" data-category="${c}">${c}</button>`).join('');
  els.categoryChips.querySelectorAll('.chip').forEach(btn=>btn.addEventListener('click',()=>{
    state.category=btn.dataset.category;renderChips();renderTools();
  }));
}

function tagsFor(tool){
  return[...(tool.tags||[]),...(tool.free?['무료']:[]),...(tool.openSource?['오픈소스']:[])];
}

function card(tool){
  const letter=tool.name.slice(0,1).toUpperCase();
  return `<article class="card" data-id="${tool.id}">
    <div class="card-head">
      <div class="logo">${letter}</div>
      <div class="card-meta">
        <span class="category">${tool.category}</span>
        <button class="favorite-btn ${favorites.has(tool.id)?'active':''}" data-favorite="${tool.id}" type="button" aria-label="즐겨찾기">${favorites.has(tool.id)?'♥':'♡'}</button>
      </div>
    </div>
    <h2>${tool.name}</h2>
    <p>${tool.description}</p>
    <div class="tags">${tagsFor(tool).slice(0,5).map(t=>`<span class="tag">${t}</span>`).join('')}</div>
    <div class="platforms">${tool.platforms.join(' · ')}</div>
    <div class="card-actions">
      ${tool.website?`<a class="primary" href="${tool.website}" target="_blank" rel="noreferrer">사용하기 ↗</a>`:''}
      <button type="button" data-detail="${tool.id}">자세히</button>
    </div>
  </article>`;
}

function renderTools(){
  let results=tools.filter(toolMatches);
  if(state.sort==='name')results.sort((a,b)=>a.name.localeCompare(b.name));
  else if(state.sort==='newest')results.sort((a,b)=>String(b.added||'').localeCompare(String(a.added||'')));
  else results.sort((a,b)=>(b.featured||0)-(a.featured||0));
  els.toolGrid.innerHTML=results.map(card).join('');
  els.resultCount.textContent=`${results.length} tools`;
  els.emptyState.hidden=results.length!==0;
  bindDynamicEvents();
}

function renderLatest(){
  const latest=[...tools].sort((a,b)=>String(b.added||'').localeCompare(String(a.added||''))).slice(0,4);
  els.latestGrid.innerHTML=latest.map(tool=>`<article class="latest-card" data-latest="${tool.id}" tabindex="0">
    <span>${tool.category}</span><h3>${tool.name}</h3><p>${tool.description}</p>
  </article>`).join('');
  els.latestGrid.querySelectorAll('[data-latest]').forEach(el=>{
    const open=()=>openDetail(el.dataset.latest);
    el.addEventListener('click',open);
    el.addEventListener('keydown',e=>{if(e.key==='Enter')open()});
  });
}

function relatedTools(tool){
  return tools.filter(t=>t.id!==tool.id&&(t.category===tool.category||(t.tags||[]).some(tag=>(tool.tags||[]).includes(tag))))
    .sort((a,b)=>(b.featured||0)-(a.featured||0)).slice(0,4);
}

function openDetail(id){
  const tool=tools.find(t=>t.id===id); if(!tool)return;
  const related=relatedTools(tool);
  els.dialogContent.innerHTML=`<div class="dialog-body">
    <span class="dialog-kicker">${tool.category}</span>
    <h2>${tool.name}</h2>
    <p>${tool.longDescription||tool.description}</p>
    <div class="tags">${tagsFor(tool).map(t=>`<span class="tag">${t}</span>`).join('')}</div>
    <div class="detail-grid">
      <div class="detail-box"><span>PLATFORMS</span><strong>${tool.platforms.join(', ')}</strong></div>
      <div class="detail-box"><span>LICENSE</span><strong>${tool.license||'확인 필요'}</strong></div>
      <div class="detail-box"><span>PRICE</span><strong>${tool.free?'무료':'유/무료 혼합'}</strong></div>
    </div>
    ${related.length?`<div class="related"><h3>비슷한 도구</h3><div class="related-list">${related.map(r=>`<button type="button" data-related="${r.id}">${r.name}</button>`).join('')}</div></div>`:''}
    <div class="dialog-actions">
      ${tool.website?`<a class="primary" href="${tool.website}" target="_blank" rel="noreferrer">공식 사이트 ↗</a>`:''}
      ${tool.github?`<a href="${tool.github}" target="_blank" rel="noreferrer">GitHub ↗</a>`:''}
    </div>
  </div>`;
  els.dialogContent.querySelectorAll('[data-related]').forEach(btn=>btn.addEventListener('click',()=>openDetail(btn.dataset.related)));
  els.toolDialog.showModal();document.body.classList.add('dialog-open');
}

function closeDialog(){els.toolDialog.close();document.body.classList.remove('dialog-open')}

function toggleFavorite(id){
  favorites.has(id)?favorites.delete(id):favorites.add(id);
  saveFavorites();renderTools();
}

function bindDynamicEvents(){
  els.toolGrid.querySelectorAll('[data-favorite]').forEach(btn=>btn.addEventListener('click',e=>{
    e.stopPropagation();toggleFavorite(btn.dataset.favorite);
  }));
  els.toolGrid.querySelectorAll('[data-detail]').forEach(btn=>btn.addEventListener('click',()=>openDetail(btn.dataset.detail)));
}

function resetFilters(){
  Object.assign(state,{category:'전체',query:'',openSource:false,free:false,favoritesOnly:false,platform:'all',sort:'featured'});
  els.search.value='';els.openSourceOnly.checked=false;els.freeOnly.checked=false;els.favoritesOnly.checked=false;
  els.platformFilter.value='all';els.sortSelect.value='featured';renderChips();renderTools();
}

els.search.addEventListener('input',e=>{state.query=e.target.value.trim().toLowerCase();renderTools()});
els.openSourceOnly.addEventListener('change',e=>{state.openSource=e.target.checked;renderTools()});
els.freeOnly.addEventListener('change',e=>{state.free=e.target.checked;renderTools()});
els.favoritesOnly.addEventListener('change',e=>{state.favoritesOnly=e.target.checked;renderTools()});
els.platformFilter.addEventListener('change',e=>{state.platform=e.target.value;renderTools()});
els.sortSelect.addEventListener('change',e=>{state.sort=e.target.value;renderTools()});
els.favoritesNav.addEventListener('click',()=>{state.favoritesOnly=true;els.favoritesOnly.checked=true;document.querySelector('#tools').scrollIntoView({behavior:'smooth'});renderTools()});
els.scrollToAll.addEventListener('click',()=>document.querySelector('#tools').scrollIntoView({behavior:'smooth'}));
els.resetFilters.addEventListener('click',resetFilters);
els.dialogClose.addEventListener('click',closeDialog);
els.toolDialog.addEventListener('click',e=>{if(e.target===els.toolDialog)closeDialog()});
document.addEventListener('keydown',e=>{
  if(e.key==='/'&&document.activeElement!==els.search){e.preventDefault();els.search.focus()}
  if(e.key==='Escape'&&els.toolDialog.open)closeDialog();
});

fetch('./data/tools.json').then(r=>r.json()).then(data=>{
  tools=data;els.heroToolCount.textContent=tools.length;saveFavorites();renderChips();renderLatest();renderTools();
}).catch(()=>{els.toolGrid.innerHTML='<p>도구 데이터를 불러오지 못했습니다.</p>'});
