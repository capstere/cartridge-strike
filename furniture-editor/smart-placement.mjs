/** Smart attachment decisions are pure and editor-only. No map/physics mutation. */
import {placementRole,proceduralOf} from './library/procedural.mjs';
import {round,normalizeAngle} from './core.mjs';
const isSurface=o=>!o.deleted&&(['counter','desk','table','round'].includes(proceduralOf(o)?.shape)||['desk','table','coffee-table'].includes(o.kind)||/counter|bench|worktop|table|desk|skrivbord|bänk/i.test(o.assetName||''));
const near=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const global=(parent,lx,lz)=>{
 const c=Math.cos(parent.yaw),s=Math.sin(parent.yaw);
 return {x:round(parent.x+c*lx+s*lz),z:round(parent.z-s*lx+c*lz)};
};
const local=(parent,x,z)=>{
 const c=Math.cos(parent.yaw),s=Math.sin(parent.yaw),dx=x-parent.x,dz=z-parent.z;
 return {x:c*dx-s*dz,z:s*dx+c*dz};
};
export function findSupport(item,point,objects,{radius=.38}={}){
 const role=placementRole(item);
 if(!['countertop','desk-edge'].includes(role))return null;
 let best=null,score=Infinity;
 for(const surface of objects){
  if(surface.id===item.id||!isSurface(surface)||surface.deleted)continue;
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
   mountId:surface.id,elevation:round(surface.height-.008),snapRole:role};}
 }
 return best;
}
export function proposeSmartPose(item,point,objects,{enabled=true}={}){
 const pos={x:round(point.x),z:round(point.z)};
 if(!enabled)return {...pos,mountId:null,elevation:0};
 const support=findSupport(item,pos,objects);
 return support?{...support}:{...pos,mountId:null,elevation:0};
}
export function isMountedOn(item,other){return !!item.mountId&&item.mountId===other.id&&item.elevation>=Math.min(.45,other.height*.5);}

/** Copy a support and its complete attachment tree without sharing anchors. */
export function duplicateFurnitureAssembly(root,objects,pose){
 const members=[root],seen=new Set([root.id]),used=new Set(objects.map(o=>o.id)),ids=new Map();
 for(let i=0;i<members.length;i++)for(const child of objects.filter(o=>o.mountId===members[i].id&&!seen.has(o.id))){seen.add(child.id);members.push(child);}
 for(const item of members){let n=1,id;do{id='NY-OBJ-'+String(n++).padStart(4,'0');}while(used.has(id));used.add(id);ids.set(item.id,id);}
 const angle=(pose.yaw??root.yaw)-root.yaw,c=Math.cos(angle),s=Math.sin(angle);
 return members.map((item,index)=>{const {original,source,...copy}=item,dx=item.x-root.x,dz=item.z-root.z;
  return {...copy,...(index===0?pose:{}),id:ids.get(item.id),source:'added',
   x:round(pose.x+c*dx+s*dz),z:round(pose.z-s*dx+c*dz),yaw:normalizeAngle(item.yaw+angle),
   mountId:index===0?(pose.mountId||null):(ids.get(item.mountId)||item.mountId)};
 });
}
