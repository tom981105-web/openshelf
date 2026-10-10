import fs from 'node:fs/promises';
import https from 'node:https';
import dns from 'node:dns/promises';
import net from 'node:net';

export function publicAddress(ip){
  if(net.isIP(ip)===4){
    const p=ip.split('.').map(Number),a=p[0],b=p[1];
    return !(a===0||a===10||a===127||a>=224||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&(b===168||b===0)||a===100&&b>=64&&b<=127||a===198&&(b===18||b===19)||a===192&&b===0&&p[2]===0);
  }
  if(net.isIP(ip)===6){
    const n=ip.toLowerCase();
    return !(n==='::'||n==='::1'||n.startsWith('fc')||n.startsWith('fd')||n.startsWith('fe8')||n.startsWith('fe9')||n.startsWith('fea')||n.startsWith('feb')||n.startsWith('ff')||n.startsWith('::ffff:'));
  }
  return false;
}
export function acceptableUrl(raw){
  try{const u=new URL(raw);
    if(u.protocol!=='https:'||u.username||u.password||u.port||u.href.length>450||net.isIP(u.hostname))return null;
    const h=u.hostname.toLowerCase();
    if(!h.includes('.')||h==='localhost'||['.local','.internal','.test','.example','.invalid'].some(s=>h.endsWith(s)))return null;
    return u;
  }catch{return null}
}
export async function checkCandidate(raw,{resolve=dns.lookup,timeout=3500}={}){
  const url=acceptableUrl(raw);
  if(!url)return {status:'unsafe-url',httpStatus:null};
  try{
    const entries=await resolve(url.hostname,{all:true,verbatim:true});
    if(!entries.length||entries.some(a=>!publicAddress(a.address)))return {status:'unsafe-dns',httpStatus:null};
    const address=entries[0].address;
    return await new Promise(done=>{
      let settled=false;
      const finish=result=>{if(settled)return;settled=true;done(result)};
      const request=https.request(url,{method:'HEAD',timeout,agent:false,lookup:(host,opts,cb)=>cb(null,address,net.isIP(address)),headers:{'User-Agent':'OpenShelf-candidate-check/1.0',Accept:'text/html,*/*'}},response=>{
        response.resume();
        const code=response.statusCode||0;
        finish({status:code>=200&&code<400?'reachable':code>=400?'http-error':'unknown-response',httpStatus:code||null});
      });
      request.on('timeout',()=>request.destroy(new Error('timeout')));
      request.on('error',error=>finish({status:error.message==='timeout'?'timeout':'network-error',httpStatus:null}));
      request.end();
    });
  }catch{return {status:'dns-error',httpStatus:null}}
}
export async function probeQueue(source='data/playground-candidates.json',target='data/playground-probes.json',limit=20,checker=checkCandidate){
  const queue=JSON.parse(await fs.readFile(source,'utf8'));
  if(!queue.reviewRequired||!Array.isArray(queue.candidates))throw Error('Invalid review queue');
  const candidates=queue.candidates.filter(x=>x&&x.status==='unverified').slice(0,Math.max(0,Math.min(20,limit)));
  const checks=[];
  for(const entry of candidates){
    const result=await checker(entry.url);
    checks.push({id:entry.id,url:entry.url,status:result.status,httpStatus:result.httpStatus,reviewStatus:'unverified'});
  }
  const report={version:1,checkedAt:new Date().toISOString(),method:'https-head-no-redirect',reviewRequired:true,checks};
  await fs.writeFile(target,JSON.stringify(report,null,2)+'\n');
  return report;
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
  const report=await probeQueue();
  console.log('Probe results:',report.checks.length,'all still unverified');
}
