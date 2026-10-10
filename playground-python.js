import {renderChart} from './playground-python-chart.mjs';
const $=id=>document.getElementById(id);const input=$('pythonInput');const initial=input.value;const csvInput=$('pythonCsv');const initialCsv=csvInput.value;const csvExample=`import csv
import io
from collections import defaultdict

rows = list(csv.DictReader(io.StringIO(openshelf_csv)))
summary = defaultdict(int)
for row in rows:
    summary[row['category']] += int(row['stars'])
openshelf_chart = {'labels': list(summary.keys()), 'values': list(summary.values())}
print('총 데이터 행:', len(rows))
for category, total in sorted(summary.items(), key=lambda x: -x[1]):
    print(f'{category}: {total:,} stars')`;const chartExample=`import csv
import io
from collections import defaultdict

rows = list(csv.DictReader(io.StringIO(openshelf_csv)))
totals = defaultdict(int)
for row in rows:
    totals[row['category']] += int(row['stars'])
items = sorted(totals.items(),key=lambda x:-x[1])
openshelf_chart = {'labels': [name for name, value in items], 'values': [value for name, value in items]}
print('CSV 행:',len(rows))
for name,value in items:
    print(name, value)`;let worker=null,timer=null,outputText='';let activeChart=null;function clearChart(){document.getElementById('pythonChart').replaceChildren();document.getElementById('pythonChartSave').hidden=true;activeChart=null}
function stop(){if(timer){clearTimeout(timer);timer=null}if(worker){worker.terminate();worker=null}}
function status(value){$('pythonStatus').textContent=value}
function run(){stop();clearChart();outputText='';const code=input.value;if(code.length>10000){status('코드 길이 초과');return}if(csvInput.value.length>50000){status('CSV 길이 초과');return}try{worker=new Worker('playground-python-worker.js')}catch(err){status('실행 준비 실패');$('pythonOutput').textContent=err.message;return}
$('pythonState').textContent='Pyodide 로딩 중';status('실행 중…');$('pythonOutput').textContent='Python 런타임을 준비하고 있습니다…';
worker.onmessage=e=>{const m=e.data;if(m.type==='ready'){worker.postMessage({code,csv:csvInput.value});$('pythonState').textContent='Python 실행 중';return}if(m.type==='result'||m.type==='error'){outputText=m.type==='result'?m.value:'';if(m.type==='result'){let parsed=null;try{parsed=typeof m.chart==='string'?JSON.parse(m.chart):null}catch{}activeChart=renderChart(document.getElementById('pythonChart'),parsed);document.getElementById('pythonChartSave').hidden=!activeChart;}$('pythonOutput').textContent=m.type==='result'?(m.value||'(출력 없음)'):'Python 오류: '+m.message;status(m.type==='result'?'실행 완료':'실행 오류');$('pythonState').textContent=m.type==='result'?'Pyodide 실행 완료':'실행 실패';stop()}};
worker.onerror=()=>{status('런타임 오류');$('pythonOutput').textContent='Pyodide 파일 로딩 또는 실행에 실패했습니다.';stop()};
timer=setTimeout(()=>{status('시간 제한 초과');$('pythonOutput').textContent='15초 제한으로 종료했습니다. 초기 다운로드가 오래 걸리는 경우 다시 시도하세요.';stop()},15000)}
$('pythonRun').addEventListener('click',run);
$('pythonStop').addEventListener('click',()=>{stop();status('사용자 중단');$('pythonState').textContent='대기'});
$('pythonReset').addEventListener('click',()=>{stop();input.value=initial;csvInput.value=initialCsv;clearChart();outputText='';clearChart();$('pythonOutput').textContent='Python 코드를 입력하고 실행하세요.';status('실행 전')});
$('pythonCopy').addEventListener('click',async()=>{if(!outputText)return;try{await navigator.clipboard.writeText(outputText);status('복사 완료')}catch{status('복사 실패')}});
window.addEventListener('pagehide',stop);

$('pythonExampleCsv').addEventListener('click',()=>{stop();input.value=csvExample;status('CSV 분석 예제 준비');$('pythonState').textContent='준비 중'});
$('pythonExampleBasic').addEventListener('click',()=>{stop();input.value=initial;status('Python 기본 예제 준비');$('pythonState').textContent='준비 중'});

document.getElementById('pythonChartSave').addEventListener('click',()=>{if(!activeChart)return;const raw=new XMLSerializer().serializeToString(activeChart);const blob=new Blob([raw],{type:'image/svg+xml'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='openshelf-python-chart.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});

$('pythonExampleChart').addEventListener('click',()=>{stop();input.value=chartExample;clearChart();status('CSV 그래프 예제 준비');$('pythonState').textContent='준비 중'});
