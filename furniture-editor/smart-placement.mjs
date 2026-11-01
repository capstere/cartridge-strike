/**
 * One intuitive placement pipeline for procedural models, curated GLBs and user
 * imports. The scene/physics is unchanged; outputs are ordinary saved furniture.
 * Automatic suggestions can always be overridden by Auto/Surface/Wall/Floor.
 */
import {placementRole,proceduralOf} from './library/procedural.mjs?v=4.4.0';
import {LIBRARY_MAP} from './library/catalog.mjs?v=4.7.0';
import {findWallMount,wallMountProblem} from './wall-mounts.mjs?v=4.7.0';
import {round,normalizeAngle} from './core.mjs';

const isSurface=o=>!o.deleted&&(!o.wallMount||proceduralOf(o)?.shape==='wall-shelf'&&Math.abs(o.wallRoll||0)<1e-6)&&(
 ['counter','desk','table','round','wall-shelf'].includes(proceduralOf(o)?.shape)||
 ['desk','table','coffee-table'].includes(o.kind)||
 /counter|bench|worktop|table|desk|skrivbord|bänk|kitchen.?sink|diskbänk/i.test(o.assetName||'')
 )&&Number.isFinite(o.height)&&(o.height>.35||proceduralOf(o)?.shape==='wall-shelf')&&o.height<=1.45;
const near=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const global=(parent,lx,lz)=>{
 const c=Math.cos(parent.yaw),s=Math.sin(parent.yaw);
 return {x:round(parent.x+c*lx+s*lz),z:round(parent.z-s*lx+c*lz)};
};
const local=(parent,x,z)=>{
 const c=Math.cos(parent.yaw),s=Math.sin(parent.yaw),dx=x-parent.x,dz=z-parent.z;
 return {x:c*dx-s*dz,z:s*dx+c*dz};
};
const wallWords=/bathroommirror|mirror|spegel|wall.?clock|väggklock|poster|affisch|tavla|målning|painting|picture|wall.?frame|väggfäste|extinguisherbracket|phonearm|gloveholder|glove.?holder|väggskylt|skylt|sign|etikett|wall.?light|wall.?lamp|vägglampa/i;
const tableWords=/microwave|mikro|coffee.?machine|kaffemaskin|tangentbord|keyboard|monitor|datorskärm|printer|skrivare|laptop|bok|books|pottedplant|plantsmall|bordslampa|table.?lamp|mug|cup|kopp|flaska|vase|vas|donut|food.?kit|small.?box|plasticboxsmall|kartongkniv|knife|telefon|phone.?portable/i;
const floorWords=/golvlampa|floor.?lamp|sofa|chair|stol|hylla|shelf|locker|skåp|cabinet|fridge|kyl|frys|bin|sopkärl|cart|vagn|pall|pallet|bord|table|desk|bänk|counter|bed|säng|shower|dusch|toilet|toalett/i;
export function inferPlacementRole(item){
 if(LIBRARY_MAP.get(item?.assetId)?.placement)return LIBRARY_MAP.get(item.assetId).placement;
 const procedural=proceduralOf(item);
 if(procedural)return procedural.placement||'floor';
 const explicit=placementRole(item);
 if(explicit!=='floor')return explicit;
 const name=String(item?.assetName||'')+' '+String(item?.assetId||'');
 if(wallWords.test(name))return 'wall';
 if(tableWords.test(name))return 'countertop';
 if(!floorWords.test(name)&&item?.kind==='prop'&&
  Number.isFinite(item.w)&&Number.isFinite(item.d)&&Number.isFinite(item.height)&&
  item.w<=.58&&item.d<=.55&&item.height<=.55)return 'countertop';
 return 'floor';
}
export function findSupport(item,point,objects,{radius=.38,role=inferPlacementRole(item)}={}){
 if(!['countertop','desk-edge'].includes(role))return null;
 let best=null,score=Infinity;
 for(const surface of objects){
  if(surface.id===item.id||!isSurface(surface))continue;
  if(role==='desk-edge'&&!['desk','table'].includes(surface.kind)&&proceduralOf(surface)?.shape!=='desk')continue;
  const where=local(surface,point.x,point.z),allowW=(surface.w-item.w)/2+.08,allowD=(surface.d-item.d)/2+.06;
  if(allowW<-.12||allowD<-.12)continue;
  if(Math.abs(where.x)>Math.max(.08,allowW)+radius||Math.abs(where.z)>Math.max(.08,allowD)+radius)continue;
  const target=role==='desk-edge'?
   global(surface,Math.max(-Math.max(0,allowW),Math.min(Math.max(0,allowW),where.x)),surface.d*.42):
   global(surface,Math.max(-Math.max(0,allowW),Math.min(Math.max(0,allowW),where.x)),
    Math.max(-Math.max(0,allowD),Math.min(Math.max(0,allowD),where.z)));
  const dist=near(point,target);
  if(dist>radius+.16)continue;
  const priority=dist+Math.abs(point.x-surface.x)*.002;
  if(priority<score){score=priority;best={...target,yaw:surface.yaw,
   mountId:surface.id,elevation:round((surface.elevation||0)+surface.height-.008),snapRole:role};}
 }
 return best;
}
export function proposeSmartPose(item,point,objects,{enabled=true,mode='auto',walls=[],floors=[]}={}){
 const pos={x:round(point.x),z:round(point.z)};
 const floor={...pos,mountId:null,wallMount:null,elevation:0,snapRole:'floor'};
 if(!enabled)return {...pos,mountId:null,elevation:0}; // Legacy API contract
 if(mode==='floor')return floor;
 const role=mode==='wall'?'wall':mode==='surface'?'countertop':inferPlacementRole(item);
 if(role==='wall'){
  const mount=findWallMount(item,point,walls,{floors});
  return mount||{...floor,blocked:wallMountProblem(item,point,walls)};
 }
 const support=findSupport(item,pos,objects,{role});
 return support?{...support,wallMount:null}:mode==='surface'?{...floor,blocked:'Peka på en bordsyta där föremålet får plats.'}:floor;
}
export function isMountedOn(item,other){
 return !!item.mountId&&item.mountId===other.id&&item.elevation>=Math.min(.45,other.height*.5);
}
/** Copy a support and its complete attachment tree without sharing anchors. */
export function duplicateFurnitureAssembly(root,objects,pose){
 const members=[root],seen=new Set([root.id]),used=new Set(objects.map(o=>o.id)),ids=new Map();
 for(let i=0;i<members.length;i++)for(const child of objects.filter(o=>o.mountId===members[i].id&&!seen.has(o.id))){seen.add(child.id);members.push(child);}
 for(const item of members){let n=1,id;do{id='NY-OBJ-'+String(n++).padStart(4,'0');}while(used.has(id));used.add(id);ids.set(item.id,id);}
 const angle=(pose.yaw??root.yaw)-root.yaw,c=Math.cos(angle),s=Math.sin(angle);
 return members.map((item,index)=>{const {original,source,...copy}=item,dx=item.x-root.x,dz=item.z-root.z;
  return {...copy,...(index===0?pose:{}),id:ids.get(item.id),source:'added',
   x:round(pose.x+c*dx+s*dz),z:round(pose.z-s*dx+c*dz),yaw:normalizeAngle(item.yaw+angle),
   mountId:index===0?(pose.mountId||null):(ids.get(item.mountId)||item.mountId),
   wallMount:index===0?(pose.wallMount||null):(copy.wallMount||null)};
 });
}
