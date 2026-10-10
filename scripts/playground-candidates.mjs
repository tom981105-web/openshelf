import fs from 'node:fs/promises';
const tools=JSON.parse(await fs.readFile('data/tools.json','utf8'));
const candidates=tools.filter(t=>typeof t.website==='string'&&t.website.startsWith('https://')&&t.github&&t.website!==t.github).slice(0,80).map(t=>({id:t.id,name:t.name,website:t.website,reviewStatus:'unverified'}));
await fs.writeFile('data/playground-candidates.json',JSON.stringify({reviewRequired:true,candidates},null,2)+'\n');
console.log('Unverified demo candidates:',candidates.length);
