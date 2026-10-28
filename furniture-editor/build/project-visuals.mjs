import * as T from '../../vendor/three/three.module.js';
import {addModelToGroup} from '../library/models.mjs';
import {proceduralOf} from '../library/procedural.mjs';
import {populateProcedural} from '../library/procedural-mesh.mjs';

/** Same furniture models and dimensions in the studio and private/published FPS. */
export async function buildProjectFurniture(items,root){
 const pending=[];
 for(const item of items){
  const holder=new T.Group();holder.userData.editId=item.id;
  holder.position.set(item.x,item.elevation||0,item.z);holder.rotation.y=item.yaw||0;root.add(holder);
  const put=(x,y,z,w,h,d,material=0x668c90)=>{const m=typeof material==='number'?new T.MeshStandardMaterial({color:material}):material;
   const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);holder.add(mesh);return mesh;};
  if(proceduralOf(item))populateProcedural(item,holder,put);
  else if(item.assetId)pending.push(addModelToGroup(item,holder).then(ok=>{if(!ok)throw Error(`Modellen ${item.assetName||item.id} saknas: ${holder.userData.modelError}`);}));
  else if(['table','desk','coffee-table'].includes(item.kind)){
   put(0,item.height-.04,0,item.w,.08,item.d,0xd5d4c9);
   for(const x of [-1,1])for(const z of [-1,1])put(x*(item.w/2-.06),item.height/2,z*(item.d/2-.06),.05,item.height,.05,0x68777c);
  }else if(item.kind==='chair'){
   put(0,.45,0,item.w,.09,item.d,0x344c61);put(0,.7,item.d*.4,item.w,.5,.08,0x344c61);
   for(const x of [-1,1])for(const z of [-1,1])put(x*item.w*.35,.22,z*item.d*.35,.035,.44,.035,0x68777c);
  }else put(0,item.height/2,0,item.w,item.height,item.d,0x668c90);
 }
 await Promise.all(pending);return root;
}
