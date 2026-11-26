import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {discover} from './discover-public-apis.mjs';
import {validatedPublicApis} from '../public-api-core.mjs';

const repo='data/public-apis.json', candidates='data/public-api-candidates.json';
const starting=JSON.parse(await fs.readFile(repo,'utf8'));
const baseCount=starting.items.length;
if(baseCount<1419)throw Error('Refusing catalog shrink');
const target=baseCount+5000;
const baselineCandidates=new Set(JSON.parse(await fs.readFile(candidates,'utf8')).items.map(x=>String(x.id)));
let completed=0,stalled=0,previousPage=0;
const run=(command,args)=>execFileSync(command,args,{stdio:'inherit'});
async function publish(){
 const published=JSON.parse(await fs.readFile(repo,'utf8'));
 const candidateList=JSON.parse(await fs.readFile(candidates,'utf8')).items;
 const known=new Set(published.items.map(x=>String(x.id)));
 for(const item of candidateList){
  if(published.items.length>=target)break;
  if(known.has(String(item.id))||baselineCandidates.has(String(item.id)))continue;
  const entry={...item,url:'https://www.data.go.kr/data/'+item.id+'/openapi.do'};
  if(validatedPublicApis([entry]).length!==1)continue;
  published.items.push(entry); known.add(String(entry.id));
 }
 if(validatedPublicApis(published.items).length!==published.items.length)throw Error('Invalid or duplicate catalog entries');
 await fs.writeFile(repo,JSON.stringify(published,null,2)+'\n');
 run('node',['public-api.test.mjs']);
 run('node',['--check','public-api.js']);
 run('git',['add','data/public-apis.json','data/public-api-candidates.json','data/public-api-discovery-state.json']);
 const dirty=execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim();
 if(dirty){run('git',['-c','user.name=github-actions[bot]','-c','user.email=41898282+github-actions[bot]@users.noreply.github.com','commit','-m','data: V16 validated batch ('+published.items.length+' total)']);run('git',['push','origin','HEAD:refs/heads/data/public-api-v16-5000-20261010']);}
 console.log('V16_PROGRESS_JSON='+JSON.stringify({baseCount,target,current:published.items.length,added:published.items.length-baseCount}));
 return published.items.length;
}
let count=baseCount;
for(let round=0;round<40&&count<target;round++){
 let result;
 for(let attempt=0;attempt<4;attempt++){
  result=await discover({pages:20,maxDetails:200});
  if(result.scannedPages>0)break;
  console.warn('V16_RETRY',round,attempt,result);
  await new Promise(resolve=>setTimeout(resolve,30000*(attempt+1)));
 }
 if(!result||result.scannedPages===0){console.warn('V16 portal temporarily unavailable');break}
 completed++;
 if((completed%5)===0||round===39)count=await publish();
}
if(completed%5!==0&&completed>0)count=await publish();
if(completed===0)throw Error('No official pages verified');
console.log('V16_FINAL_JSON='+JSON.stringify({baseCount,target,count,added:count-baseCount,completedBatches:completed}));
