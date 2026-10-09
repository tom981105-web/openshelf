import assert from 'node:assert/strict';
import { validateTools } from './validate-tools.mjs';

const good = {id:'example',name:'Example',description:'Useful app',category:'개발 도구',tags:[],platforms:['Web'],free:true,openSource:true,github:'https://github.com/example/example'};
assert.deepEqual(validateTools([good]), []);
assert.ok(validateTools({}).length);
assert.ok(validateTools([{...good,tags:'wrong'}]).length);
assert.ok(validateTools([good,{...good}]).some(x=>x.includes('duplicate')));
assert.ok(validateTools([{...good,id:'',name:''}]).length);
console.log('Validator smoke tests passed');
