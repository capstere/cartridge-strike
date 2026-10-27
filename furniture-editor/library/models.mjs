/** Editor-only lazy 3D model management. No game-runtime dependencies. */
import * as T from '../../vendor/three/three.module.js';
import {GLTFLoader} from '../../vendor/three/addons/loaders/GLTFLoader.js';
import {LIBRARY_MAP} from './catalog.mjs';
import {inspectGLB,assetHash,safeFilename,assetPut,assetGet,assetAll,GLB_MAX_BYTES} from './glb-utils.mjs';
const loader=new GLTFLoader();
const sourceCache=new Map(),locals=new Map();
function positiveDimensions(s){return [s.x,s.y,s.z].every(v=>Number.isFinite(v)&&v>.0001);}
export async function readLibraryAsset(id){
 if(sourceCache.has(id))return sourceCache.get(id);
 const promise=(async()=>{
  let object;
  if(id.startsWith('local:')){
   let row=locals.get(id)||await assetGet(id);
   if(!row)throw Error('Egen GLB saknas. Importera den på nytt eller öppna ZIP-projektet.');
   locals.set(id,row);inspectGLB(row.data);
   object=(await loader.parseAsync(row.data.slice(0), '')).scene;
  }else{
   const e=LIBRARY_MAP.get(id);if(!e)throw Error('Okänt katalogobjekt.');
   const url=new URL(e.url,new URL('../',import.meta.url));
   // Model URLs must be audited same-origin paths, never external configuration.
   if(url.origin!==location.origin)throw Error('Externa 3D-källor är blockerade.');
   object=(await loader.loadAsync(url.href)).scene;
  }
  if(!object)throw Error('3D-modellen kunde inte öppnas.');
  object.updateWorldMatrix(true,true);const b=new T.Box3().setFromObject(object);
  const size=b.getSize(new T.Vector3());if(!positiveDimensions(size))throw Error('Modellen har en ogiltig storlek.');
  return {scene:object,originalBounds:b,originalSize:size};
 })().catch(e=>{sourceCache.delete(id);throw e;});
 sourceCache.set(id,promise);return promise;
}
export async function addModelToGroup(item,group,onReady){
 const assetId=item.assetId;
 try{
  const {scene,originalBounds,originalSize}=await readLibraryAsset(assetId);
  // A disposed/replaced preview group must not be resurrected on async load.
  if(!group.parent||group.userData.editId!==item.id)return false;
  const scaled=Math.min(item.w/originalSize.x,item.d/originalSize.z,item.height/originalSize.y);
  if(!Number.isFinite(scaled)||scaled<=0)throw Error('Modellen kunde inte skalas.');
  const clone=scene.clone(true);
  clone.scale.setScalar(scaled);
  const center=originalBounds.getCenter(new T.Vector3());
  clone.position.set(-center.x*scaled, -originalBounds.min.y*scaled, -center.z*scaled);
  clone.traverse(node=>{if(node.isMesh){node.castShadow=false;node.receiveShadow=true;node.userData.editId=item.id;}});
  group.add(clone);group.userData.realModel=true;
  onReady?.();return true;
 }catch(e){group.userData.modelError=e.message;onReady?.();return false;}
}
export async function importLocalGLB(file){
 if(!file||!(/\.glb$/i.test(file.name)))throw Error('Välj en .glb-fil.');
 if(file.size<28||file.size>GLB_MAX_BYTES)throw Error('GLB-filen måste vara mindre än 8 MB.');
 const raw=await file.arrayBuffer();const inspection=inspectGLB(raw),id='local:'+await assetHash(raw);
 const row={id,name:safeFilename(file.name.replace(/\.glb$/i,'')),size:raw.byteLength,data:raw};
 locals.set(id,row);
 const cached=sourceCache.get(id);
 if(!cached){const data=await readLibraryAsset(id);const original=data.originalSize;
  const max=Math.max(original.x,original.y,original.z),factor=max>3||max<.2?1.25/max:1;
  row.dimensions={width:Math.min(3.5,Math.max(.1,original.x*factor)),depth:Math.min(3.5,Math.max(.1,original.z*factor)),height:Math.min(3.5,Math.max(.1,original.y*factor))};
 }else{const data=await cached,orig=data.originalSize,mx=Math.max(orig.x,orig.y,orig.z),f=mx>3||mx<.2?1.25/mx:1;
  row.dimensions={width:Math.min(3.5,Math.max(.1,orig.x*f)),depth:Math.min(3.5,Math.max(.1,orig.z*f)),height:Math.min(3.5,Math.max(.1,orig.y*f))};}
 try{await assetPut(row);}catch(e){row.localOnly=true;}
 return {id,name:row.name,category:'egna',kind:'prop',width:row.dimensions.width,depth:row.dimensions.depth,height:row.dimensions.height,
  thumb:null,license:'Din egen fil · kontrollera rättigheterna',source:'Lokal GLB-import',persisted:!row.localOnly,...inspection};
}
export async function localLibrary(){
 const persisted=await assetAll().catch(()=>[]);
 for(const row of persisted)locals.set(row.id,row);
 return [...locals.values()].map(row=>({id:row.id,name:row.name,category:'egna',kind:'prop',width:row.dimensions?.width||.8,
  depth:row.dimensions?.depth||.8,height:row.dimensions?.height||.9,thumb:null,license:'Egen GLB',source:'Importerad lokalt'}));
}
export async function getLocalFile(id){return locals.get(id)||await assetGet(id);}
export function releaseModelResources(){
 for(const prom of sourceCache.values())prom.then(({scene})=>scene.traverse(o=>{if(o.isMesh){o.geometry?.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m?.dispose());}})).catch(()=>{});
 sourceCache.clear();locals.clear();
}
