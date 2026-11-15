/** One verified, browser-local animated character; never uploads a licensed model. */
export const EXTERNAL_CHARACTER_ID='darth-vader-glb';
export const EXTERNAL_CHARACTER_LABEL='Darth Vader · importerad GLB';
export const EXTERNAL_CHARACTER_SHA256='5a9e50842e57dc538def24fbb0b2f210f6b78e0abb8f89cbe5de1f0b757cee51';
export const EXTERNAL_CHARACTER_MAX_BYTES=8*1024*1024;
export const EXTERNAL_CHARACTER_CLIPS=Object.freeze([
 'Crouch_Fwd_Loop','Crouch_Idle_Loop','Death01','Hit_Chest','Idle_Loop',
 'Jog_Fwd_Loop','Jump_Land','Jump_Loop','Pistol_Idle_Loop','Pistol_Reload',
 'Pistol_Shoot','Sprint_Loop','Walk_Loop'
]);
const REQUIRED_BONES=['root','pelvis','spine_03','Head','upperarm_l','lowerarm_l','hand_l','upperarm_r','lowerarm_r','hand_r','foot_l','foot_r'];
const DB_NAME='cartridge-external-characters';
const DB_STORE='characters';

export function inspectExternalCharacterGLB(bytes){
 if(!(bytes instanceof ArrayBuffer)||bytes.byteLength<32||bytes.byteLength>EXTERNAL_CHARACTER_MAX_BYTES)throw Error('Använd en GLB-fil på högst 8 MiB.');
 const v=new DataView(bytes);
 if(v.getUint32(0,true)!==0x46546c67||v.getUint32(4,true)!==2||v.getUint32(8,true)!==bytes.byteLength||v.getUint32(16,true)!==0x4e4f534a)throw Error('GLB-huvudet är ogiltigt.');
 const jsonSize=v.getUint32(12,true),binAt=20+jsonSize;
 if(!jsonSize||jsonSize>512*1024||jsonSize%4||binAt+8>bytes.byteLength||v.getUint32(binAt+4,true)!==0x004e4942)throw Error('GLB innehåller inte väntade datablock.');
 const binSize=v.getUint32(binAt,true);
 if(binSize%4||binAt+8+binSize!==bytes.byteLength)throw Error('GLB-data är avbruten eller har extra block.');
 let doc;try{doc=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(new Uint8Array(bytes,20,jsonSize)));}catch{throw Error('GLB-metadata kunde inte läsas.');}
 if(doc.asset?.version!=='2.0'||doc.extensionsRequired?.length||doc.buffers?.length!==1||doc.buffers[0].byteLength>binSize||doc.buffers[0].uri!==undefined||doc.skins?.length!==1||doc.meshes?.length!==1||doc.materials?.length>24||(doc.nodes?.length||0)>128||(doc.accessors?.length||0)>1024)throw Error('GLB-formatet passar inte den verifierade Vader-riggen.');
 if((doc.images||[]).some(x=>x.uri!==undefined)||(doc.accessors||[]).some(a=>a.sparse||!Number.isInteger(a.count)||a.count<0||a.count>100000))throw Error('Modellen har externa eller ogiltiga data.');
 const skin=doc.skins[0],names=new Set(skin.joints.map(i=>doc.nodes?.[i]?.name));
 if(skin.joints.length!==23||REQUIRED_BONES.some(name=>!names.has(name)))throw Error('Fel skelett. Förväntade 23 animerade ben.');
 const clipNames=new Set((doc.animations||[]).map(a=>a.name));
 if(clipNames.size!==13||EXTERNAL_CHARACTER_CLIPS.some(name=>!clipNames.has(name)))throw Error('Modellen behöver samtliga 13 FPS-animationer.');
 for(const a of doc.animations)if(!a.channels?.length||a.channels.some(c=>!['rotation','translation'].includes(c.target?.path)||!Number.isInteger(c.target.node)||!doc.nodes[c.target.node]))throw Error('En animation har felaktiga spår.');
 let triangles=0;
 for(const p of doc.meshes[0].primitives||[]){
  const attrs=p.attributes||{},positions=doc.accessors[attrs.POSITION],weights=doc.accessors[attrs.WEIGHTS_0],joints=doc.accessors[attrs.JOINTS_0];
  if(p.mode!==4||!positions||!weights||!joints||weights.count!==positions.count||joints.count!==positions.count)throw Error('Modellen saknar kompatibel skinning.');
  const index=doc.accessors[p.indices];
  if(!index||index.count%3)throw Error('Modellen har ogiltiga trianglar.');
  triangles+=index.count/3;
 }
 if(!triangles||triangles>30000)throw Error('Modellen är för tung eller saknar trianglar.');
 return {bones:names.size,clips:[...clipNames],triangles};
}
async function fileHash(bytes){
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function database(){return new Promise((resolve,reject)=>{
 let request;try{request=indexedDB.open(DB_NAME,1);}catch{reject(Error('Lokal lagring är blockerad.'));return;}
 request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(DB_STORE))request.result.createObjectStore(DB_STORE,{keyPath:'id'});};
 request.onsuccess=()=>resolve(request.result);
 request.onerror=()=>reject(Error('Kunde inte öppna lokal karaktärslagring.'));
 request.onblocked=()=>reject(Error('Stäng andra spelflikar och försök igen.'));
});}
async function storage(mode,operation){
 const db=await database();
 try{return await new Promise((resolve,reject)=>{
  let value,done=false;const tx=db.transaction(DB_STORE,mode),request=operation(tx.objectStore(DB_STORE));
  request.onsuccess=()=>{value=request.result;};
  tx.oncomplete=()=>{done=true;resolve(value);};
  tx.onerror=tx.onabort=()=>{if(!done)reject(Error('Kunde inte spara eller läsa den lokala karaktären.'));};
 });}finally{db.close();}
}
export async function externalCharacterStored(){return !!(await storage('readonly',s=>s.get(EXTERNAL_CHARACTER_ID)));}
export async function importExternalCharacterFile(file){
 if(!file||!file.name.toLowerCase().endsWith('.glb')||file.size>EXTERNAL_CHARACTER_MAX_BYTES)throw Error('Välj Darth_Vader_FPS_Animated.glb.');
 const bytes=await file.arrayBuffer();inspectExternalCharacterGLB(bytes);
 const sha256=await fileHash(bytes);
 if(sha256!==EXTERNAL_CHARACTER_SHA256)throw Error('Det är inte den verifierade Darth_Vader_FPS_Animated.glb. Använd originalfilen från ChatGPT.');
 await storage('readwrite',s=>s.put({id:EXTERNAL_CHARACTER_ID,bytes,sha256,updated:Date.now()}));
 return EXTERNAL_CHARACTER_ID;
}
export async function loadExternalCharacter(){
 const row=await storage('readonly',s=>s.get(EXTERNAL_CHARACTER_ID));
 if(!row?.bytes)throw Error('Darth Vader har inte importerats i den här webbläsaren. Välj Importera Vader-GLB.');
 inspectExternalCharacterGLB(row.bytes);
 if(row.sha256!==EXTERNAL_CHARACTER_SHA256||await fileHash(row.bytes)!==EXTERNAL_CHARACTER_SHA256)throw Error('Vader-modellen har ändrats eller skadats. Importera originalfilen igen.');
 return row.bytes;
}
export async function deleteExternalCharacter(){await storage('readwrite',s=>s.delete(EXTERNAL_CHARACTER_ID));}
