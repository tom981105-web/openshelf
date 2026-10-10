import {test,expect} from '@playwright/test';
test.setTimeout(130000);
test('CSV parsing works in a real browser',async({page})=>{
 await page.goto('/playground-csv.html');
 await expect(page.locator('#csvRun')).toBeEnabled({timeout:30000});
 await page.locator('#csvRun').click();
 await expect(page.locator('#csvStatus')).toContainText('3행 분석 완료');
 await expect(page.locator('#csvOutput')).toContainText('OpenShelf');
});
test('SQLite WASM executes SQL',async({page})=>{
 await page.goto('/playground-sql.html');
 await page.locator('#sqlRun').click();
 await expect(page.locator('#sqlStatus')).toContainText('실행 성공',{timeout:45000});
 await expect(page.locator('#sqlOutput')).toContainText('SQLite');
});
test('Python WASM runs CSV analysis and renders chart',async({page})=>{
 await page.goto('/playground-python.html');
 await expect(page.locator('#pythonChart')).toHaveCount(1);
 await page.locator('#pythonExampleCsv').click();
 await page.locator('#pythonRun').click();
 await expect(page.locator('#pythonStatus')).toContainText('실행 완료',{timeout:115000});
 await expect(page.locator('#pythonOutput')).toContainText('총 데이터 행:');
 await expect(page.locator('#pythonChart svg')).toBeVisible();
 await expect(page.locator('#pythonChartSave')).toBeVisible();
});
test('Image Lab converts a local PNG',async({page})=>{
 await page.goto('/playground-image.html');
 const encoded=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=8;c.height=8;c.getContext('2d').fillRect(0,0,8,8);return c.toDataURL('image/png').split(',')[1]});
 const png=Buffer.from(encoded,'base64');
 await page.locator('#imageInput').setInputFiles({name:'test.png',mimeType:'image/png',buffer:png});
 await page.locator('#imageFormat').selectOption('image/png');
 await page.locator('#imageRun').click();
 await expect(page.locator('#imageStatus')).toContainText('변환 완료');
 await expect(page.locator('#imageSave')).toBeVisible();
});
