export const normalize=value=>String(value??'').normalize('NFKC').toLocaleLowerCase('ko-KR').replace(/\s+/g,' ').trim();
const indexed=new WeakMap();
function fields(row){let result=indexed.get(row);if(!result){result={name:normalize(row.name),provider:normalize(row.provider),category:normalize(row.category),summary:normalize(row.summary||row.description),tags:normalize(Array.isArray(row.tags)?row.tags.join(' '):'')};indexed.set(row,result)}return result}
export function rank(row,query){
 const q=normalize(query),terms=q.split(' ').filter(Boolean);if(!terms.length)return 1;
 const {name,provider,category,summary,tags}=fields(row),id=String(row.id||'');
 if(id===q)return 1000;
 let score=0;
 if(name===q)score+=150;
 else if(name.startsWith(q))score+=65;
 else if(name.includes(q))score+=30;
 for(const term of terms){
  if(name===term)score+=35;
  else if(name.startsWith(term))score+=22;
  else if(name.includes(term))score+=15;
  else if(provider.includes(term))score+=9;
  else if(category.includes(term))score+=8;
  else if(tags.includes(term))score+=6;
  else if(summary.includes(term))score+=2;
  else if(id.includes(term))score+=12;
  else return 0;
 }
 return score;
}
export function filterResults(rows,query,type='all'){return rows.filter(row=>type==='all'||row.type===type).map((row,index)=>({row,index,score:rank(row,query)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.index-b.index).map(x=>x.row)}
export function makeUrl(row){if(row.type==='api'&&/^\d{7,8}$/.test(row.id))return 'public-api.html?api='+encodeURIComponent(row.id);if(row.type==='file'&&/^\d{7,8}$/.test(row.id))return 'public-data.html?file='+encodeURIComponent(row.id);return 'index.html?tool='+encodeURIComponent(row.id||'')}

const ALIASES=[['인공지능','ai'],['머신러닝','machine learning'],['문서','pdf'],['교통','버스'],['데이터','data'],['지도','map']];
export function editDistance(a,b,max=2){a=normalize(a);b=normalize(b);if(Math.abs(a.length-b.length)>max)return max+1;let prev=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const row=[i];let low=row[0];for(let j=1;j<=b.length;j++){const v=Math.min(prev[j]+1,row[j-1]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));row.push(v);low=Math.min(low,v)}if(low>max)return max+1;prev=row}return prev[b.length]}
export function suggestQueries(rows,query,limit=6){
 const q=normalize(query);if(q.length<2||q.length>60)return [];
 const scored=new Map();
 function put(word,score){const v=normalize(word);if(!v||v===q||v.length<2||v.length>45)return;scored.set(v,Math.max(score,scored.get(v)||0))}
 for(const [ko,en] of ALIASES){if(q===ko)put(en,90);if(q===en)put(ko,90)}
 // Scan only a bounded vocabulary of names/categories, never descriptions.
 let seen=0;
 for(const row of rows){if(++seen>150000)break;const values=[row.name,row.category,row.provider].filter(x=>typeof x==='string');for(const value of values){const v=normalize(value);if(!v)continue;for(const word of [v,...v.split(/[\s/(),·_-]+/).filter(w=>w.length>=2)]){if(word===q)continue;if(word.startsWith(q))put(word,70-Math.min(25,word.length-q.length));else if(q.length>=3&&word.length<=24&&Math.abs(word.length-q.length)<=2){const dist=editDistance(q,word,2);if(dist<=1||(dist===2&&q.length>=6))put(word,40-dist*10)}}}}
 return [...scored].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'ko')).slice(0,limit).map(([value])=>value);
}

export const SORT_MODES=['relevance','name-asc','name-desc','provider','type'];
export function sortResults(rows,mode='relevance'){
 if(!SORT_MODES.includes(mode)||mode==='relevance')return rows;
 const collator=new Intl.Collator('ko',{numeric:true,sensitivity:'base'});
 const key=row=>mode==='provider'?(row.provider||row.category||''):mode==='type'?(row.type||''):(row.name||'');
 return rows.map((row,index)=>({row,index})).sort((a,b)=>{
  const cmp=collator.compare(String(key(a.row)),String(key(b.row)));
  return (mode==='name-desc'?-cmp:cmp)||a.index-b.index;
 }).map(x=>x.row);
}

export function filterFacets(rows,{provider='',category='',format=''}={}){
 const n=normalize;
 return rows.filter(row=>(!provider||n(row.provider||row.category)===n(provider))&&(!category||n(row.category)===n(category))&&(!format||n(String(row.format||'').split(/[,/|+;\s]+/).join(' ')).split(' ').includes(n(format))));
}
export function facetOptions(rows,field,limit=180){
 const counts=new Map();
 for(const row of rows){
  const raw=field==='provider'?(row.provider||row.category):row[field];
  if(typeof raw!=='string')continue;
  const vals=field==='format'?raw.split(/[,/|+;\s]+/):[raw];
  for(const value of vals){const v=value.trim();if(!v||v.length>90)continue;counts.set(v,(counts.get(v)||0)+1)}
 }
 return [...counts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'ko')).slice(0,limit).map(([value,count])=>({value,count}));
}
