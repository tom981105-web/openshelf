const els={
  list:document.querySelector('#logsList'),
  loading:document.querySelector('#logsLoading'),
  empty:document.querySelector('#logsEmpty'),
  filter:document.querySelector('#logStatusFilter'),
  refresh:document.querySelector('#refreshLogs'),
  lastRun:document.querySelector('#logsLastRun'),
  lastAdded:document.querySelector('#logsLastAdded'),
  lastRejected:document.querySelector('#logsLastRejected'),
  total:document.querySelector('#logsTotal'),
  denylist:document.querySelector('#denylistItems')
};
let logs=[],state=null;

function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
function formatKst(value){
  if(!value)return '—';
  const d=new Date(value);
  if(Number.isNaN(d.getTime()))return '—';
  return new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(d);
}
function statusLabel(status){return status==='partial'?'PARTIAL':'SUCCESS'}

function renderSummary(){
  els.lastRun.textContent=formatKst(state?.lastRun);
  els.lastAdded.textContent=Number.isFinite(Number(state?.lastAddedCount))?'+'+Number(state.lastAddedCount):'—';
  els.lastRejected.textContent=Number.isFinite(Number(state?.lastRejectedCount))?String(Number(state.lastRejectedCount)):'—';
  els.total.textContent=Number(state?.totalAutoAdded||0).toLocaleString();
}
function renderLogs(){
  const filter=els.filter.value;
  const visible=filter==='all'?logs:logs.filter(x=>x.status===filter);
  els.loading.hidden=true;
  els.empty.hidden=visible.length!==0;
  els.list.hidden=visible.length===0;
  els.list.innerHTML=visible.map((run,index)=>{
    const added=Array.isArray(run.addedTools)?run.addedTools:[];
    const rejected=Array.isArray(run.rejected)?run.rejected:[];
    const errors=Array.isArray(run.batchErrors)?run.batchErrors:[];
    return `<details class="log-card" ${index===0?'open':''}>
      <summary>
        <div class="log-main">
          <span class="log-status" data-status="${escapeHtml(run.status||'success')}">${statusLabel(run.status)}</span>
          <div><strong>${formatKst(run.timestamp)}</strong><small>${escapeHtml(run.id||'')}</small></div>
        </div>
        <div class="log-stats">
          <span><b>+${Number(run.addedCount||0)}</b> 추가</span>
          <span><b>${Number(run.rejectedCount||0)}</b> 탈락</span>
          <span><b>${errors.length}</b> 오류</span>
        </div>
      </summary>
      <div class="log-detail">
        <div class="log-detail-section">
          <h3>추가된 도구</h3>
          <div class="log-tool-grid">${added.length?added.map(t=>`<a href="${escapeHtml(t.github||'#')}" target="_blank" rel="noreferrer"><strong>${escapeHtml(t.name)}</strong><span>${escapeHtml(t.category||'')}</span></a>`).join(''):'<p>기록 없음</p>'}</div>
        </div>
        <div class="log-detail-columns">
          <div class="log-detail-section">
            <h3>탈락 사유</h3>
            ${rejected.length?`<ul>${rejected.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul>`:'<p>없음</p>'}
          </div>
          <div class="log-detail-section">
            <h3>배치 오류</h3>
            ${errors.length?`<ul>${errors.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul>`:'<p>없음</p>'}
          </div>
        </div>
      </div>
    </details>`;
  }).join('');
}
function renderDenylist(items){
  els.denylist.innerHTML=items.length?items.map(x=>`<code>${escapeHtml(x)}</code>`).join(''):'<span>현재 제외된 저장소가 없습니다.</span>';
}
async function load(){
  els.loading.hidden=false;els.list.hidden=true;els.empty.hidden=true;
  try{
    const [lr,sr,dr]=await Promise.all([
      fetch('./data/discovery-log.json',{cache:'no-store'}),
      fetch('./data/discovery-state.json',{cache:'no-store'}),
      fetch('./data/discovery-denylist.json',{cache:'no-store'})
    ]);
    logs=lr.ok?await lr.json():[];
    state=sr.ok?await sr.json():null;
    const deny=dr.ok?await dr.json():[];
    renderSummary();renderDenylist(Array.isArray(deny)?deny:[]);renderLogs();
  }catch{
    logs=[];renderLogs();renderDenylist([]);
  }
}
els.filter.addEventListener('change',renderLogs);
els.refresh.addEventListener('click',load);
load();
