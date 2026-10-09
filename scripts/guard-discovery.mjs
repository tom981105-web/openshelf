#!/usr/bin/env node
// Fail closed if hourly discovery overwrites, removes or massively changes the catalog.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { validateTools } from './validate-tools.mjs';

export function validateDiscoveryChange(before, after, { maxAdded=30 }={}) {
  const errors=[];
  for (const [label, data] of [['previous',before],['generated',after]]) {
    const invalid=validateTools(data);
    if(invalid.length)errors.push(...invalid.slice(0,20).map(e=>label+': '+e));
  }
  if(!Array.isArray(before)||!Array.isArray(after)||errors.length)return errors;
  const oldById=new Map(before.map(t=>[t.id,t]));
  const newById=new Map(after.map(t=>[t.id,t]));
  const removed=before.filter(t=>!newById.has(t.id));
  if(removed.length)errors.push('Existing tools removed: '+removed.slice(0,10).map(t=>t.id).join(', ')+' ('+removed.length+' total)');
  const changed=before.filter(t=>newById.has(t.id)&&JSON.stringify(sortKeys(t))!==JSON.stringify(sortKeys(newById.get(t.id))));
  if(changed.length)errors.push('Existing tools modified: '+changed.slice(0,10).map(t=>t.id).join(', ')+' ('+changed.length+' total)');
  const added=after.filter(t=>!oldById.has(t.id));
  if(added.length>maxAdded)errors.push('Unexpected additions: '+added.length+' exceeds limit '+maxAdded);
  if(before.length>0&&after.length<before.length)errors.push('Catalog shrank from '+before.length+' to '+after.length);
  return errors;
}
function sortKeys(value){
  if(Array.isArray(value))return value.map(sortKeys);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,sortKeys(v)]));
  return value;
}
if(process.argv[1]&&process.argv[1].endsWith('/guard-discovery.mjs')){
  try{
    const before=JSON.parse(execFileSync('git',['show','HEAD:data/tools.json'],{encoding:'utf8',maxBuffer:64*1024*1024}));
    const after=JSON.parse(fs.readFileSync('data/tools.json','utf8'));
    const errors=validateDiscoveryChange(before,after);
    if(errors.length){console.error('Discovery safety check BLOCKED commit:');errors.forEach(e=>console.error(' - '+e));process.exitCode=1}
    else console.log('Discovery safety check passed: '+before.length+' -> '+after.length+' tools, existing records preserved');
  }catch(e){console.error('Discovery safety check could not complete: '+e.message);process.exitCode=1}
}
