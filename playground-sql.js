const $=id=>document.getElementById(id);const source=$('sqlInput');const initial=source.value;let active=null,timeout=null,result='';
function stop(){if(timeout!==null){clearTimeout(timeout);timeout=null}if(active){active.terminate();active=null}}
function status(value){$('sqlStatus').textContent=value}
function run(){
 stop();result='';const sql=source.value;
 if(sql.length>30000){status('입력 제한 초과');$('sqlOutput').textContent='SQL은 30,000자 이하로 입력해주세요.';return}
 status('WASM 로딩 및 실행 중…');$('sqlState').textContent='실행 중';
 try{active=new Worker('playground-sql-worker.js')}catch(e){status('Worker 생성 오류');$('sqlOutput').textContent=e.message;return}
 active.onmessage=e=>{
  const msg=e.data;
  if(msg.type==='ready'){active.postMessage({sql});return}
  if(msg.type==='result'||msg.type==='error'){
   result=msg.type==='result'?msg.value:'';
   $('sqlOutput').textContent=msg.type==='result'?msg.value:'SQL 오류: '+msg.message;
   $('sqlState').textContent=msg.type==='result'?'SQLite WASM 실행 완료':'실행 실패';
   status(msg.type==='result'?'SQLite 실행 성공':'오류 발생');stop();
  }
 };
 active.onerror=()=>{status('엔진 로딩 실패');$('sqlOutput').textContent='CDN 연결 또는 WASM 로딩을 확인해주세요.';stop()};
 timeout=setTimeout(()=>{status('3초 시간 제한 초과');$('sqlOutput').textContent='실행을 중단했습니다. SQL을 간단히 하거나 네트워크 상태를 확인하세요.';stop()},3000);
}
$('sqlRun').addEventListener('click',run);
$('sqlReset').addEventListener('click',()=>{stop();source.value=initial;result='';$('sqlOutput').textContent='실행하기를 눌러보세요.';status('실행 전');$('sqlState').textContent='준비 중'});
$('sqlCopy').addEventListener('click',async()=>{if(!result)return;try{await navigator.clipboard.writeText(result);status('결과 복사 완료')}catch{status('복사 실패')}});
window.addEventListener('pagehide',stop);
