import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const base=process.env.OPENSHELF_TEST_URL||'http://127.0.0.1:8765';
const reports=[];const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
async function scenario(name,run){
 const page=await browser.newPage({viewport:{width:1365,height:900}});
 const errors=[];page.on('pageerror',error=>errors.push(String(error.message)));
 page.on('console',msg=>{if(msg.type()==='error')errors.push('console: '+msg.text())});
 const started=performance.now();
 try{
  const details=await run(page);
  if(errors.length)throw Error('Browser errors: '+errors.join('; '));
  const item={name,status:'passed',elapsedMs:Math.round(performance.now()-started),...details};reports.push(item);console.log(JSON.stringify(item));
 }catch(error){const item={name,status:'failed',elapsedMs:Math.round(performance.now()-started),error:String(error.message||error)+(errors.length?' | '+errors.join('; '):'')};reports.push(item);console.error(JSON.stringify(item))}
 finally{await page.close()}
}
try{
 await scenario('initial-open-source',async page=>{
  const fetched=[];
  page.on('request',req=>{if(req.url().includes('/data/public-'))fetched.push(req.url())});
  await page.goto(base+'/unified-search.html',{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('검색 준비')||document.querySelector('#status')?.textContent.includes('오픈소스를 먼저')||document.querySelector('#status')?.textContent.includes('실패'),null,{timeout:60000});
  if(fetched.length)throw Error('Initial search must not load public catalog shards');
  if((await page.locator('#results article').count())===0)throw Error('Tool search is empty');
  return {cards:await page.locator('#results article').count(),publicRequests:fetched.length};
 });
 await scenario('public-api-search',async page=>{
  await page.goto(base+'/unified-search.html',{waitUntil:'domcontentloaded'});
  await page.locator('#type').selectOption('api');
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('검색 준비 완료')||document.querySelector('#status')?.textContent.includes('실패'),null,{timeout:180000});
  if((await page.locator('#status').innerText()).includes('실패'))throw Error('API catalog loading failed');
  const total=Number((await page.locator('#total').innerText()).replace(/,/g,''));
  if(total<10000)throw Error('API catalog count unexpectedly small '+total);
  await page.locator('#query').fill('교통');
  await page.waitForTimeout(500);
  if((await page.locator('#results article').count())===0)throw Error('API query found no results');
  return {catalogCount:total,matched:await page.locator('#total').innerText()};
 });
 await scenario('public-data-search',async page=>{
  await page.goto(base+'/unified-search.html',{waitUntil:'domcontentloaded'});
  await page.locator('#type').selectOption('file');
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('검색 준비 완료')||document.querySelector('#status')?.textContent.includes('실패'),null,{timeout:240000});
  if((await page.locator('#status').innerText()).includes('실패'))throw Error('File catalog loading failed');
  const total=Number((await page.locator('#total').innerText()).replace(/,/g,''));
  if(total<80000)throw Error('File catalog count unexpectedly small '+total);
  await page.locator('#query').fill('교통');
  await page.waitForTimeout(700);
  if((await page.locator('#results article').count())===0)throw Error('File query found no results');
  return {catalogCount:total,matched:await page.locator('#total').innerText()};
 });
}finally{
 await browser.close();
 const output={generatedAt:new Date().toISOString(),environment:'Chromium, local checked-out GitHub data',scenarios:reports};
 await fs.writeFile('browser-performance-report.json',JSON.stringify(output,null,2)+'\n');
}
if(reports.some(item=>item.status!=='passed'))process.exitCode=1;
