/**
 * Presentation for smart placement; the pose comes from the same pure algorithm
 * used by the editor for actual placement. Highlights never create colliders.
 */
import {inferPlacementRole,proposeSmartPose} from './smart-placement.mjs';

const finite=n=>typeof n==='number'&&Number.isFinite(n);
const normalWall=w=>w&&!w.deleted&&w.kind==='wall';
const label=o=>String(o?.assetName||o?.name||'möbeln').slice(0,65);

/** Prefer the visible 3D hit over an imaginary ground point behind the model. */
export function preferredPlacementPoint(pick,objects=[],walls=[]){
 if(!pick)return null;
 const support=objects.some(o=>o.id===pick.id&&!o.deleted);
 const onWall=walls.some(w=>w.id===pick.id&&['wall','window','glazed'].includes(w.kind)&&!w.deleted);
 return (support||onWall)&&pick.surface||pick.ground||null;
}
/** Recompute using exactly the same placement math as the final click. */
export function placementPreview(item,point,objects=[],walls=[],{mode='auto'}={}){
 if(!item||!point||![point.x,point.z].every(finite))return null;
 const pose=proposeSmartPose(item,point,objects,{mode,walls});
 if(pose.wallMount){
  const wall=walls.find(w=>w.id===pose.wallMount.wallId&&normalWall(w));
  if(wall){
   return {kind:'wall',targetId:wall.id,
    label:'Väggen är vald – klicka för att hänga upp',
    pose,
    surface:{x:pose.x,z:pose.z,y:(pose.elevation||0)+item.height/2,
     w:item.w+.13,d:.055,h:item.height+.13,yaw:pose.yaw||0}};
  }
 }
 if(pose.mountId){
  const support=objects.find(o=>o.id===pose.mountId&&!o.deleted);
  if(support){
   return {kind:'surface',targetId:support.id,
    label:'Ovanpå '+label(support)+' – klicka för att placera',
    pose,
    surface:{x:support.x,z:support.z,y:(support.elevation||0)+support.height+.018,
     w:Math.max(.12,support.w*.96),d:Math.max(.12,support.d*.96),h:.032,yaw:support.yaw||0}};
  }
 }
 const desired=mode==='wall'?'wall':mode==='surface'?'countertop':
  mode==='floor'?'floor':inferPlacementRole(item);
 return {kind:desired==='wall'?'needs-wall':['countertop','desk-edge'].includes(desired)?'needs-surface':'floor',
  targetId:null,pose,
  label:desired==='wall'?'Peka på en vägg – annars kan du ställa föremålet på golvet':
   ['countertop','desk-edge'].includes(desired)?'Peka på en möbelyta – annars kan du placera på golvet':
   'Fri placering på golvet',
  surface:null};
}
