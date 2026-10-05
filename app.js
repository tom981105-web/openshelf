const state = { category: '전체', query: '', openSource: false, free: false, platform: 'all', sort: 'featured' };
let tools = [];

const els = {
  search: document.querySelector('#search'),
  categoryChips: document.querySelector('#categoryChips'),
  openSourceOnly: document.querySelector('#openSourceOnly'),
  freeOnly: document.querySelector('#freeOnly'),
  platformFilter: document.querySelector('#platformFilter'),
  sortSelect: document.querySelector('#sortSelect'),
  toolGrid: document.querySelector('#toolGrid'),
  resultCount: document.querySelector('#resultCount'),
  emptyState: document.querySelector('#emptyState')
};

function toolMatches(tool) {
  const haystack = [tool.name, tool.description, tool.category, ...(tool.tags || [])].join(' ').toLowerCase();
  return (!state.query || haystack.includes(state.query)) &&
    (state.category === '전체' || tool.category === state.category) &&
    (!state.openSource || tool.openSource) &&
    (!state.free || tool.free) &&
    (state.platform === 'all' || tool.platforms.includes(state.platform));
}

function renderChips() {
  const categories = ['전체', ...new Set(tools.map(t => t.category))];
  els.categoryChips.innerHTML = categories.map(c => `<button class="chip ${state.category === c ? 'active' : ''}" data-category="${c}">${c}</button>`).join('');
  els.categoryChips.querySelectorAll('.chip').forEach(btn => btn.addEventListener('click', () => {
    state.category = btn.dataset.category;
    renderChips();
    renderTools();
  }));
}

function card(tool) {
  const letter = tool.name.slice(0, 1).toUpperCase();
  const tags = [...(tool.tags || []), ...(tool.free ? ['무료'] : []), ...(tool.openSource ? ['오픈소스'] : [])];
  return `<article class="card">
    <div class="card-head"><div class="logo">${letter}</div><span class="category">${tool.category}</span></div>
    <h2>${tool.name}</h2>
    <p>${tool.description}</p>
    <div class="tags">${tags.slice(0, 5).map(t => `<span class="tag">${t}</span>`).join('')}</div>
    <div class="card-actions">
      ${tool.website ? `<a class="primary" href="${tool.website}" target="_blank" rel="noreferrer">사용하기 ↗</a>` : ''}
      ${tool.github ? `<a href="${tool.github}" target="_blank" rel="noreferrer">GitHub ↗</a>` : ''}
    </div>
  </article>`;
}

function renderTools() {
  let results = tools.filter(toolMatches);
  if (state.sort === 'name') results.sort((a,b) => a.name.localeCompare(b.name));
  else results.sort((a,b) => (b.featured || 0) - (a.featured || 0));
  els.toolGrid.innerHTML = results.map(card).join('');
  els.resultCount.textContent = `${results.length} tools`;
  els.emptyState.hidden = results.length !== 0;
}

els.search.addEventListener('input', e => { state.query = e.target.value.trim().toLowerCase(); renderTools(); });
els.openSourceOnly.addEventListener('change', e => { state.openSource = e.target.checked; renderTools(); });
els.freeOnly.addEventListener('change', e => { state.free = e.target.checked; renderTools(); });
els.platformFilter.addEventListener('change', e => { state.platform = e.target.value; renderTools(); });
els.sortSelect.addEventListener('change', e => { state.sort = e.target.value; renderTools(); });
document.addEventListener('keydown', e => { if (e.key === '/' && document.activeElement !== els.search) { e.preventDefault(); els.search.focus(); }});

fetch('./data/tools.json').then(r => r.json()).then(data => { tools = data; renderChips(); renderTools(); }).catch(() => {
  els.toolGrid.innerHTML = '<p>도구 데이터를 불러오지 못했습니다.</p>';
});