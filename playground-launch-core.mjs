// Conservative capability routing. An external homepage is never proof of a runnable web app.
export function trustedExternalLink(raw){
 try {const u=new URL(raw);if(u.protocol!=='https:'||u.username||u.password)return null;
 const h=u.hostname.toLowerCase();if(!h.includes('.')||h==='github.com'||h==='localhost'||h.endsWith('.local')||h.endsWith('.internal')||h.endsWith('.test')||h.endsWith('.invalid'))return null;
 return u.href;
 }catch{return null}
}
export function launchInfo(tool,relatedDemo=false){
 const website=trustedExternalLink(tool?.website);
 if(relatedDemo)return {kind:'related',label:'관련 체험 제공',url:website};
 if(website)return {kind:'external',label:'외부 사이트 방문 (실행 미확인)',url:website};
 return {kind:'install',label:'설치 후 실행 필요',url:null};
}

export function runtimeReadiness(tool,approvedUrl=null){
 if(typeof approvedUrl==='string'&&approvedUrl.startsWith('playground-'))return {state:'ready',kind:'reviewed-experience',label:'검토된 체험 연결',url:approvedUrl};
 const link=trustedExternalLink(tool?.website);
 if(link)return {state:'needs-verification',kind:'external-site',label:'외부 웹사이트 (실행 미검증)',url:link};
 const instructions=Array.isArray(tool?.install)&&tool.install.some(x=>typeof x?.command==='string');
 return {state:'requires-runtime',kind:instructions?'local-install':'unknown',label:instructions?'설치·실행 환경 필요':'실행 환경 확인 필요',url:null};
}
