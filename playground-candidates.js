const status=document.getElementById('candidateStatus');const list=document.getElementById('candidateList');let entries=[];let mode='all';let probes=new Map();const buttons=[...document.querySelectorAll('[data-signal]')];
function paint(){list.replaceChildren();const shown=entries.filter(c=>mode==='all'||(mode==='strong'?c.signals.includes('demo-style URL'):c.signals.includes('browser-related description')));status.textContent='검토 전 후보 '+shown.length+'개 표시 · 확인 없이 자동 승인되지 않음';for(const c of shown){const card=document.createElement('article');card.className='hub-card';const top=document.createElement('div');top.className='hub-card-top';top.textContent='UNVERIFIED / '+c.score+' POINTS';const h=document.createElement('h2');h.textContent=c.name;const meta=document.createElement('p');meta.textContent=c.signals.join(' · ')||'웹사이트 정보만 있음';const checked=probes.get(c.id);
const evidence=document.createElement('div');evidence.className='hub-card-meta';
evidence.textContent=checked&&checked.url===c.url
  ?'접속 검사: '+({reachable:'응답 확인 (데모 검증 아님)','http-error':'HTTP 오류','timeout':'응답 시간 초과','network-error':'네트워크 오류','dns-error':'DNS 오류','unsafe-dns':'DNS 차단','unsafe-url':'URL 차단','unknown-response':'응답 확인 불가'}[checked.status]||'확인 불가')+(checked.httpStatus?' · HTTP '+checked.httpStatus:'')
  :'접속 검사: 미실시';
const link=document.createElement('a');link.href=c.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='홈페이지 직접 검토 ↗';const git=document.createElement('a');git.href=c.github;git.target='_blank';git.rel='noopener noreferrer';git.textContent='GitHub 확인 ↗';const wrap=document.createElement('div');wrap.className='hub-card-related';wrap.append(git);card.append(top,h,meta,evidence,wrap,link);list.append(card)}}
buttons.forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.signal;buttons.forEach(x=>x.setAttribute('aria-pressed',String(x===b)));paint()}));
fetch('data/playground-candidates.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then(d=>{if(!d.reviewRequired||!Array.isArray(d.candidates))throw Error('Invalid review data');entries=d.candidates.filter(c=>c.status==='unverified'&&/^https:\/\//.test(c.url)&&/^https:\/\/github\.com\//.test(c.github)&&Array.isArray(c.signals));paint()}).catch(e=>{status.textContent='후보 목록을 불러오지 못했습니다.';console.warn(e)});

fetch('data/playground-probes.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then(d=>{
  if(!d.reviewRequired||!Array.isArray(d.checks))return;
  probes=new Map(d.checks.filter(x=>x&&typeof x.id==='string').map(x=>[x.id,x]));
  if(entries.length)paint();
}).catch(()=>{});
