import {formatJson,testRegex,renderMarkdown} from './playground-core.mjs';
const $=id=>document.getElementById(id);
const modes={
  json:{title:'JSON 포맷',sample:'{"name":"OpenShelf","tools":3,"active":true}'},
  markdown:{title:'Markdown 미리보기',sample:'# OpenShelf\n**굵은 글씨**와 *기울임*\n- 첫 번째 항목\n- 두 번째 항목'},
  regex:{title:'정규식 테스트',sample:'OpenShelf has 25 helpful tools.'}
};
let mode='json',copyText='';
function selectMode(next){
  mode=next;document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.mode===mode)));
  $('playground-title').textContent=modes[mode].title;$('regexOptions').hidden=mode!=='regex';
  reset();
}
function reset(){$('playgroundInput').value=modes[mode].sample;$('playgroundOutput').hidden=false;$('playgroundOutput').textContent='실행 버튼을 눌러보세요.';$('playgroundPreview').hidden=true;$('playgroundPreview').replaceChildren();$('playgroundStatus').textContent='실행 전';copyText='';}
function run(){
  const input=$('playgroundInput').value;
  $('playgroundPreview').hidden=true;$('playgroundOutput').hidden=false;
  if(mode==='markdown'){
    $('playgroundPreview').innerHTML=renderMarkdown(input);
    $('playgroundPreview').hidden=false;$('playgroundOutput').hidden=true;
    $('playgroundStatus').textContent='렌더링 완료';copyText=input;return;
  }
  const result=mode==='json'?formatJson(input):testRegex($('regexPattern').value,$('regexFlags').value,input);
  $('playgroundOutput').textContent=result.output;
  $('playgroundStatus').textContent=result.ok?'실행 완료':'입력 오류';
  copyText=result.output;
}
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>selectMode(b.dataset.mode)));
$('playgroundRun').addEventListener('click',run);$('playgroundReset').addEventListener('click',reset);
$('playgroundCopy').addEventListener('click',async()=>{if(!copyText)return;try{await navigator.clipboard.writeText(copyText);$('playgroundStatus').textContent='복사 완료'}catch{$('playgroundStatus').textContent='복사할 수 없습니다.'}});
