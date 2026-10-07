const CONFIG = {
  owner: 'tom981105-web',
  repo: 'openshelf',
  workflow: 'discover-tools.yml',
  branch: 'main',
  timeZone: 'Asia/Seoul',
  targetMinute: 17
};

function setupOpenShelfTrigger() {
  removeOpenShelfTriggers_();
  ScriptApp.newTrigger('dispatchOpenShelfIfDue')
    .timeBased()
    .everyMinutes(5)
    .create();

  console.log('OpenShelf trigger installed. It checks every 5 minutes and dispatches once per Seoul hour after minute 17.');
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
