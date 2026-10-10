const $=id=>document.getElementById(id);const input=$('pythonInput');const initial=input.value;let worker=null,timer=null,outputText='';
function stop(){if(timer){clearTimeout(timer);timer=null}if(worker){worker.terminate();worker=null}}
function status(value){$('pythonStatus').textContent=value}
function run(){stop();outputText='';const code=input.value;if(code.length>10000){status('코드 길이 초과');return}try{worker=new Worker('playground-python-worker.js')}catch(err){status('실행 준비 실패');$('pythonOutput').textContent=err.message;return}
$('pythonState').textContent='Pyodide 로딩 중';status('실행 중…');$('pythonOutput').textContent='Python 런타임을 준비하고 있습니다…';
worker.onmessage=e=>{const m=e.data;if(m.type==='ready'){worker.postMessage({code});$('pythonState').textContent='Python 실행 중';return}if(m.type==='result'||m.type==='error'){outputText=m.type==='result'?m.value:'';$('pythonOutput').textContent=m.type==='result'?(m.value||'(출력 없음)'):'Python 오류: '+m.message;status(m.type==='result'?'실행 완료':'실행 오류');$('pythonState').textContent=m.type==='result'?'Pyodide 실행 완료':'실행 실패';stop()}};
worker.onerror=()=>{status('런타임 오류');$('pythonOutput').textContent='Pyodide 파일 로딩 또는 실행에 실패했습니다.';stop()};
timer=setTimeout(()=>{status('시간 제한 초과');$('pythonOutput').textContent='15초 제한으로 종료했습니다. 초기 다운로드가 오래 걸리는 경우 다시 시도하세요.';stop()},15000)}
$('pythonRun').addEventListener('click',run);
$('pythonStop').addEventListener('click',()=>{stop();status('사용자 중단');$('pythonState').textContent='대기'});
$('pythonReset').addEventListener('click',()=>{stop();input.value=initial;outputText='';$('pythonOutput').textContent='Python 코드를 입력하고 실행하세요.';status('실행 전')});
$('pythonCopy').addEventListener('click',async()=>{if(!outputText)return;try{await navigator.clipboard.writeText(outputText);status('복사 완료')}catch{status('복사 실패')}});
window.addEventListener('pagehide',stop);
