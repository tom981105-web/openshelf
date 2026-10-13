// V40: encrypted per-browser vault. Password and decrypted API key exist in memory only.
const SLOT='openshelf.gemini.v40';
const enc=new TextEncoder(),dec=new TextDecoder();
const b64=bytes=>btoa(String.fromCharCode(...bytes));
const un64=value=>Uint8Array.from(atob(value),x=>x.charCodeAt(0));
export const hasSavedKey=()=>!!localStorage.getItem(SLOT);
export const removeSavedKey=()=>localStorage.removeItem(SLOT);
async function derive(password,salt){
 const base=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:310000,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export function validKeyFormat(value){return typeof value==='string'&&value.length>=16&&value.length<=256&&Array.from(value).every(ch=>{const n=ch.charCodeAt(0);return (n>=48&&n<=57)||(n>=65&&n<=90)||(n>=97&&n<=122)||ch==='_'||ch==='-'||ch==='.'})}
export async function savePrivateKey(apiKey,password){
 if(typeof apiKey!=='string'||!validKeyFormat(apiKey.trim()))throw Error('Gemini API 키 형식을 확인하세요.');
 if(typeof password!=='string'||password.length<4)throw Error('잠금 비밀번호는 4자 이상이어야 합니다.');
 const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
 const key=await derive(password,salt),cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,enc.encode(apiKey.trim()));
 localStorage.setItem(SLOT,JSON.stringify({version:1,salt:b64(salt),iv:b64(iv),cipher:b64(new Uint8Array(cipher))}));
}
export async function unlockPrivateKey(password){
 const raw=localStorage.getItem(SLOT);if(!raw)throw Error('저장된 API 키가 없습니다.');
 try{const payload=JSON.parse(raw);if(payload.version!==1)throw Error('Unsupported version');
 const key=await derive(password,un64(payload.salt));const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:un64(payload.iv)},key,un64(payload.cipher));
 const apiKey=dec.decode(plain);if(!validKeyFormat(apiKey))throw Error('Invalid key');return apiKey
 }catch{throw Error('비밀번호가 틀렸거나 저장된 키가 손상되었습니다.')}
}

const AUTO_SLOT='openshelf.gemini.personal-auto.v44';
const DB_NAME='openshelf-private-device-v44';
function deviceDb(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>r.result.createObjectStore('keys');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('브라우저의 개인 키 저장소에 접근할 수 없습니다.'))})}
async function deviceKey(create=false){
 const db=await deviceDb();
 try{
  const existing=await new Promise((resolve,reject)=>{const tx=db.transaction('keys','readonly');const r=tx.objectStore('keys').get('gemini');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
  if(existing||!create)return existing;
  const key=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  await new Promise((resolve,reject)=>{const tx=db.transaction('keys','readwrite');tx.objectStore('keys').put(key,'gemini');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});
  return key;
 }finally{db.close()}
}
export async function saveAutoKey(value){
 if(!validKeyFormat(value))throw Error('Gemini API 키 형식을 확인하세요.');
 const key=await deviceKey(true),iv=crypto.getRandomValues(new Uint8Array(12));
 const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,enc.encode(value));
 localStorage.setItem(AUTO_SLOT,JSON.stringify({v:1,iv:b64(iv),cipher:b64(new Uint8Array(cipher))}));
}
export async function loadAutoKey(){
 const raw=localStorage.getItem(AUTO_SLOT);if(!raw)return null;
 try{
  const data=JSON.parse(raw),key=await deviceKey();
  if(data.v!==1||!key)return null;
  const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:un64(data.iv)},key,un64(data.cipher));
  const value=dec.decode(plain);return validKeyFormat(value)?value:null;
 }catch{return null}
}
export async function removeAutoKey(){
 localStorage.removeItem(AUTO_SLOT);
 const db=await deviceDb();
 try{await new Promise((resolve,reject)=>{const tx=db.transaction('keys','readwrite');tx.objectStore('keys').delete('gemini');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}finally{db.close()}
}
