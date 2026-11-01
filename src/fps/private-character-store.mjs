/** Local, bounded rehearsal assets. Nothing is uploaded or installed into the game library. */
export const PRIVATE_CHARACTER_SCHEMA=1;
export const MAX_CHARACTER_BYTES=24*1024*1024;
export const validCharacterId=id=>typeof id==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id);
export async function characterHash(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');}
export function inspectPrivateGLB(bytes){
 if(!(bytes instanceof ArrayBuffer)||bytes.byteLength<28||bytes.byteLength>MAX_CHARACTER_BYTES)throw Error('Provkaraktären måste vara en GLB på högst 24 MiB.');
 const v=new DataView(bytes),length=v.getUint32(12,true);
 if(v.getUint32(0,true)!==0x46546c67||v.getUint32(4,true)!==2||v.getUint32(8,true)!==bytes.byteLength||v.getUint32(16,true)!==0x4e4f534a||length>2*1024*1024||20+length>bytes.byteLength)throw Error('Provkaraktärens GLB är skadad.');
 let doc;try{doc=JSON.parse(new TextDecoder().decode(bytes.slice(20,20+length)));}catch{throw Error('Provkaraktärens GLB innehåller skadad metadata.');}
 if(doc.asset?.version!=='2.0'||doc.extensionsRequired?.length||!doc.meshes?.length||doc.meshes.length>32||!doc.skins?.length||doc.skins.length>16||doc.animations?.length!==13||(doc.nodes?.length||0)>180||(doc.materials?.length||0)>24||(doc.images?.length||0)>32)throw Error('Provkaraktären ligger utanför den verifierade Male-piloten.');
 for(const kind of ['buffers','images'])for(const item of doc[kind]||[])if(item.uri!==undefined)throw Error('Provkaraktären måste ha alla bilder och data inbäddade i GLB.');
 if((doc.accessors||[]).some(a=>!Number.isInteger(a.count)||a.count<0||a.count>500000||a.sparse))throw Error('Provkaraktärens geometri eller animation är för stor eller inkompatibel.');
 return doc;
}
async function database(){return new Promise((resolve,reject)=>{const r=indexedDB.open('cartridge-private-characters',1);r.onupgradeneeded=()=>r.result.createObjectStore('drafts',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('Webbläsaren kunde inte öppna provkaraktären. Tillåt lokal lagring.'));});}
export async function savePrivateCharacter({bytes,name,sourceHash}){
 inspectPrivateGLB(bytes);
 if(!/^[a-f0-9]{64}$/.test(sourceHash))throw Error('Originalmodellens identitet saknas.');
 const row={id:crypto.randomUUID(),schema:PRIVATE_CHARACTER_SCHEMA,bytes,name:String(name).slice(0,80),sourceHash,sha256:await characterHash(bytes),created:Date.now()};
 const db=await database();
 try{await new Promise((resolve,reject)=>{const tx=db.transaction('drafts','readwrite'),s=tx.objectStore('drafts'),r=s.getAll();r.onsuccess=()=>{for(const old of r.result.sort((a,b)=>b.created-a.created).slice(2))s.delete(old.id);s.put(row);};tx.oncomplete=resolve;tx.onerror=()=>reject(Error('Kunde inte spara provkaraktären. Frigör lokal webbläsarlagring.'));tx.onabort=()=>reject(Error('Sparningen av provkaraktären avbröts.'));});}finally{db.close();}
 return row.id;
}
export async function loadPrivateCharacter(id){
 if(!validCharacterId(id))throw Error('Ogiltig privat karaktärslänk.');
 const db=await database();let row;
 try{row=await new Promise((resolve,reject)=>{const tx=db.transaction('drafts','readonly'),r=tx.objectStore('drafts').get(id);tx.oncomplete=()=>resolve(r.result);tx.onerror=()=>reject(Error('Provkaraktären kunde inte läsas.'));});}finally{db.close();}
 if(!row||row.schema!==PRIVATE_CHARACTER_SCHEMA)throw Error('Provkaraktären saknas på denna enhet. Öppna studion och klicka Prova i privat match igen.');
 inspectPrivateGLB(row.bytes);
 if(await characterHash(row.bytes)!==row.sha256)throw Error('Provkaraktärens kontrollsumma stämmer inte. Skapa en ny provmatch i studion.');
 return row;
}
