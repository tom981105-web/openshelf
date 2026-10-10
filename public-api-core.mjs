export function validatedPublicApis(rows){
 if(!Array.isArray(rows))return [];
 const seen=new Set(),result=[];
 for(const x of rows){
  if(!x||!/^\d{8}$/.test(String(x.id)))continue;
  const expected='https://www.data.go.kr/data/'+x.id+'/openapi.do';
  if(x.url!==expected||seen.has(x.id))continue;
  if(![x.name,x.provider,x.category,x.summary,x.approval,x.format].every(v=>typeof v==='string'&&v.length>0))continue;
  seen.add(x.id);result.push(x);
 }
 return result;
}
export function filterPublicApis(items,opts={}) {
 const q=String(opts.query||'').trim().toLocaleLowerCase('ko').normalize('NFKC');
 const terms=q.split(/\s+/).filter(Boolean),cat=opts.category||'',approval=opts.approval||'',format=opts.format||'',provider=opts.provider||'';
 return items.filter(x=>{
  if(cat&&x.category!==cat)return false;
  if(provider&&x.provider!==provider)return false;
  if(approval&&!x.approval.includes(approval))return false;
  if(format&&!x.format.toLocaleLowerCase('ko').includes(format.toLocaleLowerCase('ko')))return false;
  const hay=[x.id,x.name,x.provider,x.category,x.summary,x.approval,x.format].join(' ').toLocaleLowerCase('ko').normalize('NFKC');
  return terms.every(term=>hay.includes(term));
 });
}
