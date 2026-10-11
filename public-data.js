const $=id=>document.getElementById(id);
const search=$('fileSearch'),category=$('fileCategory'),provider=$('fileProvider'),format=$('fileFormat');
let rows=[],index=[],page=1,requestId=0,searchTimer=0,lastFocus=null;
const PAGE_SIZE=24;
function valid(x){
 return x&&/^[0-9]{7,8}$/.test(String(x.id))&&x.url==='https://www.data.go.kr/data/'+x.id+'/fileData.do'&&
 [x.name,x.provider,x.category,x.format,x.summary].every(v=>typeof v==='string'&&v.length>0);
}
function normalized(s){return String(s||'').normalize('NFKC').toLocaleLowerCase('ko')}
function selectOptions(el,label,values){
 el.replaceChildren(new Option(label,''));
 for(const name of values.sort((a,b)=>a.localeCompare(b,'ko')))el.add(new Option(name,name));
}
function render(){
 if(!rows.length)return;
 const terms=normalized(search.value).trim().split(/\s+/).filter(Boolean);
 const matches=[];
 for(let i=0;i<rows.length;i++){
  const x=rows[i];
  if(category.value&&category.value!==x.category)continue;
  if(provider.value&&provider.value!==x.provider)continue;
  if(format.value&&!normalized(x.format).includes(normalized(format.value)))continue;
  if(terms.some(term=>!index[i].includes(term)))continue;
  matches.push(x);
 }
 const totalPages=Math.max(1,Math.ceil(matches.length/PAGE_SIZE));page=Math.min(page,totalPages);
 $('filePageInfo').textContent=page+' / '+totalPages+' 페이지';
 $('filePrev').disabled=page<=1;$('fileNext').disabled=page>=totalPages;
 $('filePagination').hidden=matches.length<=PAGE_SIZE;
 $('fileEmpty').hidden=matches.length>0;
 $('fileStatus').textContent=rows.length.toLocaleString('ko-KR')+'개 중 '+matches.length.toLocaleString('ko-KR')+'개 표시';
 const frag=document.createDocumentFragment();
 for(const item of matches.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE)){
  const card=document.createElement('article');card.className='public-card';
  const meta=document.createElement('div');meta.className='public-meta';
  for(const value of [item.provider,item.category]){const span=document.createElement('span');span.textContent=value;meta.append(span)}
  const title=document.createElement('h3');title.textContent=item.name;
  const desc=document.createElement('p');desc.className='file-summary';desc.textContent=item.summary;
  const bottom=document.createElement('div');bottom.className='public-card-bottom file-card-actions';
  const format=document.createElement('span');format.textContent=item.format+' · 공식 목록 등록';
  const detail=document.createElement('button');detail.type='button';detail.className='file-detail-btn';detail.textContent='상세보기';detail.addEventListener('click',()=>openDetail(item));
  const a=document.createElement('a');a.href=item.url;a.rel='noopener noreferrer';a.target='_blank';a.textContent='공식 상세 ↗';
  bottom.append(format,detail,a);card.append(meta,title,desc,bottom);frag.append(card);
 }
 $('fileList').replaceChildren(frag);
}
function openDetail(x){
 lastFocus=document.activeElement;
 for(const [id,key] of [['fileDetailTitle','name'],['fileDetailId','id'],['fileDetailProvider','provider'],['fileDetailCategory','category'],['fileDetailFormat','format'],['fileDetailSummary','summary']])$(id).textContent=x[key];
 $('fileDetailLink').href=x.url;$('fileDialog').hidden=false;document.body.classList.add('file-dialog-open');$('fileClose').focus();
}
function closeDetail(){
 $('fileDialog').hidden=true;document.body.classList.remove('file-dialog-open');
 if(lastFocus&&document.contains(lastFocus))lastFocus.focus();
}
$('fileClose').addEventListener('click',closeDetail);
$('fileDialog').addEventListener('click',e=>{if(e.target===e.currentTarget)closeDetail()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('fileDialog').hidden)closeDetail()});
async function json(url,timeoutMs=13000){
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeoutMs);
 try{const r=await fetch(url,{cache:'no-store',signal:ctrl.signal});if(!r.ok)throw Error('HTTP '+r.status);return await r.json()}
 finally{clearTimeout(timer)}
}
async function load(){
 const version=++requestId;rows=[];index=[];$('fileStatus').textContent='공식 파일데이터 목록을 불러오는 중…';$('fileRetry').hidden=true;
 try{
  const manifest=await json('data/public-data-official-list.json');
  if(manifest.verification!=='metadata-only'||!Number.isInteger(manifest.total)||manifest.total<80000||manifest.total>120000||!Array.isArray(manifest.parts)||manifest.parts.length>150)throw Error('Invalid official manifest');
  const chunks=Array(manifest.parts.length);let cursor=0;const failures=[];
  await Promise.all(Array.from({length:Math.min(8,manifest.parts.length)},async()=>{
   while(cursor<manifest.parts.length&&version===requestId){
    const i=cursor++,part=manifest.parts[i];if(!/^public-data-csv\/part-[0-9]{2,3}\.json$/.test(part))throw Error('Invalid part path');
    try{
     let shard;
     for(let attempt=0;attempt<2;attempt++){try{shard=await json('data/'+part);break}catch(err){if(attempt===1)throw err}}
     if(shard.verification!=='metadata-only'||!Array.isArray(shard.items)||shard.items.length>1000||shard.items.some(x=>!valid(x)))throw Error('Invalid records');
     chunks[i]=shard.items;
    }catch(e){failures.push(part);console.warn('Public Data shard error',part,e)}
    $('fileStatus').textContent='파일데이터 목록 '+chunks.filter(Boolean).length+' / '+manifest.parts.length+'개 파일 확인 중…';
   }
  }));
  if(version!==requestId)return;
  const combined=chunks.flatMap(x=>x||[]);const ids=new Set(combined.map(x=>x.id));
  if(ids.size!==combined.length)throw Error('Duplicate data IDs');
  if(!failures.length&&combined.length!==manifest.total)throw Error('Unexpected catalog count');
  if(!combined.length)throw Error('All catalog files failed');
  rows=combined;index=rows.map(x=>normalized([x.id,x.name,x.provider,x.category,x.format,x.summary].join(' ')));
  selectOptions(category,'모든 분야',[...new Set(rows.map(x=>x.category))]);
  selectOptions(provider,'모든 기관',[...new Set(rows.map(x=>x.provider))]);
  selectOptions(format,'모든 형식',[...new Set(rows.map(x=>x.format))]);
  $('fileTotal').textContent=rows.length.toLocaleString('ko-KR');page=1;render();
  if(failures.length){$('fileStatus').textContent+=' · 파일 '+failures.length+'개 일부 누락, 다시 불러오기 가능';$('fileRetry').hidden=false}
 }catch(error){if(version!==requestId)return;console.error('Public Data load error',error);$('fileStatus').textContent='목록을 불러오지 못했습니다. 다시 불러오기를 눌러주세요.';$('fileRetry').hidden=false}
}
$('fileRetry').addEventListener('click',load);
search.addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{page=1;render()},180)});
for(const el of [category,provider,format])el.addEventListener('change',()=>{page=1;render()});
$('filePrev').addEventListener('click',()=>{if(page>1){page--;render();$('fileStatus').scrollIntoView({block:'start'})}});
$('fileNext').addEventListener('click',()=>{page++;render();$('fileStatus').scrollIntoView({block:'start'})});
load();
