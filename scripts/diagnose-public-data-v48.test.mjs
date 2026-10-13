import assert from 'node:assert/strict';import {analyzePage,inspectPage} from './diagnose-public-data-v48.mjs';
const html='<html><a href="#" onclick="downloadFile(42)">다운로드</a><script src="/js/data.js"></script><form action="/data/download.do"></form></html>';
const info=analyzePage(html);assert.equal(info.hasDownloadText,true);assert.ok(info.possibleControls.length>=1);assert.equal(info.downloadUrlConfirmed,false);assert.ok(info.scriptPaths.includes('/js/data.js'));
const item={id:'15000249'};const fake=async()=>new Response(html,{headers:{'content-type':'text/html'}});
const result=await inspectPage(item,{fetcher:fake});assert.equal(result.status,'page_inspected');assert.equal(result.diagnostic.downloadUrlConfirmed,false);
const denied=await inspectPage(item,{fetcher:async()=>new Response('blocked',{status:403})});assert.equal(denied.status,'not_accessible');
console.log('V48 download controls diagnostic tests passed');
