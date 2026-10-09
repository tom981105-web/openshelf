/**
 * OpenShelf Admin Web App
 *
 * IMPORTANT:
 * Keep credentials in Apps Script > Project Settings > Script Properties.
 * Required properties:
 *   ADMIN_USER
 *   ADMIN_PASSWORD
 * GITHUB_TOKEN is already used by the scheduler and can be reused here.
 *
 * Deploy this Apps Script project as a Web App after adding this file.
 * Do NOT hard-code credentials in this source.
 */

const ADMIN_SESSION_SECONDS = 21600; // 6 hours

function doGet() {
  return HtmlService.createHtmlOutput(adminHtml_())
    .setTitle('OpenShelf Admin')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

function adminLogin(username, password) {
  const props = PropertiesService.getScriptProperties();
  const expectedUser = props.getProperty('ADMIN_USER') || '';
  const expectedPassword = props.getProperty('ADMIN_PASSWORD') || '';

  if (!expectedUser || !expectedPassword) {
    return { ok: false, error: '관리자 계정이 아직 설정되지 않았습니다.' };
  }

  if (String(username || '') !== expectedUser || String(password || '') !== expectedPassword) {
    Utilities.sleep(450);
    return { ok: false, error: '아이디 또는 비밀번호가 올바르지 않습니다.' };
  }

  const token = Utilities.getUuid() + Utilities.getUuid();
  CacheService.getScriptCache().put('admin-session:' + token, '1', ADMIN_SESSION_SECONDS);
  return { ok: true, token: token };
}

function adminVerify(token) {
  return { ok: isAdminSession_(token) };
}

function adminLogout(token) {
  if (token) CacheService.getScriptCache().remove('admin-session:' + token);
  return { ok: true };
}

function adminGetDashboard(token) {
  if (!isAdminSession_(token)) {
    return { ok: false, error: '세션이 만료되었습니다.' };
  }

  try {
    const state = githubJsonFile_('data/discovery-state.json') || {};
    const logs = githubJsonFile_('data/discovery-log.json') || [];
    const denylist = githubJsonFile_('data/discovery-denylist.json') || [];
    const toolData = githubJsonFile_('data/tools.json') || [];

    return {
      ok: true,
      state: state,
      logs: Array.isArray(logs) ? logs.slice(0, 50) : [],
      denylist: Array.isArray(denylist) ? denylist : [],
      tools: Array.isArray(toolData) ? toolData.map(function(t){ return { id:t.id, name:t.name, category:t.category, github:t.github }; }) : []
    };
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
}


function adminRunDiscovery(token) {
  if (!isAdminSession_(token)) return { ok:false, error:'세션이 만료되었습니다.' };
  try {
    const gh = githubAuth_();
    const url = 'https://api.github.com/repos/' + CONFIG.owner + '/' + CONFIG.repo + '/actions/workflows/' + CONFIG.workflow + '/dispatches';
    const response = UrlFetchApp.fetch(url, {
      method:'post',
      muteHttpExceptions:true,
      contentType:'application/json',
      headers:gh.headers,
      payload:JSON.stringify({ ref:CONFIG.branch })
    });
    if (response.getResponseCode() !== 204) throw new Error('수집 실행 요청 실패 (' + response.getResponseCode() + '): ' + response.getContentText());
    return { ok:true, message:'자동수집 실행을 요청했습니다.' };
  } catch (err) {
    return { ok:false, error:String(err && err.message ? err.message : err) };
  }
}

function adminAddDenylist(token, repoValue) {
  if (!isAdminSession_(token)) return { ok:false, error:'세션이 만료되었습니다.' };
  try {
    const repo = normalizeRepoInput_(repoValue);
    if (!repo) return { ok:false, error:'owner/repo 형식으로 입력해주세요.' };
    const file = githubJsonFileMeta_('data/discovery-denylist.json');
    const list = Array.isArray(file.data) ? file.data : [];
    const normalized = list.map(normalizeRepoInput_);
    if (normalized.indexOf(repo) >= 0) return { ok:true, message:'이미 제외 목록에 있습니다.', denylist:list };
    list.push(repo);
    githubWriteJsonFile_('data/discovery-denylist.json', list, 'admin: add discovery denylist entry', file.sha);
    return { ok:true, message:repo + ' 제외 완료', denylist:list };
  } catch (err) {
    return { ok:false, error:String(err && err.message ? err.message : err) };
  }
}

function adminRemoveDenylist(token, repoValue) {
  if (!isAdminSession_(token)) return { ok:false, error:'세션이 만료되었습니다.' };
  try {
    const repo = normalizeRepoInput_(repoValue);
    const file = githubJsonFileMeta_('data/discovery-denylist.json');
    const list = Array.isArray(file.data) ? file.data : [];
    const next = list.filter(function(x){ return normalizeRepoInput_(x) !== repo; });
    if (next.length === list.length) return { ok:true, message:'이미 제외 목록에 없습니다.', denylist:list };
    githubWriteJsonFile_('data/discovery-denylist.json', next, 'admin: remove discovery denylist entry', file.sha);
    return { ok:true, message:repo + ' 제외 해제', denylist:next };
  } catch (err) {
    return { ok:false, error:String(err && err.message ? err.message : err) };
  }
}

function adminRemoveTool(token, toolId) {
  if (!isAdminSession_(token)) return { ok:false, error:'세션이 만료되었습니다.' };
  try {
    const toolsFile = githubJsonFileMeta_('data/tools.json');
    const list = Array.isArray(toolsFile.data) ? toolsFile.data : [];
    const tool = list.find(function(t){ return String(t.id) === String(toolId); });
    if (!tool) return { ok:false, error:'도구를 찾지 못했습니다.' };

    const nextTools = list.filter(function(t){ return String(t.id) !== String(toolId); });
    githubWriteJsonFile_('data/tools.json', nextTools, 'admin: remove OpenShelf tool ' + tool.name, toolsFile.sha);

    const repo = normalizeRepoInput_(tool.github);
    if (repo) {
      const denyFile = githubJsonFileMeta_('data/discovery-denylist.json');
      const deny = Array.isArray(denyFile.data) ? denyFile.data : [];
      if (!deny.map(normalizeRepoInput_).includes(repo)) {
        deny.push(repo);
        githubWriteJsonFile_('data/discovery-denylist.json', deny, 'admin: deny removed OpenShelf tool ' + tool.name, denyFile.sha);
      }
    }

    return { ok:true, message:tool.name + ' 삭제 및 재수집 차단 완료' };
  } catch (err) {
    return { ok:false, error:String(err && err.message ? err.message : err) };
  }
}

function normalizeRepoInput_(value) {
  var raw = String(value || '').trim().replace(/\.git$/i,'').replace(/\/+$/,'');
  raw = raw.replace(/^https?:\/\/github\.com\//i,'');
  var match = raw.match(/^([^\s\/]+)\/([^\s\/]+)$/);
  return match ? (match[1] + '/' + match[2]).toLowerCase() : '';
}

function githubAuth_() {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('GITHUB_TOKEN') || '';
  if (!token) throw new Error('GITHUB_TOKEN이 없습니다.');
  return {
    token:token,
    headers:{
      Accept:'application/vnd.github+json',
      Authorization:'Bearer ' + token,
      'X-GitHub-Api-Version':'2022-11-28',
      'User-Agent':'openshelf-admin'
    }
  };
}

function githubJsonFileMeta_(path) {
  const gh = githubAuth_();
  const url = 'https://api.github.com/repos/' + CONFIG.owner + '/' + CONFIG.repo + '/contents/' + path + '?ref=' + CONFIG.branch;
  const response = UrlFetchApp.fetch(url, { method:'get', muteHttpExceptions:true, headers:gh.headers });
  if (response.getResponseCode() !== 200) throw new Error('GitHub data load failed (' + response.getResponseCode() + ')');
  const payload = JSON.parse(response.getContentText());
  const jsonText = Utilities.newBlob(Utilities.base64Decode(String(payload.content || '').replace(/\n/g,''))).getDataAsString('UTF-8');
  return { sha:payload.sha, data:JSON.parse(jsonText) };
}

function githubWriteJsonFile_(path, data, message, sha) {
  const gh = githubAuth_();
  const url = 'https://api.github.com/repos/' + CONFIG.owner + '/' + CONFIG.repo + '/contents/' + path;
  const body = {
    message:message,
    content:Utilities.base64Encode(JSON.stringify(data, null, 2) + '\n', Utilities.Charset.UTF_8),
    branch:CONFIG.branch
  };
  if (sha) body.sha = sha;
  const response = UrlFetchApp.fetch(url, {
    method:'put',
    muteHttpExceptions:true,
    contentType:'application/json',
    headers:gh.headers,
    payload:JSON.stringify(body)
  });
  if (response.getResponseCode() !== 200 && response.getResponseCode() !== 201) {
    throw new Error('GitHub write failed (' + response.getResponseCode() + '): ' + response.getContentText());
  }
  return JSON.parse(response.getContentText());
}

function isAdminSession_(token) {
  if (!token) return false;
  return CacheService.getScriptCache().get('admin-session:' + token) === '1';
}

function githubJsonFile_(path) {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('GITHUB_TOKEN') || '';
  const url = 'https://api.github.com/repos/' + CONFIG.owner + '/' + CONFIG.repo + '/contents/' + path + '?ref=' + CONFIG.branch;
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'openshelf-admin'
  };
  if (token) headers.Authorization = 'Bearer ' + token;

  const response = UrlFetchApp.fetch(url, {
    method: 'get',
    muteHttpExceptions: true,
    headers: headers
  });

  if (response.getResponseCode() !== 200) {
    throw new Error('GitHub data load failed (' + response.getResponseCode() + ')');
  }

  const payload = JSON.parse(response.getContentText());
  const jsonText = Utilities.newBlob(Utilities.base64Decode(String(payload.content || '').replace(/\n/g, ''))).getDataAsString('UTF-8');
  return JSON.parse(jsonText);
}

function adminHtml_() {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
:root{--bg:#f3efe7;--paper:#fffdf8;--ink:#141414;--muted:#726d65;--line:#d5cec3;--accent:#ff5f39}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:Arial,"Pretendard",sans-serif}
button,input{font:inherit}.shell{max-width:1180px;margin:0 auto;padding:28px}
.top{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--ink);padding-bottom:18px}.brand{font:700 26px Georgia,serif}.kicker{font-size:10px;letter-spacing:.16em;color:var(--accent);font-weight:800}
.login{max-width:420px;margin:100px auto;background:var(--paper);border:1px solid var(--ink);padding:28px;box-shadow:7px 7px 0 var(--ink)}
.login h1{font:700 42px/1 Georgia,serif;margin:8px 0 24px}.login label{display:block;font-size:11px;margin:14px 0 6px}.login input{width:100%;padding:12px;border:1px solid var(--line);background:white}.login button,.logout{border:1px solid var(--ink);background:var(--ink);color:white;padding:11px 14px;font-weight:800;cursor:pointer}.login button{width:100%;margin-top:18px}.msg{min-height:20px;margin-top:12px;font-size:12px;color:#a33}
#dashboard[hidden],#login[hidden]{display:none}.hero{padding:46px 0 28px}.hero h1{font:700 58px/1 Georgia,serif;margin:9px 0}.hero p{color:var(--muted)}
.status{display:grid;grid-template-columns:repeat(6,1fr);border:1px solid var(--ink);background:var(--paper)}.status>div{padding:16px;border-right:1px solid var(--line)}.status>div:last-child{border-right:0}.status span{display:block;font-size:9px;color:var(--muted);margin-bottom:7px}.status strong{font:700 19px Georgia,serif}
.section{margin-top:42px}.section h2{font:700 30px Georgia,serif}.log{border:1px solid var(--line);background:var(--paper);margin:9px 0}.log summary{cursor:pointer;padding:15px;display:flex;justify-content:space-between}.log-body{border-top:1px solid var(--line);padding:14px}.tools{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}.tool{border:1px solid var(--line);padding:9px}.tool b{display:block}.tool small{color:var(--muted)}ul{color:var(--muted);font-size:12px;line-height:1.7}.deny{display:flex;flex-wrap:wrap;gap:7px}.deny-item{display:inline-flex;align-items:center;border:1px solid var(--line);background:var(--paper)}.deny-item code{padding:7px;border:0}.deny-item button{border:0;border-left:1px solid var(--line);background:transparent;padding:7px 9px;cursor:pointer}.section-note{color:var(--muted);font-size:12px}.op-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.op-card{border:1px solid var(--line);background:var(--paper);padding:18px;min-height:220px}.op-card>span{font-size:9px;letter-spacing:.12em;color:var(--accent);font-weight:800}.op-card h3{font:700 22px/1 Georgia,serif;margin:12px 0 8px}.op-card p{font-size:12px;color:var(--muted);line-height:1.55}.op-card input{width:100%;border:1px solid var(--line);padding:10px;background:white}.primary-action,.inline-action button,.danger-action{border:1px solid var(--ink);background:var(--ink);color:white;padding:10px 12px;font-weight:800;cursor:pointer}.primary-action{margin-top:12px}.inline-action{display:flex;gap:7px}.inline-action input{flex:1}.tool-results{margin-top:8px;display:grid;gap:6px;max-height:190px;overflow:auto}.tool-result{border:1px solid var(--line);padding:8px;display:flex;align-items:center;justify-content:space-between;gap:10px}.tool-result small{display:block;color:var(--muted);margin-top:3px}.danger-action{background:#9f2e22;border-color:#9f2e22;padding:7px 9px;font-size:10px}.operation-message{min-height:24px;margin-top:12px;font-size:12px;font-weight:700}.operation-message.ok{color:#2d7b43}.operation-message.error{color:#a33}
@media(max-width:800px){.status{grid-template-columns:repeat(2,1fr)}.tools{grid-template-columns:repeat(2,1fr)}.op-grid{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="shell">
  <div class="top"><div class="brand">OpenShelf <span class="kicker">ADMIN</span></div><button id="logout" class="logout" hidden>로그아웃</button></div>

  <section id="login" class="login">
    <span class="kicker">ADMIN ACCESS</span>
    <h1>관리자 로그인</h1>
    <form id="form">
      <label for="user">아이디</label>
      <input id="user" autocomplete="username" required>
      <label for="pass">비밀번호</label>
      <input id="pass" type="password" autocomplete="current-password" required>
      <button type="submit">로그인</button>
      <div id="msg" class="msg"></div>
    </form>
  </section>

  <main id="dashboard" hidden>
    <section class="hero"><span class="kicker">SYSTEM STATUS</span><h1>자동수집 관리</h1><p>OpenShelf 자동수집 상태와 최근 실행 로그를 확인합니다.</p></section>
    <section class="status">
      <div><span>최근 수집</span><strong id="lastRun">—</strong></div>
      <div><span>이번 회차</span><strong id="lastAdded">—</strong></div>
      <div><span>탈락</span><strong id="rejected">—</strong></div>
      <div><span>누적 자동추가</span><strong id="total">—</strong></div>
      <div><span>배치 오류</span><strong id="batch">—</strong></div>
      <div><span>상태</span><strong id="status">—</strong></div>
    </section>

    <section class="section operations">
      <span class="kicker">OPERATIONS</span>
      <h2>운영 제어</h2>
      <div class="op-grid">
        <article class="op-card">
          <span>MANUAL DISCOVERY</span>
          <h3>수동 수집 실행</h3>
          <p>다음 정각을 기다리지 않고 자동수집 워크플로를 즉시 실행합니다.</p>
          <button id="runDiscovery" class="primary-action" type="button">지금 수집 실행</button>
        </article>
        <article class="op-card">
          <span>DENYLIST</span>
          <h3>수집 제외 추가</h3>
          <p>GitHub 저장소를 이후 자동수집 후보에서 제외합니다.</p>
          <div class="inline-action"><input id="denyInput" placeholder="owner/repo"><button id="addDeny" type="button">추가</button></div>
        </article>
        <article class="op-card">
          <span>REMOVE TOOL</span>
          <h3>도구 삭제</h3>
          <p>OpenShelf에서 제거하고 같은 저장소가 다시 수집되지 않게 차단합니다.</p>
          <input id="toolSearch" placeholder="도구 이름 검색">
          <div id="toolResults" class="tool-results"></div>
        </article>
      </div>
      <div id="operationMessage" class="operation-message"></div>
    </section>

    <section class="section"><span class="kicker">RUN HISTORY</span><h2>최근 수집 로그</h2><div id="logs"></div></section>
    <section class="section"><span class="kicker">DENYLIST</span><h2>자동수집 제외 목록</h2><p class="section-note">항목의 ×를 누르면 다시 자동수집 후보에 포함됩니다.</p><div id="deny" class="deny"></div></section>
  </main>
</div>
<script>
const key='openshelf-admin-session';
let token=sessionStorage.getItem(key)||'';
let adminTools=[];
let adminDenylist=[];
const login=document.getElementById('login'),dash=document.getElementById('dashboard'),logout=document.getElementById('logout'),msg=document.getElementById('msg');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>{if(!v)return'—';const d=new Date(v);return Number.isNaN(d.getTime())?'—':new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(d)};

function showLogin(){login.hidden=false;dash.hidden=true;logout.hidden=true}
function showDash(){login.hidden=true;dash.hidden=false;logout.hidden=false}
function loadDashboard(){
  google.script.run.withSuccessHandler(r=>{
    if(!r||!r.ok){sessionStorage.removeItem(key);token='';showLogin();msg.textContent=r?.error||'세션이 만료되었습니다.';return}
    showDash();
    const s=r.state||{};
    document.getElementById('lastRun').textContent=fmt(s.lastRun);
    document.getElementById('lastAdded').textContent=Number.isFinite(Number(s.lastAddedCount))?'+'+Number(s.lastAddedCount):'—';
    document.getElementById('rejected').textContent=Number.isFinite(Number(s.lastRejectedCount))?String(s.lastRejectedCount):'—';
    document.getElementById('total').textContent=Number(s.totalAutoAdded||0).toLocaleString();
    document.getElementById('batch').textContent=Array.isArray(s.lastBatchErrors)&&s.lastBatchErrors.length?s.lastBatchErrors.length+'건':'없음';
    document.getElementById('status').textContent=(s.lastStatus||'ready').toUpperCase();
    const logs=Array.isArray(r.logs)?r.logs:[];
    document.getElementById('logs').innerHTML=logs.length?logs.map((x,i)=>`<details class="log" ${i===0?'open':''}><summary><strong>${fmt(x.timestamp)}</strong><span>+${Number(x.addedCount||0)} / 탈락 ${Number(x.rejectedCount||0)}</span></summary><div class="log-body"><div class="tools">${(x.addedTools||[]).map(t=>`<div class="tool"><b>${esc(t.name)}</b><small>${esc(t.category||'')}</small></div>`).join('')||'<span>추가 도구 없음</span>'}</div>${(x.rejected||[]).length?'<h3>탈락 사유</h3><ul>'+(x.rejected||[]).map(v=>'<li>'+esc(v)+'</li>').join('')+'</ul>':''}${(x.batchErrors||[]).length?'<h3>배치 오류</h3><ul>'+(x.batchErrors||[]).map(v=>'<li>'+esc(v)+'</li>').join('')+'</ul>':''}</div></details>`).join(''):'<p>다음 자동수집부터 로그가 기록됩니다.</p>';
    adminTools=Array.isArray(r.tools)?r.tools:[];
    adminDenylist=Array.isArray(r.denylist)?r.denylist:[];
    renderDenylist();
    renderToolResults();
  }).adminGetDashboard(token);
}


function opMessage(text,type='ok'){
  const el=document.getElementById('operationMessage');
  el.textContent=text||'';
  el.className='operation-message '+type;
}
function renderDenylist(){
  const root=document.getElementById('deny');
  root.innerHTML=adminDenylist.length?adminDenylist.map(v=>'<span class="deny-item"><code>'+esc(v)+'</code><button type="button" data-remove-deny="'+esc(v)+'">×</button></span>').join(''):'<span>현재 제외된 저장소가 없습니다.</span>';
  root.querySelectorAll('[data-remove-deny]').forEach(btn=>btn.addEventListener('click',()=>{
    const repo=btn.dataset.removeDeny;
    if(!confirm(repo+' 를 제외 목록에서 해제할까요?'))return;
    opMessage('처리 중...');
    google.script.run.withSuccessHandler(r=>{
      if(!r||!r.ok){opMessage(r?.error||'처리에 실패했습니다.','error');return}
      adminDenylist=Array.isArray(r.denylist)?r.denylist:adminDenylist;renderDenylist();opMessage(r.message||'해제했습니다.');
    }).adminRemoveDenylist(token,repo);
  }));
}
function renderToolResults(){
  const root=document.getElementById('toolResults');
  const q=String(document.getElementById('toolSearch')?.value||'').trim().toLowerCase();
  if(!q){root.innerHTML='<span class="section-note">삭제할 도구 이름을 검색하세요.</span>';return}
  const matches=adminTools.filter(t=>(String(t.name)+' '+String(t.category)+' '+String(t.github)).toLowerCase().includes(q)).slice(0,8);
  root.innerHTML=matches.length?matches.map(t=>'<div class="tool-result"><div><strong>'+esc(t.name)+'</strong><small>'+esc(t.category||'')+'</small></div><button class="danger-action" type="button" data-remove-tool="'+esc(t.id)+'">삭제</button></div>').join(''):'<span class="section-note">검색 결과가 없습니다.</span>';
  root.querySelectorAll('[data-remove-tool]').forEach(btn=>btn.addEventListener('click',()=>{
    const id=btn.dataset.removeTool;const tool=adminTools.find(t=>String(t.id)===String(id));if(!tool)return;
    if(!confirm(tool.name+' 을(를) OpenShelf에서 삭제하고 재수집도 차단할까요?'))return;
    opMessage('삭제 처리 중...');
    google.script.run.withSuccessHandler(r=>{
      if(!r||!r.ok){opMessage(r?.error||'삭제에 실패했습니다.','error');return}
      opMessage(r.message||'삭제했습니다.');loadDashboard();
    }).adminRemoveTool(token,id);
  }));
}
document.getElementById('runDiscovery')?.addEventListener('click',()=>{
  if(!confirm('자동수집을 지금 바로 실행할까요?'))return;
  const btn=document.getElementById('runDiscovery');btn.disabled=true;opMessage('수집 실행을 요청하는 중...');
  google.script.run.withSuccessHandler(r=>{btn.disabled=false;if(!r||!r.ok){opMessage(r?.error||'실행 요청에 실패했습니다.','error');return}opMessage(r.message||'실행 요청 완료');}).adminRunDiscovery(token);
});
document.getElementById('addDeny')?.addEventListener('click',()=>{
  const input=document.getElementById('denyInput');const repo=String(input.value||'').trim();if(!repo)return;
  opMessage('제외 목록에 추가하는 중...');
  google.script.run.withSuccessHandler(r=>{if(!r||!r.ok){opMessage(r?.error||'추가에 실패했습니다.','error');return}adminDenylist=Array.isArray(r.denylist)?r.denylist:adminDenylist;input.value='';renderDenylist();opMessage(r.message||'추가했습니다.');}).adminAddDenylist(token,repo);
});
document.getElementById('toolSearch')?.addEventListener('input',renderToolResults);

document.getElementById('form').addEventListener('submit',e=>{
  e.preventDefault();msg.textContent='확인 중...';
  const u=document.getElementById('user').value,p=document.getElementById('pass').value;
  google.script.run.withSuccessHandler(r=>{
    if(!r||!r.ok){msg.textContent=r?.error||'로그인에 실패했습니다.';return}
    token=r.token;sessionStorage.setItem(key,token);msg.textContent='';loadDashboard();
  }).adminLogin(u,p);
});
logout.addEventListener('click',()=>{google.script.run.adminLogout(token);sessionStorage.removeItem(key);token='';showLogin()});
if(token){google.script.run.withSuccessHandler(r=>{if(r&&r.ok)loadDashboard();else{sessionStorage.removeItem(key);token='';showLogin()}}).adminVerify(token)}else showLogin();
</script>
</body>
</html>`;
}
