import fs from 'node:fs/promises';

const ORIGIN='https://www.data.go.kr';
const LIST='/tcs/dss/selectDataSetList.do';
const ID_RE=/\/data\/(\d{8})\/openapi\.do/g;
export const searchUrl=(page)=>ORIGIN+LIST+'?dType=API&currentPage='+page+'&perPage=10';
export function discoverIds(html){
 if(typeof html!=='string'||html.length>4_000_000)return [];
 return [...new Set([...html.matchAll(ID_RE)].map(m=>m[1]))];
}
function clean(text){return text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim()}
export function parseOfficialDetail(html,id){
 if(!/^\d{8}$/.test(id)||typeof html!=='string'||html.length<200||html.length>3_000_000)return null;
 const flat=clean(html);
 const name=flat.match(/(?:OpenAPI 명|오픈 API 명)\s+(.{5,160}?)\s+(?:분류체계|제공기관)/)?.[1]?.trim();
 const provider=flat.match(/제공기관\s+(.{2,80}?)\s+(?:관리부서명|관리부서 전화번호|데이터 제공|설명)/)?.[1]?.trim();
 if(!name||!provider||name.includes('데이터목록')||provider.length>75)return null;
 const category=flat.match(/분류체계\s+(.{2,70}?)\s+제공기관/)?.[1]?.trim()||'미분류';
 const summary=flat.match(/설명\s+(.{20,180}?)\s+(?:API 유형|데이터 포맷|키워드|상세 및 제공정보)/)?.[1]?.trim()||name;
 const format=flat.match(/데이터 포맷\s+([A-Za-z0-9+ ·,/]{2,30})/)?.[1]?.trim()||'원문 확인';
 const approval=flat.match(/운영단계\s*:\s*(자동승인|심의승인)/)?.[1]||'원문 확인';
 return {id,name,provider,category,summary,format,approval};
}
async function getHtml(url,fetcher){
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),12000);
 try{
  const r=await fetcher(url,{signal:ctrl.signal,redirect:'error',headers:{'User-Agent':'OpenShelf-public-catalog/1.0'}});
  if(!r.ok||!String(r.headers.get('content-type')||'').includes('text/html'))throw Error('not official HTML');
  const txt=await r.text();if(txt.length>4_000_000)throw Error('oversized response');return txt;
 }finally{clearTimeout(timer)}
}
export async function discover({fetcher=fetch,read=fs.readFile,write=fs.writeFile,pages=2,maxDetails=24}={}){
 const existing=JSON.parse(await read('data/public-api-candidates.json','utf8'));
 const catalog=JSON.parse(await read('data/public-apis.json','utf8'));
 const known=new Set([...existing.items,...catalog.items].map(x=>String(x.id)));
 const discovered=new Set();let listingErrors=0,detailErrors=0;
 for(let page=1;page<=Math.min(pages,5);page++){
  try{for(const id of discoverIds(await getHtml(searchUrl(page),fetcher)))if(!known.has(id))discovered.add(id)}
  catch(e){listingErrors++;console.warn('Official listing unavailable, page',page,e.message)}
 }
 const additions=[];
 for(const id of [...discovered].slice(0,Math.min(maxDetails,40))){
  try{
   const detail=parseOfficialDetail(await getHtml(ORIGIN+'/data/'+id+'/openapi.do',fetcher),id);
   if(detail){additions.push(detail);known.add(id)}else detailErrors++;
  }catch(e){detailErrors++;console.warn('Unverified detail',id,e.message)}
 }
 if(additions.length)await write('data/public-api-candidates.json',JSON.stringify({...existing,scope:'official-discovered-review-candidates',items:[...existing.items,...additions]},null,2)+'\n');
 const report={pages:Math.min(pages,5),discovered:discovered.size,addedCandidates:additions.length,listingErrors,detailErrors};
 console.log(JSON.stringify(report));return report;
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href)await discover();
