const ns='http://www.w3.org/2000/svg';
export function normalizeChart(raw){
 if(!raw||!Array.isArray(raw.labels)||!Array.isArray(raw.values)||raw.labels.length!==raw.values.length||raw.labels.length<1||raw.labels.length>20)return null;
 const labels=raw.labels.map(x=>String(x).slice(0,28)),values=raw.values.map(Number);
 if(values.some(x=>!Number.isFinite(x)||x<0)||values.every(x=>x===0))return null;
 return {labels,values};
}
export function renderChart(target,raw){
 target.replaceChildren();
 const data=normalizeChart(raw);if(!data)return null;
 const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 720 360');svg.setAttribute('role','img');svg.setAttribute('aria-label','카테고리별 값 막대그래프');
 const max=Math.max(...data.values),width=Math.min(80,590/data.values.length),step=590/data.values.length;
 data.labels.forEach((label,i)=>{
  const height=Math.round(data.values[i]/max*250);
  const bar=document.createElementNS(ns,'rect');bar.setAttribute('x',String(100+i*step));bar.setAttribute('y',String(290-height));bar.setAttribute('width',String(width*.8));bar.setAttribute('height',String(height));bar.setAttribute('fill','#4776b7');svg.append(bar);
  const title=document.createElementNS(ns,'title');title.textContent=label+': '+data.values[i];bar.append(title);
  const caption=document.createElementNS(ns,'text');caption.setAttribute('x',String(100+i*step));caption.setAttribute('y','315');caption.setAttribute('font-size','12');caption.textContent=label.slice(0,11);svg.append(caption);
  const number=document.createElementNS(ns,'text');number.setAttribute('x',String(100+i*step));number.setAttribute('y',String(282-height));number.setAttribute('font-size','12');number.textContent=String(data.values[i]);svg.append(number);
 });
 target.append(svg);return svg;
}
