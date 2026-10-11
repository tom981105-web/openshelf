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
export async function savePrivateKey(apiKey,password){
 if(typeof apiKey!=='string'||!/^AIza[\w-]{20,}$/.test(apiKey.trim()))throw Error('Gemini API 키 형식을 확인하세요.');
 if(typeof password!=='string'||password.length<12)throw Error('잠금 비밀번호는 12자 이상이어야 합니다.');
 const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
 const key=await derive(password,salt),cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,enc.encode(apiKey.trim()));
 localStorage.setItem(SLOT,JSON.stringify({version:1,salt:b64(salt),iv:b64(iv),cipher:b64(new Uint8Array(cipher))}));
}
export async function unlockPrivateKey(password){
 const raw=localStorage.getItem(SLOT);if(!raw)throw Error('저장된 API 키가 없습니다.');
 try{const payload=JSON.parse(raw);if(payload.version!==1)throw Error('Unsupported version');
 const key=await derive(password,un64(payload.salt));const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:un64(payload.iv)},key,un64(payload.cipher));
 const apiKey=dec.decode(plain);if(!/^AIza[\w-]{20,}$/.test(apiKey))throw Error('Invalid key');return apiKey
 }catch{throw Error('비밀번호가 틀렸거나 저장된 키가 손상되었습니다.')}
}
