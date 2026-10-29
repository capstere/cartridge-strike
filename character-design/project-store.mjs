/** Transactional local project library. No file bytes in localStorage. */
const DB='cartridge-strike-studio-4';
let pending;
function open(){return pending??=new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore('projects',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>{pending=null;reject(r.error);};});}
async function request(mode,action){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('projects',mode);const r=action(tx.objectStore('projects'));let result;r.onsuccess=()=>result=r.result;tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Sparningen avbröts'));});}
export const saveProject=(id,project)=>request('readwrite',s=>s.put({id,name:project.name,updated:new Date().toISOString(),project}));
export const loadProject=id=>request('readonly',s=>s.get(id));
export const listProjects=()=>request('readonly',s=>s.getAll());
export function bytesToData(bytes){let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(binary);}
export function dataToBytes(data){const binary=atob(data);return Uint8Array.from(binary,c=>c.charCodeAt(0));}
