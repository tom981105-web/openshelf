import fs from 'node:fs/promises';
const source=process.argv[2]||'data/tools.json';
const target=process.argv[3]||'data/playground-candidates.json';
const tools=JSON.parse(await fs.readFile(source,'utf8'));
if(!Array.isArray(tools))throw Error('Expected tools array');
const candidates=[];
for(const t of tools){
  if(!t||typeof t.id!=='string'||typeof t.name!=='string'||t.githubArchived||t.githubDisabled)continue;
  let gh,site;
  try{
    gh=new URL(t.github);
    const segments=gh.pathname.split('/').filter(Boolean);
    if(gh.protocol!=='https:'||gh.hostname!=='github.com'||segments.length!==2)continue;
  }catch{continue}
  for(const raw of [t.website,t.githubHomepage]){
    try{
      site=new URL(raw);
      const host=site.hostname.toLowerCase();
      if(site.protocol!=='https:'||site.username||site.password||site.port||!host.includes('.')||host==='github.com'||host==='localhost'||host.endsWith('.local')||host.endsWith('.internal')||host.endsWith('.test')||host.endsWith('.example')||host.endsWith('.invalid')||host.startsWith('127.')||host.startsWith('10.')||site.href.length>450){site=null;continue}
      break;
    }catch{site=null}
  }
  if(!site)continue;
  const descriptor=[t.name,t.description,t.longDescription,...(Array.isArray(t.tags)?t.tags:[])].join(' ').toLowerCase();
  const demoSignal=/demo|playground|try-it|tryit|preview/.test(site.hostname+site.pathname);
  const browserSignal=/browser|web app|web-based|editor|whiteboard|dashboard|브라우저|웹 앱|에디터/.test(descriptor);
  candidates.push({id:t.id,name:t.name,github:t.github,url:site.origin+site.pathname,score:Number(demoSignal)*5+Number(browserSignal)*2,signals:[...(demoSignal?['demo-style URL']:[]),...(browserSignal?['browser-related description']:[])],status:'unverified'});
}
candidates.sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
await fs.writeFile(target,JSON.stringify({version:1,method:'metadata-only',reviewRequired:true,scanned:tools.length,candidates:candidates.slice(0,80)},null,2)+'\n');
console.log('Playground candidates:',Math.min(candidates.length,80),'unverified');
