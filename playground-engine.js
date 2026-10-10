// Execute an actual open-source Markdown engine, never user-controlled JavaScript.
const $=id=>document.getElementById(id);
let markedEngine=null,purify=null;
const initial=$('engineInput').value;
function status(message){$('engineStatus').textContent=message}
function render(){
  if(!markedEngine||!purify){status('엔진을 불러오지 못했습니다. 새로고침해 주세요.');return}
  const source=$('engineInput').value;
  if(source.length>50000){status('최대 50,000자까지 지원합니다.');return}
  try{
    const unsafe=markedEngine.parse(source,{async:false});
    const safe=purify.sanitize(unsafe,{USE_PROFILES:{html:true},FORBID_TAGS:['img','iframe','object','embed','form','svg','math'],FORBID_ATTR:['style'],ALLOW_DATA_ATTR:false});
    $('enginePreview').innerHTML=safe;
    $('enginePreview').querySelectorAll('a').forEach(a=>{a.setAttribute('target','_blank');a.setAttribute('rel','noopener noreferrer nofollow')});
    status('Marked 엔진 실행 완료');
  }catch(err){$('enginePreview').textContent='렌더링 오류: '+err.message;status('렌더링 실패')}
}
$('engineRun').addEventListener('click',render);
$('engineReset').addEventListener('click',()=>{$('engineInput').value=initial;render()});
$('engineCopy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('engineInput').value);status('입력 Markdown 복사 완료')}catch{status('복사할 수 없습니다.')}});
try {
  const [markedModule,purifyModule]=await Promise.all([
    import('https://cdnjs.cloudflare.com/ajax/libs/marked/15.0.12/lib/marked.esm.js'),
    import('https://cdn.jsdelivr.net/npm/dompurify@3.2.6/dist/purify.es.mjs')
  ]);
  markedEngine=markedModule.marked;purify=purifyModule.default;
  $('engineRun').disabled=false;$('engineState').textContent='Marked 15.0.12 · 브라우저 실행';render();
}catch(err){
  $('engineState').textContent='엔진 로딩 실패';$('enginePreview').textContent='CDN 접근에 실패했습니다. 인터넷 연결이나 브라우저 보안 설정을 확인해 주세요.';status('엔진 로딩 실패');
}
