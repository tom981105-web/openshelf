export function validatedPublicApis(rows){
 if(!Array.isArray(rows))return [];
 const seen=new Set(),result=[];
 for(const x of rows){
  if(!x||!/^\\d{8}$/.test(String(x.id)))continue;
  const expected='https://www.data.go.kr/data/'+x.id+'/openapi.do';
  if(x.url!==expected||seen.has(x.id))continue;
  if(![x.name,x.provider,x.category,x.summary,x.approval,x.format].every(v=>typeof v==='string'&&v.length>0))continue;
  seen.add(x.id);result.push(x);
 }
 return result;
}
export function filterPublicApis(items,opts={}){
 const q=(opts.query||'').trim().toLocaleLowerCase('ko'),cat=opts.category||'',approval=opts.approval||'';
 return items.filter(x=>(!cat||x.category===cat)&&(!approval||x.approval.includes(approval))&&(!q||[x.name,x.provider,x.category,x.summary].join(' ').toLocaleLowerCase('ko').includes(q)));
}
