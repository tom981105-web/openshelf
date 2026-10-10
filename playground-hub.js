// The hub is generated from the current catalog and the same reviewed capability map as tool cards.
const filterButtons=[...document.querySelectorAll('[data-filter]')];
const grid=document.getElementById('hubGrid');
const countLabel=document.getElementById('hubCount');
const statusLabel=document.getElementById('hubStatus');
let currentFilter='all';
let entries=[];
function renderHub(){
  const visible=entries.filter(entry=>currentFilter==='all'||entry.type===currentFilter);
  countLabel.textContent='체험실 '+visible.length+'개 · 연결된 도구 '+visible.reduce((n,entry)=>n+entry.tools.length,0)+'개';
  grid.replaceChildren();
  for(const entry of visible){
    const card=document.createElement('article');card.className='hub-card';card.dataset.type=entry.type;
    const top=document.createElement('div');top.className='hub-card-top';
    const index=document.createElement('span');index.textContent=String(entries.indexOf(entry)+1).padStart(2,'0')+' / '+entry.type.toUpperCase();
    const kind=document.createElement('span');kind.className='hub-type';kind.textContent=entry.kind;top.append(index,kind);
    const h=document.createElement('h2');h.textContent=entry.title;
    const desc=document.createElement('p');desc.textContent=entry.description;
    const meta=document.createElement('div');meta.className='hub-card-meta';meta.textContent=entry.meta;
    const related=document.createElement('div');related.className='hub-card-related';
    const label=document.createElement('strong');label.textContent='연결된 OpenShelf 도구';related.append(label);
    for(const tool of entry.tools){
      const a=document.createElement('a');a.className='hub-tool-link';a.href=tool.href;a.textContent=tool.name+' ↗';related.append(a);
    }
    const action=document.createElement('a');action.className='hub-open-link';action.href=entry.href;action.textContent=entry.action;
    card.append(top,h,desc,meta,related,action);grid.append(card);
  }
}
filterButtons.forEach(button=>button.addEventListener('click',()=>{
  currentFilter=button.dataset.filter;
  filterButtons.forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  renderHub();
}));
async function loadHub(){
  statusLabel.textContent='도구 목록 확인 중…';
  try {
    const response=await fetch('data/tools.json',{cache:'no-cache'});
    if(!response.ok)throw new Error('HTTP '+response.status);
    const catalog=await response.json();
    if(!Array.isArray(catalog))throw new Error('도구 데이터 형식 오류');
    entries=playgroundHubEntries(catalog);
    renderHub();
    statusLabel.textContent='현재 OpenShelf 도구 목록 기준 · 검증된 체험 연결만 표시';
  }catch(error){
    statusLabel.textContent='도구 목록을 불러오지 못했습니다. 새로고침해 주세요.';
    countLabel.textContent='연결된 도구를 확인할 수 없습니다.';
    grid.replaceChildren();
    console.warn('Playground catalog unavailable:',error);
  }
}
loadHub();
