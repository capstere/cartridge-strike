import * as T from '../../vendor/three/three.module.js';
import {addModelToGroup,getLocalFile,importLocalGLB} from '../library/models.mjs';
import {assetHash} from '../library/glb-utils.mjs';
import {proceduralOf} from '../library/procedural.mjs?v=3.5.0';
import {populateProcedural,populateDiningChair} from '../library/procedural-mesh.mjs?v=3.5.0';
import {locatePoster} from './posters.mjs';
import {createPosterTexture} from './poster-art.mjs';
import {treatmentPosition} from './treatments.mjs';

export function buildProjectDecorations(project,entries,root,onReady){
 for(const poster of project.architecture.posters||[]){
  const at=locatePoster(poster,entries);if(!at)continue;
  const map=createPosterTexture(T,poster,onReady),material=new T.MeshBasicMaterial({map,side:T.DoubleSide});
  material.userData.studioOwned=true;
  const plane=new T.Mesh(new T.PlaneGeometry(poster.width,poster.height),material);
  plane.position.set(at.x,poster.y,at.z);plane.rotation.y=at.angle;plane.userData.editId=poster.id;root.add(plane);
 }
 for(const item of project.architecture.treatments||[]){
  const at=treatmentPosition(item,entries);if(!at)continue;
  const holder=new T.Group();holder.userData.editId=item.id;holder.position.set(at.center[0],0,at.center[1]);holder.rotation.y=at.angle;root.add(holder);
  const curtain=item.type==='curtain',bottom=curtain?.06:(at.wall.kind==='window'?at.wall.sill:.2),top=at.wall.height-.08;
  const material=new T.MeshStandardMaterial({color:curtain?0xf2f4ed:0x58656a,side:T.DoubleSide,transparent:curtain,opacity:curtain?.32:1,roughness:.85,depthWrite:!curtain});material.userData.studioOwned=true;
  const count=curtain?Math.max(4,Math.ceil(at.width/.12)):Math.max(4,Math.ceil((top-bottom)/.08));
  for(let i=0;i<count;i++){
   const mesh=new T.Mesh(new T.BoxGeometry(curtain?at.width/count:.01+at.width,curtain?top-bottom:.04,curtain?.02:.03),material);
   mesh.position.set(curtain?-at.width/2+at.width*(i+.5)/count:0,curtain?(top+bottom)/2:bottom+(top-bottom)*(i+.5)/count,curtain?(i%2)*.035:0);holder.add(mesh);
  }
 }
}

/** Same furniture models and dimensions in the studio and private/published FPS. */
export async function buildProjectFurniture(items,root,{assets=[]}={}){
 for(const id of new Set(items.map(o=>o.assetId).filter(id=>id?.startsWith('local:')))){
  if(await getLocalFile(id))continue;
  const row=assets.find(a=>a.assetId===id);
  if(!row||row.file!==`assets/models/${id.slice(6)}.glb`)throw Error('Modellfil saknas: '+id);
  const response=await fetch(new URL('../../'+row.file,import.meta.url));
  if(!response.ok)throw Error('Modellfil saknas: '+row.file);
  const bytes=new Uint8Array(await response.arrayBuffer());
  if(bytes.length!==row.bytes||await assetHash(bytes)!==id.slice(6))throw Error('Modellens innehållshash stämmer inte: '+row.file);
  await importLocalGLB(new File([bytes],row.file.split('/').at(-1),{type:'model/gltf-binary'}));
 }
 const pending=[];
 for(const item of items){
  const holder=new T.Group();holder.userData.editId=item.id;
  holder.position.set(item.x,item.elevation||0,item.z);holder.rotation.y=item.yaw||0;root.add(holder);
  const put=(x,y,z,w,h,d,material=0x668c90)=>{const m=typeof material==='number'?new T.MeshStandardMaterial({color:material}):material;
   if(typeof material==='number')m.userData.studioOwned=true;
   const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),m);mesh.userData.studioGeometry=true;mesh.userData.editId=item.id;mesh.position.set(x,y,z);holder.add(mesh);return mesh;};
  if(proceduralOf(item))populateProcedural(item,holder,put);
  else if(item.assetId)pending.push(addModelToGroup(item,holder).then(ok=>{if(!ok)throw Error(`Modellen ${item.assetName||item.id} saknas: ${holder.userData.modelError}`);}));
  else if(['table','desk','coffee-table'].includes(item.kind)){
   put(0,item.height-.04,0,item.w,.08,item.d,0xd5d4c9);
   for(const x of [-1,1])for(const z of [-1,1])put(x*(item.w/2-.06),item.height/2,z*(item.d/2-.06),.05,item.height,.05,0x68777c);
  }else if(item.kind==='chair')populateDiningChair(item,put);
  else put(0,item.height/2,0,item.w,item.height,item.d,0x668c90);
 }
 await Promise.all(pending);return root;
}
