const $=id=>document.getElementById(id);
const initialJson=$('jsonEngineInput').value,initialExpression=$('jsonExpression').value;
let worker=null,timeout=null,copyText='';
const deadline=2000;
function stop(){if(timeout){clearTimeout(timeout);timeout=null}if(worker){worker.terminate();worker=null}}
function status(message){$('jsonEngineStatus').textContent=message}
function execute(){
  stop();copyText='';
  const input=$('jsonEngineInput').value,expression=$('jsonExpression').value;
  if(input.length>60000||expression.length>400){status('입력 제한 초과');$('jsonEngineOutput').textContent='JSON 60,000자, 쿼리 400자 이하로 입력해 주세요.';return}
  try{JSON.parse(input)}catch(error){status('JSON 문법 오류');$('jsonEngineOutput').textContent=error.message;return}
  if(!expression.trim()){status('쿼리 입력 필요');$('jsonEngineOutput').textContent='JSONata 쿼리식을 입력하세요.';return}
  $('jsonEngineState').textContent='JSONata 실행 중';status('처리 중…');
  $('jsonEngineOutput').textContent='엔진 실행 중…';
  try{worker=new Worker('playground-jsonata-worker.js')}catch(error){status('실행 실패');$('jsonEngineOutput').textContent=error.message;return}
  worker.onmessage=event=>{
    const m=event.data;
    if(m.kind==='ready'){worker.postMessage({input,expression});return}
    if(m.kind==='result'||m.kind==='error'){
      clearTimeout(timeout);timeout=null;
      copyText=m.kind==='result'?m.value:'';
      $('jsonEngineOutput').textContent=m.kind==='result'?m.value:'쿼리 오류: '+m.message;
      status(m.kind==='result'?'JSONata 실행 완료':'실행 오류');
      $('jsonEngineState').textContent=m.kind==='result'?'JSONata 2.1.0 · 로컬 실행':'실행 실패';stop();
    }
  };
  worker.onerror=()=>{status('엔진 로딩 실패');$('jsonEngineOutput').textContent='엔진 파일을 읽지 못했습니다. 인터넷 연결과 브라우저 설정을 확인하세요.';stop()};
  timeout=setTimeout(()=>{status('시간 제한 초과');$('jsonEngineOutput').textContent='실행이 2초를 초과해 중단되었습니다.';stop()},deadline);
}
$('jsonEngineRun').addEventListener('click',execute);
$('jsonEngineReset').addEventListener('click',()=>{stop();$('jsonEngineInput').value=initialJson;$('jsonExpression').value=initialExpression;$('jsonEngineOutput').textContent='실행하기를 눌러보세요.';status('실행 전');copyText=''});
$('jsonEngineCopy').addEventListener('click',async()=>{if(!copyText)return;try{await navigator.clipboard.writeText(copyText);status('결과 복사 완료')}catch{status('복사 실패')}});
window.addEventListener('pagehide',stop);
