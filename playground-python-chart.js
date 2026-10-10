// Draw only validated numeric series on a local canvas; no HTML injection or remote chart service.
function renderPythonChart(raw){
 const section=document.getElementById('pythonChartSection');
 let data;
 try{data=JSON.parse(raw)}catch{section.hidden=true;return false}
 if(!data||!Array.isArray(data.labels)||!Array.isArray(data.values)||data.labels.length<1||data.labels.length>24||data.values.length!==data.labels.length){section.hidden=true;return false}
 const labels=data.labels.map(v=>String(v).slice(0,30));
 const values=data.values.map(Number);
 if(values.some(v=>!Number.isFinite(v)||v<0)||values.every(v=>v===0)){section.hidden=true;return false}
 const canvas=document.getElementById('pythonChart'),ctx=canvas.getContext('2d');if(!ctx)return false;
 ctx.clearRect(0,0,800,420);ctx.fillStyle='#fff';ctx.fillRect(0,0,800,420);
 const left=75,top=36,width=685,height=300,max=Math.max(...values),step=width/values.length,bar=Math.max(5,step*.62);
 ctx.strokeStyle='#9aa2af';ctx.beginPath();ctx.moveTo(left,top);ctx.lineTo(left,top+height);ctx.lineTo(left+width,top+height);ctx.stroke();
 ctx.font='12px sans-serif';ctx.fillStyle='#333';ctx.textAlign='right';
 for(let i=0;i<=4;i++){const n=max*i/4,y=top+height-(height*i/4);ctx.fillText(n.toLocaleString(undefined,{maximumFractionDigits:2}),left-10,y+4);ctx.strokeStyle='#e7e7e7';ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(left+width,y);ctx.stroke()}
 values.forEach((v,i)=>{const x=left+step*i+(step-bar)/2,h=height*v/max;ctx.fillStyle='#4059a9';ctx.fillRect(x,top+height-h,bar,h);ctx.fillStyle='#333';ctx.textAlign='center';ctx.font='11px sans-serif';ctx.fillText(labels[i].slice(0,Math.max(4,Math.floor(step/7))),x+bar/2,top+height+20,Math.max(22,step-4))});
 section.hidden=false;return true;
}
document.getElementById('pythonChartSave').addEventListener('click',()=>{const canvas=document.getElementById('pythonChart');canvas.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='openshelf-python-chart.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)},'image/png')});
