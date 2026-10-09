/**
 * OpenShelf Admin v5.1 + hourly discovery scheduler
 * Paste this entire file into Google Apps Script Code.gs.
 * Keep ADMIN_USER, ADMIN_PASSWORD and GITHUB_TOKEN in Script Properties.
 */

const CONFIG = {
  owner: 'tom981105-web',
  repo: 'openshelf',
  workflow: 'discover-tools.yml',
  branch: 'main',
  timeZone: 'Asia/Seoul',
  targetMinute: 0
};

function setupOpenShelfTrigger() {
  removeOpenShelfTriggers_();
  ScriptApp.newTrigger('dispatchOpenShelfIfDue')
    .timeBased()
    .everyMinutes(5)
    .create();

  console.log('OpenShelf trigger installed. It checks every 5 minutes and dispatches once per Seoul hour after minute 0.');
}

function dispatchOpenShelfIfDue() {
  const now = new Date();
  const hourKey = Utilities.formatDate(now, CONFIG.timeZone, 'yyyy-MM-dd-HH');
  const minute = Number(Utilities.formatDate(now, CONFIG.timeZone, 'mm'));

  if (minute < CONFIG.targetMinute) {
    console.log(`Not due yet: minute ${minute}`);
    return;
  }

  const props = PropertiesService.getScriptProperties();
  const automationEnabled = props.getProperty('OPENSHELF_AUTOMATION_ENABLED') !== 'false';
  if (!automationEnabled) {
    console.log('OpenShelf automatic discovery is paused.');
    return;
  }
  const lastDispatchedHour = props.getProperty('OPENSHELF_LAST_DISPATCH_HOUR');

  if (lastDispatchedHour === hourKey) {
    console.log(`Already dispatched for ${hourKey}`);
    return;
  }

  const token = props.getProperty('GITHUB_TOKEN');
  if (!token) {
    throw new Error('Missing GITHUB_TOKEN in Apps Script Script Properties.');
  }

  const url = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/actions/workflows/${CONFIG.workflow}/dispatches`;
  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    muteHttpExceptions: true,
    contentType: 'application/json',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28'
    },
    payload: JSON.stringify({ ref: CONFIG.branch })
  });

  const code = response.getResponseCode();
  if (code !== 204) {
    throw new Error(`GitHub workflow dispatch failed (${code}): ${response.getContentText()}`);
  }

  props.setProperty('OPENSHELF_LAST_DISPATCH_HOUR', hourKey);
  console.log(`Dispatched OpenShelf workflow for ${hourKey}`);
}

function testOpenShelfDispatch() {
  const props = PropertiesService.getScriptProperties();
  props.deleteProperty('OPENSHELF_LAST_DISPATCH_HOUR');
  dispatchOpenShelfIfDue();
}

function removeOpenShelfTriggers_() {
  for (const trigger of ScriptApp.getProjectTriggers()) {
    if (trigger.getHandlerFunction() === 'dispatchOpenShelfIfDue') {
      ScriptApp.deleteTrigger(trigger);
    }
  }
}

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
  try {
    return HtmlService.createHtmlOutput(adminHtml_())
      .setTitle('OpenShelf Admin')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
  } catch (err) {
    var message = String(err && err.stack ? err.stack : err);
    return HtmlService.createHtmlOutput(
      '<!doctype html><meta charset="utf-8"><title>OpenShelf Admin Error</title>' +
      '<body style="font-family:Arial,sans-serif;padding:32px;background:#f3efe7;color:#141414">' +
      '<h1>OpenShelf Admin 오류</h1><p>관리자 페이지 생성 중 오류가 발생했습니다.</p>' +
      '<pre style="white-space:pre-wrap;background:#fff;padding:16px;border:1px solid #141414">' +
      message.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') +
      '</pre></body>'
    );
  }
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
    const config = githubJsonFile_('data/discovery-config.json') || {};
    const reviewApprovedRaw = PropertiesService.getScriptProperties().getProperty('OPENSHELF_REVIEW_APPROVED') || '[]';
    var reviewApproved = [];
    try { reviewApproved = JSON.parse(reviewApprovedRaw); } catch (e) { reviewApproved = []; }
    const automationEnabled = PropertiesService.getScriptProperties().getProperty('OPENSHELF_AUTOMATION_ENABLED') !== 'false';

    return {
      ok: true,
      state: state,
      logs: Array.isArray(logs) ? logs.slice(0, 50) : [],
      denylist: Array.isArray(denylist) ? denylist : [],
      tools: Array.isArray(toolData) ? toolData.map(function(t){
        return {
          id:t.id, name:t.name, category:t.category, github:t.github, website:t.website,
          description:t.description, longDescription:t.longDescription, license:t.license,
          stars:t.stars, added:t.added, addedAt:t.addedAt, openSource:t.openSource,
          tags:Array.isArray(t.tags)?t.tags:[]
        };
      }) : [],
      reviewApproved: Array.isArray(reviewApproved) ? reviewApproved : [],
      config: config,
      automationEnabled: automationEnabled
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
    if (response.getResponseCode() === 403) {
      throw new Error('GitHub 쓰기 권한이 없습니다. Apps Script의 GITHUB_TOKEN에 openshelf 저장소 Contents: Read and write 권한을 추가해주세요.');
    }
    throw new Error('GitHub write failed (' + response.getResponseCode() + '): ' + response.getContentText());
  }
  return JSON.parse(response.getContentText());
}


function adminSaveDiscoveryConfig(token, input) {
  if (!isAdminSession_(token)) return { ok:false, error:'세션이 만료되었습니다.' };
  try {
    input = input || {};
    var target = Number(input.targetPerHour);
    var round = Number(input.roundSize);
    var stars = Number(input.minimumStars);
    var pages = Number(input.searchPagesPerTopic);
    var retries = Number(input.geminiRetryAttempts);

    if ([10,20,30].indexOf(target) < 0) return { ok:false, error:'시간당 수집 개수는 10, 20, 30 중 하나여야 합니다.' };
    if (![5,10].includes(round) || target % round !== 0) return { ok:false, error:'라운드 크기는 5 또는 10이며 총 수집 개수와 나누어떨어져야 합니다.' };
    if (!Number.isInteger(stars) || stars < 0 || stars > 10000000) return { ok:false, error:'최소 Stars 값이 올바르지 않습니다.' };
    if (!Number.isInteger(pages) || pages < 1 || pages > 5) return { ok:false, error:'검색 페이지 수는 1~5입니다.' };
    if (!Number.isInteger(retries) || retries < 1 || retries > 5) return { ok:false, error:'Gemini 재시도는 1~5회입니다.' };

    const file = githubJsonFileMeta_('data/discovery-config.json');
    const next = {
      version: 1,
      targetPerHour: target,
      roundSize: round,
      minimumStars: stars,
      searchPagesPerTopic: pages,
      geminiRetryAttempts: retries
    };

    githubWriteJsonFile_('data/discovery-config.json', next, 'admin: update discovery settings', file.sha);
    return { ok:true, message:'자동수집 설정을 저장했습니다.', config:next };
  } catch (err) {
    return { ok:false, error:String(err && err.message ? err.message : err) };
  }
}

function adminSetAutomationEnabled(token, enabled) {
  if (!isAdminSession_(token)) return { ok:false, error:'세션이 만료되었습니다.' };
  const value = enabled !== false;
  PropertiesService.getScriptProperties().setProperty('OPENSHELF_AUTOMATION_ENABLED', value ? 'true' : 'false');
  return {
    ok:true,
    enabled:value,
    message:value ? '자동수집을 재개했습니다.' : '자동수집을 일시정지했습니다.'
  };
}

function getReviewApproved_() {
  const props = PropertiesService.getScriptProperties();
  const raw = props.getProperty('OPENSHELF_REVIEW_APPROVED') || '[]';
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.map(String) : [];
  } catch (err) {
    return [];
  }
}

function setReviewApproved_(list) {
  PropertiesService.getScriptProperties().setProperty(
    'OPENSHELF_REVIEW_APPROVED',
    JSON.stringify(Array.isArray(list) ? list.map(String) : [])
  );
}

function adminApproveReview(token, toolId) {
  if (!isAdminSession_(token)) return { ok:false, error:'세션이 만료되었습니다.' };
  try {
    const id = String(toolId || '').trim();
    if (!id) return { ok:false, error:'도구 ID가 없습니다.' };
    const list = getReviewApproved_();
    if (list.indexOf(id) < 0) list.push(id);
    setReviewApproved_(list);
    return { ok:true, message:'검수 승인했습니다.', reviewApproved:list };
  } catch (err) {
    return { ok:false, error:String(err && err.message ? err.message : err) };
  }
}

function adminReReview(token, toolId) {
  if (!isAdminSession_(token)) return { ok:false, error:'세션이 만료되었습니다.' };
  try {
    const id = String(toolId || '').trim();
    if (!id) return { ok:false, error:'도구 ID가 없습니다.' };
    const list = getReviewApproved_().filter(function(x){ return String(x) !== id; });
    setReviewApproved_(list);
    return { ok:true, message:'재검수 대상으로 되돌렸습니다.', reviewApproved:list };
  } catch (err) {
    return { ok:false, error:String(err && err.message ? err.message : err) };
  }
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
.section{margin-top:42px}.section h2{font:700 30px Georgia,serif}.log{border:1px solid var(--line);background:var(--paper);margin:9px 0}.log summary{cursor:pointer;padding:15px;display:flex;justify-content:space-between}.log-body{border-top:1px solid var(--line);padding:14px}.tools{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}.tool{border:1px solid var(--line);padding:9px}.tool b{display:block}.tool small{color:var(--muted)}ul{color:var(--muted);font-size:12px;line-height:1.7}.deny{display:flex;flex-wrap:wrap;gap:7px}.deny-item{display:inline-flex;align-items:center;border:1px solid var(--line);background:var(--paper)}.deny-item code{padding:7px;border:0}.deny-item button{border:0;border-left:1px solid var(--line);background:transparent;padding:7px 9px;cursor:pointer}.section-note{color:var(--muted);font-size:12px}.op-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.op-card{border:1px solid var(--line);background:var(--paper);padding:18px;min-height:220px}.op-card>span{font-size:9px;letter-spacing:.12em;color:var(--accent);font-weight:800}.op-card h3{font:700 22px/1 Georgia,serif;margin:12px 0 8px}.op-card p{font-size:12px;color:var(--muted);line-height:1.55}.op-card input{width:100%;border:1px solid var(--line);padding:10px;background:white}.primary-action,.inline-action button,.danger-action{border:1px solid var(--ink);background:var(--ink);color:white;padding:10px 12px;font-weight:800;cursor:pointer}.primary-action{margin-top:12px}.inline-action{display:flex;gap:7px}.inline-action input{flex:1}.tool-results{margin-top:8px;display:grid;gap:6px;max-height:190px;overflow:auto}.tool-result{border:1px solid var(--line);padding:8px;display:flex;align-items:center;justify-content:space-between;gap:10px}.tool-result small{display:block;color:var(--muted);margin-top:3px}.danger-action{background:#9f2e22;border-color:#9f2e22;padding:7px 9px;font-size:10px}.operation-message{min-height:24px;margin-top:12px;font-size:12px;font-weight:700}.operation-message.ok{color:#2d7b43}.operation-message.error{color:#a33}.settings-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.settings-grid label,.automation-control{border:1px solid var(--line);background:var(--paper);padding:14px}.settings-grid label>span,.automation-control>span{display:block;font-size:9px;color:var(--muted);margin-bottom:8px;letter-spacing:.08em}.settings-grid input,.settings-grid select{width:100%;border:1px solid var(--line);background:white;padding:9px}.automation-control strong{display:block;font:700 20px Georgia,serif;margin-bottom:10px}.automation-control button{border:1px solid var(--ink);background:transparent;padding:8px 10px;font-weight:800}.settings-actions{display:flex;align-items:center;gap:12px;margin-top:12px}
.analytics-summary{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid var(--ink);background:var(--paper);margin-bottom:12px}
.analytics-summary>div{padding:15px;border-right:1px solid var(--line)}
.analytics-summary>div:last-child{border-right:0}
.analytics-summary span{display:block;font-size:9px;color:var(--muted);margin-bottom:7px;letter-spacing:.06em}
.analytics-summary strong{font:700 24px Georgia,serif}
.analytics-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
.analytics-card{border:1px solid var(--line);background:var(--paper);padding:16px;min-height:250px}
.analytics-head{display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-bottom:14px}
.analytics-head h3{font:700 20px Georgia,serif;margin:0}
.analytics-head span{font-size:10px;color:var(--muted)}
.bar-chart{display:grid;gap:8px}
.bar-row{display:grid;grid-template-columns:92px 1fr 54px;gap:8px;align-items:center;font-size:11px}
.bar-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bar-track{height:10px;border:1px solid var(--line);background:#fff}
.bar-fill{height:100%;background:var(--ink)}
.bar-value{text-align:right;color:var(--muted)}
.status-chart{display:grid;gap:9px}
.status-row{display:grid;grid-template-columns:82px 1fr 50px;gap:8px;align-items:center;font-size:11px}
.status-pill{font-weight:800}
.recent-runs{display:grid;gap:7px}
.run-row{display:grid;grid-template-columns:92px 70px 1fr;gap:8px;font-size:11px;padding:7px 0;border-bottom:1px solid var(--line)}
.run-row:last-child{border-bottom:0}
.run-state{font-weight:800}
.run-state.success{color:#2d7b43}
.run-state.partial{color:#9b6b10}
.run-state.failed,.run-state.error{color:#a33}.review-top{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid var(--ink);background:var(--paper);margin-bottom:12px}.review-top>div{padding:14px;border-right:1px solid var(--line)}.review-top>div:last-child{border-right:0}.review-top span{display:block;font-size:9px;color:var(--muted);margin-bottom:6px}.review-top strong{font:700 24px Georgia,serif}.review-tabs{display:flex;gap:7px;margin-bottom:10px}.review-tab{border:1px solid var(--ink);background:transparent;padding:8px 10px;font-weight:800}.review-tab.active{background:var(--ink);color:white}.review-list{display:grid;gap:9px}.review-card{border:1px solid var(--line);background:var(--paper);padding:14px}.review-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.review-title{font:700 21px Georgia,serif}.score{font:700 22px Georgia,serif}.score.low{color:#a33}.score.mid{color:#9b6b10}.score.good{color:#2d7b43}.review-meta{font-size:11px;color:var(--muted);margin-top:4px}.review-flags{display:flex;flex-wrap:wrap;gap:5px;margin:10px 0}.review-flag{font-size:10px;border:1px solid var(--line);padding:4px 6px;background:#fff}.review-desc{font-size:12px;line-height:1.55;color:#3e3a35}.review-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}.review-actions button{border:1px solid var(--ink);background:transparent;padding:7px 9px;font-weight:800}.review-actions .approve{background:#2d7b43;border-color:#2d7b43;color:white}.review-actions .remove{background:#9f2e22;border-color:#9f2e22;color:white}
@media(max-width:800px){.status{grid-template-columns:repeat(2,1fr)}.tools{grid-template-columns:repeat(2,1fr)}.op-grid,.settings-grid,.analytics-grid{grid-template-columns:1fr}.analytics-summary{grid-template-columns:repeat(2,1fr)}.analytics-summary>div{border-bottom:1px solid var(--line)}.review-top{grid-template-columns:1fr}.review-top>div{border-right:0;border-bottom:1px solid var(--line)}}
</style>
</head>
<body>
<div class="shell">
  <div id="bootStatus" style="padding:10px 12px;margin-bottom:12px;border:1px solid #141414;background:#fffdf8;font-size:12px">관리자 페이지 v5.1 불러오는 중...</div>
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

    <section class="section analytics">
      <span class="kicker">ADMIN ANALYTICS</span>
      <h2>통계 대시보드</h2>
      <div class="analytics-summary">
        <div><span>전체 도구</span><strong id="statTotalTools">0</strong></div>
        <div><span>최근 7일 추가</span><strong id="statAdded7d">0</strong></div>
        <div><span>평균 Stars</span><strong id="statAvgStars">0</strong></div>
        <div><span>검수 필요</span><strong id="statReviewNeeded">0</strong></div>
      </div>

      <div class="analytics-grid">
        <article class="analytics-card">
          <div class="analytics-head"><h3>최근 7일 추가량</h3><span id="stat7dTotal">0개</span></div>
          <div id="dailyAddsChart" class="bar-chart"></div>
        </article>

        <article class="analytics-card">
          <div class="analytics-head"><h3>카테고리 분포</h3><span id="categoryCount">0개 카테고리</span></div>
          <div id="categoryChart" class="bar-chart"></div>
        </article>

        <article class="analytics-card">
          <div class="analytics-head"><h3>자동수집 성공률</h3><span id="successRate">—</span></div>
          <div id="runStatusChart" class="status-chart"></div>
        </article>

        <article class="analytics-card">
          <div class="analytics-head"><h3>최근 회차</h3><span>최대 10회</span></div>
          <div id="recentRuns" class="recent-runs"></div>
        </article>
      </div>
    </section>

    <section class="section review">
      <span class="kicker">REVIEW INBOX</span>
      <h2>자동 검수함</h2>
      <div class="review-top">
        <div><span>검수 필요</span><strong id="reviewCount">0</strong></div>
        <div><span>최근 추가 20개</span><strong id="recentCount">0</strong></div>
        <div><span>승인 완료</span><strong id="approvedCount">0</strong></div>
        <div><span>품질 기준</span><strong>70점</strong></div>
      </div>
      <div class="review-tabs">
        <button id="reviewProblems" class="review-tab active" type="button">검수 필요</button>
        <button id="reviewRecent" class="review-tab" type="button">최근 추가 20개</button>
        <button id="reviewApproved" class="review-tab" type="button">승인 완료</button>
      </div>
      <div id="reviewList" class="review-list"></div>
    </section>

    <section class="section settings">
      <span class="kicker">DISCOVERY SETTINGS</span>
      <h2>자동수집 설정</h2>
      <div class="settings-grid">
        <label><span>시간당 수집</span><select id="cfgTarget"><option value="10">10개</option><option value="20">20개</option><option value="30">30개</option></select></label>
        <label><span>라운드당 수집</span><select id="cfgRound"><option value="5">5개</option><option value="10">10개</option></select></label>
        <label><span>최소 Stars</span><input id="cfgStars" type="number" min="0" max="10000000" step="50"></label>
        <label><span>검색 페이지</span><select id="cfgPages"><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option></select></label>
        <label><span>Gemini 재시도</span><select id="cfgRetries"><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option></select></label>
        <div class="automation-control"><span>자동수집</span><strong id="automationState">—</strong><button id="toggleAutomation" type="button">—</button></div>
      </div>
      <div class="settings-actions"><button id="saveConfig" class="primary-action" type="button">설정 저장</button><span id="configSummary" class="section-note"></span></div>
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
          <span>수집 제외 목록</span>
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
      <p class="section-note"><strong>GitHub 쓰기 기능 안내:</strong> 수집 제외, 도구 삭제, 수집 설정 저장은 Apps Script의 GITHUB_TOKEN에 해당 저장소 <strong>Contents: Read and write</strong> 권한이 필요합니다. 검수 승인/재검수는 Apps Script 내부에 저장되어 이 권한 없이도 작동합니다.</p>
    </section>

    <section class="section"><span class="kicker">RUN HISTORY</span><h2>최근 수집 로그</h2><div id="logs"></div></section>
    <section class="section"><span class="kicker">수집 제외 목록</span><h2>자동수집 제외 목록</h2><p class="section-note">항목의 ×를 누르면 다시 자동수집 후보에 포함됩니다.</p><div id="deny" class="deny"></div></section>
  </main>
</div>
<script>
window.addEventListener('error',function(e){
  var boot=document.getElementById('bootStatus');
  if(boot){boot.style.display='block';boot.style.color='#a33';boot.textContent='브라우저 오류: '+(e.message||'알 수 없는 오류');}
});
const key='openshelf-admin-session';
let token=sessionStorage.getItem(key)||'';
let adminTools=[];
let adminDenylist=[];
let adminConfig={};
let automationEnabled=true;
let reviewApproved=[];
let reviewMode='problems';
let adminLogs=[];
const login=document.getElementById('login'),dash=document.getElementById('dashboard'),logout=document.getElementById('logout'),msg=document.getElementById('msg');
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>{if(!v)return'—';const d=new Date(v);return Number.isNaN(d.getTime())?'—':new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(d)};

function showLogin(){
  login.hidden=false;dash.hidden=true;logout.hidden=true;
  var boot=document.getElementById('bootStatus');if(boot)boot.style.display='none';
}
function clientFailure(err){
  var boot=document.getElementById('bootStatus');
  if(boot){boot.style.display='block';boot.textContent='오류: '+String(err&&err.message?err.message:err);boot.style.color='#a33'}
  login.hidden=false;dash.hidden=true;logout.hidden=true;
  msg.textContent='관리자 데이터를 불러오지 못했습니다.';
}
function showDash(){
  login.hidden=true;dash.hidden=false;logout.hidden=false;
  var boot=document.getElementById('bootStatus');if(boot)boot.style.display='none';
}
function loadDashboard(){
  google.script.run.withFailureHandler(clientFailure).withSuccessHandler(r=>{
    if(!r||!r.ok){sessionStorage.removeItem(key);token='';showLogin();msg.textContent=(r&&r.error)||'세션이 만료되었습니다.';return}
    showDash();
    const s=r.state||{};
    document.getElementById('lastRun').textContent=fmt(s.lastRun);
    document.getElementById('lastAdded').textContent=Number.isFinite(Number(s.lastAddedCount))?'+'+Number(s.lastAddedCount):'—';
    document.getElementById('rejected').textContent=Number.isFinite(Number(s.lastRejectedCount))?String(s.lastRejectedCount):'—';
    document.getElementById('total').textContent=Number(s.totalAutoAdded||0).toLocaleString();
    document.getElementById('batch').textContent=Array.isArray(s.lastBatchErrors)&&s.lastBatchErrors.length?s.lastBatchErrors.length+'건':'없음';
    document.getElementById('status').textContent=(s.lastStatus||'ready').toUpperCase();
    const logs=Array.isArray(r.logs)?r.logs:[];
    adminLogs=logs;
    document.getElementById('logs').innerHTML=logs.length?logs.map((x,i)=>'<details class="log" '+(i===0?'open':'')+'><summary><strong>'+fmt(x.timestamp)+'</strong><span>+'+Number(x.addedCount||0)+' / 탈락 '+Number(x.rejectedCount||0)+'</span></summary><div class="log-body"><div class="tools">'+((x.addedTools||[]).map(t=>'<div class="tool"><b>'+esc(t.name)+'</b><small>'+esc(t.category||'')+'</small></div>').join('')||'<span>추가 도구 없음</span>')+'</div>'+((x.rejected||[]).length?'<h3>탈락 사유</h3><ul>'+(x.rejected||[]).map(v=>'<li>'+esc(v)+'</li>').join('')+'</ul>':'')+((x.batchErrors||[]).length?'<h3>배치 오류</h3><ul>'+(x.batchErrors||[]).map(v=>'<li>'+esc(v)+'</li>').join('')+'</ul>':'')+'</div></details>').join(''):'<p>다음 자동수집부터 로그가 기록됩니다.</p>';
    adminTools=Array.isArray(r.tools)?r.tools:[];
    adminDenylist=Array.isArray(r.denylist)?r.denylist:[];
    adminConfig=r.config||{};
    automationEnabled=r.automationEnabled!==false;
    reviewApproved=Array.isArray(r.reviewApproved)?r.reviewApproved:[];
    renderConfig();
    renderAnalytics();
    renderReview();
    renderDenylist();
    renderToolResults();
  }).adminGetDashboard(token);
}


function dayKeySeoul(value){
  const d=new Date(value);
  if(Number.isNaN(d.getTime()))return '';
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);
  const map={};parts.forEach(p=>{map[p.type]=p.value});
  return map.year+'-'+map.month+'-'+map.day;
}
function lastSevenDayKeys(){
  const out=[];
  const now=new Date();
  for(let i=6;i>=0;i--){
    const d=new Date(now.getTime()-i*86400000);
    out.push(dayKeySeoul(d));
  }
  return out;
}
function shortDateLabel(key){
  const p=String(key||'').split('-');
  return p.length===3?p[1]+'/'+p[2]:key;
}
function renderBars(rootId,rows){
  const root=document.getElementById(rootId);
  if(!root)return;
  if(!rows.length){root.innerHTML='<p class="section-note">표시할 데이터가 없습니다.</p>';return}
  const max=Math.max.apply(null,rows.map(r=>Number(r.value||0)).concat([1]));
  root.innerHTML=rows.map(r=>{
    const width=Math.max(2,Math.round((Number(r.value||0)/max)*100));
    return '<div class="bar-row"><div class="bar-label" title="'+esc(r.label)+'">'+esc(r.label)+'</div><div class="bar-track"><div class="bar-fill" style="width:'+width+'%"></div></div><div class="bar-value">'+Number(r.value||0).toLocaleString()+'</div></div>';
  }).join('');
}
function renderAnalytics(){
  const tools=Array.isArray(adminTools)?adminTools:[];
  const logs=Array.isArray(adminLogs)?adminLogs:[];
  const dayKeys=lastSevenDayKeys();
  const daySet=new Set(dayKeys);

  const addedCounts={};
  dayKeys.forEach(k=>addedCounts[k]=0);
  tools.forEach(t=>{
    const k=dayKeySeoul(t.addedAt||t.added);
    if(daySet.has(k))addedCounts[k]=(addedCounts[k]||0)+1;
  });
  const added7=dayKeys.reduce((sum,k)=>sum+(addedCounts[k]||0),0);
  const avgStars=tools.length?Math.round(tools.reduce((sum,t)=>sum+Number(t.stars||0),0)/tools.length):0;
  const reviewNeeded=tools.map(t=>qualityReview(t)).filter(r=>r.score<70).length;

  document.getElementById('statTotalTools').textContent=tools.length.toLocaleString();
  document.getElementById('statAdded7d').textContent=added7.toLocaleString();
  document.getElementById('statAvgStars').textContent=avgStars.toLocaleString();
  document.getElementById('statReviewNeeded').textContent=reviewNeeded.toLocaleString();
  document.getElementById('stat7dTotal').textContent=added7.toLocaleString()+'개';

  renderBars('dailyAddsChart',dayKeys.map(k=>({label:shortDateLabel(k),value:addedCounts[k]||0})));

  const categoryMap={};
  tools.forEach(t=>{const k=String(t.category||'미분류');categoryMap[k]=(categoryMap[k]||0)+1});
  const categories=Object.keys(categoryMap).map(k=>({label:k,value:categoryMap[k]})).sort((a,b)=>b.value-a.value);
  document.getElementById('categoryCount').textContent=categories.length+'개 카테고리';
  renderBars('categoryChart',categories.slice(0,10));

  const counts={success:0,partial:0,failed:0};
  logs.forEach(x=>{
    const s=String(x.status||'').toLowerCase();
    if(s==='success')counts.success++;
    else if(s==='partial')counts.partial++;
    else counts.failed++;
  });
  const totalRuns=counts.success+counts.partial+counts.failed;
  const successRate=totalRuns?Math.round((counts.success/totalRuns)*100):0;
  document.getElementById('successRate').textContent=totalRuns?successRate+'%':'—';
  const statusRows=[
    {label:'성공',value:counts.success,key:'success'},
    {label:'부분성공',value:counts.partial,key:'partial'},
    {label:'실패/기타',value:counts.failed,key:'failed'}
  ];
  const maxStatus=Math.max(1,counts.success,counts.partial,counts.failed);
  document.getElementById('runStatusChart').innerHTML=statusRows.map(r=>{
    const width=Math.max(2,Math.round((r.value/maxStatus)*100));
    return '<div class="status-row"><div class="status-pill">'+r.label+'</div><div class="bar-track"><div class="bar-fill" style="width:'+width+'%"></div></div><div class="bar-value">'+r.value+'</div></div>';
  }).join('');

  const recent=logs.slice(0,10);
  document.getElementById('recentRuns').innerHTML=recent.length?recent.map(x=>{
    const status=String(x.status||'unknown').toLowerCase();
    return '<div class="run-row"><div>'+fmt(x.timestamp)+'</div><div class="run-state '+esc(status)+'">'+esc(status.toUpperCase())+'</div><div>+'+Number(x.addedCount||0)+' · 탈락 '+Number(x.rejectedCount||0)+'</div></div>';
  }).join(''):'<p class="section-note">아직 실행 기록이 없습니다.</p>';
}

function canon(v){return String(v||'').normalize('NFKC').toLowerCase().replace(/[^a-z0-9가-힣]+/g,'')}
function qualityReview(tool){
  let score=100,flags=[];
  const desc=String(tool.description||''),longDesc=String(tool.longDescription||'');
  if(desc.length<35){score-=15;flags.push('설명 짧음')}
  if(longDesc.length<90){score-=15;flags.push('상세 설명 부족')}
  if(!tool.website){score-=10;flags.push('홈페이지 없음')}
  if(!tool.license||tool.license==='확인 필요'||tool.license==='NOASSERTION'){score-=20;flags.push('라이선스 불명확')}
  if(tool.openSource===false){score-=8;flags.push('오픈소스 확인 필요')}
  if(Number(tool.stars||0)<500){score-=10;flags.push('Stars 낮음')}
  if(!tool.category){score-=15;flags.push('카테고리 없음')}
  const dupName=adminTools.filter(x=>x.id!==tool.id&&canon(x.name)===canon(tool.name)).length>0;
  const rawSite=String(tool.website||'').toLowerCase();
  const site=rawSite.endsWith('/')?rawSite.slice(0,-1):rawSite;
  const dupSite=site&&adminTools.filter(x=>{const raw=String(x.website||'').toLowerCase();const normalized=raw.endsWith('/')?raw.slice(0,-1):raw;return x.id!==tool.id&&normalized===site}).length>0;
  if(dupName||dupSite){score-=25;flags.push('중복 의심')}
  return {score:Math.max(0,score),flags:flags};
}
function recentTools20(){
  return adminTools.slice().sort((a,b)=>{
    const av=Date.parse(a.addedAt||a.added||0)||0,bv=Date.parse(b.addedAt||b.added||0)||0;
    return bv-av;
  }).slice(0,20);
}
function renderReview(){
  const problems=adminTools.map(t=>({tool:t,review:qualityReview(t)})).filter(x=>x.review.score<70&&!reviewApproved.includes(String(x.tool.id))).sort((a,b)=>a.review.score-b.review.score);
  const recent=recentTools20().map(t=>({tool:t,review:qualityReview(t)}));
  const approved=adminTools.filter(t=>reviewApproved.includes(String(t.id))).map(t=>({tool:t,review:qualityReview(t)}));
  document.getElementById('reviewCount').textContent=String(problems.length);
  document.getElementById('recentCount').textContent=String(recent.length);
  document.getElementById('approvedCount').textContent=String(approved.length);
  document.getElementById('reviewProblems').classList.toggle('active',reviewMode==='problems');
  document.getElementById('reviewRecent').classList.toggle('active',reviewMode==='recent');
  document.getElementById('reviewApproved').classList.toggle('active',reviewMode==='approved');
  const rows=reviewMode==='recent'?recent:(reviewMode==='approved'?approved:problems);
  const root=document.getElementById('reviewList');
  if(!rows.length){root.innerHTML='<p class="section-note">현재 검수할 도구가 없습니다.</p>';return}
  root.innerHTML=rows.map(x=>{
    const t=x.tool,r=x.review;
    const scoreClass=r.score<55?'low':(r.score<70?'mid':'good');
    const approvedNow=reviewApproved.includes(String(t.id));
    const reviewButton=approvedNow
      ? '<button type="button" data-review-rereview="'+esc(t.id)+'">재검수</button>'
      : '<button class="approve" type="button" data-review-approve="'+esc(t.id)+'">승인</button>';
    return '<article class="review-card"><div class="review-head"><div><div class="review-title">'+esc(t.name)+'</div><div class="review-meta">'+esc(t.category||'미분류')+' · ★ '+Number(t.stars||0).toLocaleString()+'</div></div><div class="score '+scoreClass+'">'+r.score+'</div></div><div class="review-flags">'+(r.flags.length?r.flags.map(v=>'<span class="review-flag">'+esc(v)+'</span>').join(''):'<span class="review-flag">이상 없음</span>')+'</div><div class="review-desc">'+esc(t.description||'설명 없음')+'</div><div class="review-actions">'+reviewButton+'<button type="button" data-review-deny="'+esc(t.github||'')+'">수집 제외</button><button class="remove" type="button" data-review-remove="'+esc(t.id)+'">삭제+차단</button></div></article>';
  }).join('');
  root.querySelectorAll('[data-review-approve]').forEach(btn=>btn.addEventListener('click',()=>{
    const id=btn.dataset.reviewApprove;
    opMessage('검수 승인 저장 중...');
    google.script.run.withFailureHandler(clientFailure).withSuccessHandler(r=>{
      if(!r||!r.ok){opMessage((r&&r.error)||'승인에 실패했습니다.','error');return}
      reviewApproved=Array.isArray(r.reviewApproved)?r.reviewApproved:reviewApproved;renderReview();renderAnalytics();opMessage(r.message||'승인했습니다.');
    }).adminApproveReview(token,id);
  }));
  root.querySelectorAll('[data-review-rereview]').forEach(btn=>btn.addEventListener('click',()=>{
    const id=btn.dataset.reviewRereview;
    opMessage('재검수 대상으로 변경 중...');
    google.script.run.withFailureHandler(clientFailure).withSuccessHandler(r=>{
      if(!r||!r.ok){opMessage((r&&r.error)||'재검수 변경에 실패했습니다.','error');return}
      reviewApproved=Array.isArray(r.reviewApproved)?r.reviewApproved:reviewApproved;renderReview();renderAnalytics();opMessage(r.message||'재검수 대상으로 변경했습니다.');
    }).adminReReview(token,id);
  }));
  root.querySelectorAll('[data-review-deny]').forEach(btn=>btn.addEventListener('click',()=>{
    const repo=btn.dataset.reviewDeny;if(!repo)return;
    if(!confirm('이 저장소를 수집 제외 목록에 추가할까요?'))return;
    opMessage('수집 제외 목록에 추가 중...');
    google.script.run.withFailureHandler(clientFailure).withSuccessHandler(r=>{
      if(!r||!r.ok){opMessage((r&&r.error)||'수집 제외 목록 추가에 실패했습니다.','error');return}
      adminDenylist=Array.isArray(r.denylist)?r.denylist:adminDenylist;renderDenylist();opMessage(r.message||'추가했습니다.');
    }).adminAddDenylist(token,repo);
  }));
  root.querySelectorAll('[data-review-remove]').forEach(btn=>btn.addEventListener('click',()=>{
    const id=btn.dataset.reviewRemove;const tool=adminTools.find(t=>String(t.id)===String(id));if(!tool)return;
    if(!confirm(tool.name+' 을(를) 삭제하고 재수집도 차단할까요?'))return;
    opMessage('삭제 처리 중...');
    google.script.run.withFailureHandler(clientFailure).withSuccessHandler(r=>{
      if(!r||!r.ok){opMessage((r&&r.error)||'삭제에 실패했습니다.','error');return}
      opMessage(r.message||'삭제했습니다.');loadDashboard();
    }).adminRemoveTool(token,id);
  }));
}
document.getElementById('reviewProblems').addEventListener('click',()=>{reviewMode='problems';renderReview()});
document.getElementById('reviewRecent').addEventListener('click',()=>{reviewMode='recent';renderReview()});
document.getElementById('reviewApproved').addEventListener('click',()=>{reviewMode='approved';renderReview()});

function renderConfig(){
  document.getElementById('cfgTarget').value=String(adminConfig.targetPerHour||20);
  document.getElementById('cfgRound').value=String(adminConfig.roundSize||10);
  document.getElementById('cfgStars').value=String(adminConfig.minimumStars==null?200:adminConfig.minimumStars);
  document.getElementById('cfgPages').value=String(adminConfig.searchPagesPerTopic||3);
  document.getElementById('cfgRetries').value=String(adminConfig.geminiRetryAttempts||3);
  document.getElementById('automationState').textContent=automationEnabled?'RUNNING':'PAUSED';
  const toggle=document.getElementById('toggleAutomation');
  toggle.textContent=automationEnabled?'일시정지':'재개';
  document.getElementById('configSummary').textContent=(adminConfig.roundSize||10)+'개 × '+Math.ceil((adminConfig.targetPerHour||20)/(adminConfig.roundSize||10))+'라운드';
}
document.getElementById('saveConfig').addEventListener('click',()=>{
  const input={
    targetPerHour:Number(document.getElementById('cfgTarget').value),
    roundSize:Number(document.getElementById('cfgRound').value),
    minimumStars:Number(document.getElementById('cfgStars').value),
    searchPagesPerTopic:Number(document.getElementById('cfgPages').value),
    geminiRetryAttempts:Number(document.getElementById('cfgRetries').value)
  };
  opMessage('설정을 저장하는 중...');
  google.script.run.withFailureHandler(clientFailure).withSuccessHandler(r=>{
    if(!r||!r.ok){opMessage((r&&r.error)||'설정 저장에 실패했습니다.','error');return}
    adminConfig=r.config||input;renderConfig();opMessage(r.message||'설정을 저장했습니다.');
  }).adminSaveDiscoveryConfig(token,input);
});
document.getElementById('toggleAutomation').addEventListener('click',()=>{
  const next=!automationEnabled;
  if(!confirm(next?'자동수집을 다시 시작할까요?':'매시간 자동수집을 일시정지할까요?'))return;
  opMessage('상태를 변경하는 중...');
  google.script.run.withFailureHandler(clientFailure).withSuccessHandler(r=>{
    if(!r||!r.ok){opMessage((r&&r.error)||'상태 변경에 실패했습니다.','error');return}
    automationEnabled=r.enabled!==false;renderConfig();opMessage(r.message||'변경했습니다.');
  }).adminSetAutomationEnabled(token,next);
});

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
    google.script.run.withFailureHandler(clientFailure).withSuccessHandler(r=>{
      if(!r||!r.ok){opMessage((r&&r.error)||'처리에 실패했습니다.','error');return}
      adminDenylist=Array.isArray(r.denylist)?r.denylist:adminDenylist;renderDenylist();opMessage(r.message||'해제했습니다.');
    }).adminRemoveDenylist(token,repo);
  }));
}
function renderToolResults(){
  const root=document.getElementById('toolResults');
  const q=String(document.getElementById('toolSearch').value||'').trim().toLowerCase();
  if(!q){root.innerHTML='<span class="section-note">삭제할 도구 이름을 검색하세요.</span>';return}
  const matches=adminTools.filter(t=>(String(t.name)+' '+String(t.category)+' '+String(t.github)).toLowerCase().includes(q)).slice(0,8);
  root.innerHTML=matches.length?matches.map(t=>'<div class="tool-result"><div><strong>'+esc(t.name)+'</strong><small>'+esc(t.category||'')+'</small></div><button class="danger-action" type="button" data-remove-tool="'+esc(t.id)+'">삭제</button></div>').join(''):'<span class="section-note">검색 결과가 없습니다.</span>';
  root.querySelectorAll('[data-remove-tool]').forEach(btn=>btn.addEventListener('click',()=>{
    const id=btn.dataset.removeTool;const tool=adminTools.find(t=>String(t.id)===String(id));if(!tool)return;
    if(!confirm(tool.name+' 을(를) OpenShelf에서 삭제하고 재수집도 차단할까요?'))return;
    opMessage('삭제 처리 중...');
    google.script.run.withFailureHandler(clientFailure).withSuccessHandler(r=>{
      if(!r||!r.ok){opMessage((r&&r.error)||'삭제에 실패했습니다.','error');return}
      opMessage(r.message||'삭제했습니다.');loadDashboard();
    }).adminRemoveTool(token,id);
  }));
}
document.getElementById('runDiscovery').addEventListener('click',()=>{
  if(!confirm('자동수집을 지금 바로 실행할까요?'))return;
  const btn=document.getElementById('runDiscovery');btn.disabled=true;opMessage('수집 실행을 요청하는 중...');
  google.script.run.withFailureHandler(clientFailure).withSuccessHandler(r=>{btn.disabled=false;if(!r||!r.ok){opMessage((r&&r.error)||'실행 요청에 실패했습니다.','error');return}opMessage(r.message||'실행 요청 완료');}).adminRunDiscovery(token);
});
document.getElementById('addDeny').addEventListener('click',()=>{
  const input=document.getElementById('denyInput');const repo=String(input.value||'').trim();if(!repo)return;
  opMessage('제외 목록에 추가하는 중...');
  google.script.run.withFailureHandler(clientFailure).withSuccessHandler(r=>{if(!r||!r.ok){opMessage((r&&r.error)||'추가에 실패했습니다.','error');return}adminDenylist=Array.isArray(r.denylist)?r.denylist:adminDenylist;input.value='';renderDenylist();opMessage(r.message||'추가했습니다.');}).adminAddDenylist(token,repo);
});
document.getElementById('toolSearch').addEventListener('input',renderToolResults);

document.getElementById('form').addEventListener('submit',e=>{
  e.preventDefault();msg.textContent='확인 중...';
  const u=document.getElementById('user').value,p=document.getElementById('pass').value;
  google.script.run.withFailureHandler(clientFailure).withSuccessHandler(r=>{
    if(!r||!r.ok){msg.textContent=(r&&r.error)||'로그인에 실패했습니다.';return}
    token=r.token;sessionStorage.setItem(key,token);msg.textContent='';loadDashboard();
  }).adminLogin(u,p);
});
logout.addEventListener('click',()=>{google.script.run.adminLogout(token);sessionStorage.removeItem(key);token='';showLogin()});
if(token){google.script.run.withFailureHandler(clientFailure).withSuccessHandler(r=>{if(r&&r.ok)loadDashboard();else{sessionStorage.removeItem(key);token='';showLogin()}}).adminVerify(token)}else showLogin();
</script>
</body>
</html>`;
}
