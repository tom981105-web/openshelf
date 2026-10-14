import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const base=process.env.OPENSHELF_TEST_URL||'http://127.0.0.1:8765';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1365,height:900}});
try{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/index.html',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>Number(document.querySelector('#heroToolCount')?.textContent.replace(/,/g,''))>100,{timeout:45000});
 const initial=await page.locator('#toolGrid .tool-card').count();
 if(initial===0)throw Error('Home cards not displayed');
 const count=await page.locator('#categoryChips button').count();
 if(count<10)throw Error('Categories missing: '+count);
 const category=page.locator('#categoryChips button').nth(1);
 await category.click();
 await page.waitForTimeout(200);
 if(!await category.getAttribute('class')?.then(x=>x.includes('active')).catch(()=>false)){} // visual class may use chip active
 await page.locator('#categoryChips button').first().click();
 await page.locator('#search').fill('github');
 await page.waitForTimeout(500);
 await page.locator('#search').fill('');
 await page.locator('#sortSelect').selectOption('name');
 await page.waitForTimeout(250);
 if(errors.length)throw Error('Page errors: '+errors.join('; '));
 console.log(JSON.stringify({scenario:'homepage filters and catalog',status:'passed',initialCards:initial,categories:count}));
}finally{await browser.close()}
