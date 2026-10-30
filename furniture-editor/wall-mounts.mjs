/**
 * Wall mounts are authored furniture, not painted textures. Their 3D pose is
 * derived from a stable wall ID, fractional position, face and centre height.
 * This pure geometry is shared by plan/3D and preserves normal FPS furniture
 * serialization. A missing wall is never silently replaced by an invisible one.
 */
const r=n=>Math.round(n*1000)/1000;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const normalAngle=a=>Math.atan2(Math.sin(a),Math.cos(a));
const wallIsSolid=w=>w&&!w.deleted&&w.kind==='wall'&&Array.isArray(w.a)&&Array.isArray(w.b);
const normWall=wall=>{
 const dx=wall.b[0]-wall.a[0],dz=wall.b[1]-wall.a[1],length=Math.hypot(dx,dz);
 return length>.25?{dx,dz,length,ux:dx/length,uz:dz/length,nx:-dz/length,nz:dx/length}:null;
};
export function validWallMount(mount){
 return !!mount&&typeof mount==='object'&&!Array.isArray(mount)&&
  typeof mount.wallId==='string'&&mount.wallId.length>0&&mount.wallId.length<=100&&
  finite(mount.t)&&mount.t>=0&&mount.t<=1&&
  (mount.side===1||mount.side===-1)&&finite(mount.y)&&mount.y>=.1&&mount.y<=5.9;
}
export function poseOnWall(item,mount,walls){
 if(!validWallMount(mount)||!finite(item?.w)||!finite(item?.d)||!finite(item?.height))return null;
 const wall=walls.find(w=>w.id===mount.wallId&&wallIsSolid(w));
 if(!wall)return null;
 const geo=normWall(wall);
 if(!geo||item.w<=0||item.d<=0||item.height<=0||geo.length<item.w+.09)return null;
 const lo=(item.w/2+.045)/geo.length,hi=1-lo;
 if(lo>hi)return null;
 const maxY=wall.height-item.height/2-.06,minY=item.height/2+.1;
 if(maxY<minY)return null;
 const t=clamp(mount.t,lo,hi),y=clamp(mount.y,minY,maxY);
 const side=mount.side;
 const offset=(Math.max(.035,wall.thickness||.10)/2)+item.d/2+.012;
 return {x:r(wall.a[0]+geo.dx*t+geo.nx*side*offset),
  z:r(wall.a[1]+geo.dz*t+geo.nz*side*offset),
  yaw:r(normalAngle(-Math.atan2(geo.dz,geo.dx)+(side===-1?Math.PI:0))),
  elevation:r(y-item.height/2),mountId:null,wallMount:{wallId:wall.id,t:r(t),side,y:r(y)},
  snapRole:'wall',collision:'none'};
}
export function findWallMount(item,point,walls,{radius=.85,centerY=null}={}){
 if(!point||!finite(point.x)||!finite(point.z))return null;
 let best=null,score=Infinity;
 for(const wall of walls||[]){
  if(!wallIsSolid(wall))continue;
  const g=normWall(wall);if(!g)continue;
  const vx=point.x-wall.a[0],vz=point.z-wall.a[1];
  const t=clamp((vx*g.dx+vz*g.dz)/(g.length*g.length),0,1);
  const cx=wall.a[0]+g.dx*t,cz=wall.a[1]+g.dz*t;
  const side=vx*g.nx+vz*g.nz<-.005?-1:1;
  const desired=finite(centerY)?centerY:finite(point.y)?point.y:1.55;
  const pose=poseOnWall(item,{wallId:wall.id,t,side,y:desired},[wall]);
  if(!pose)continue;
  const distance=Math.hypot(point.x-pose.x,point.z-pose.z);
  if(distance>radius)continue;
  // Prefer the closest physical wall face. Never jump across the room.
  if(distance<score){best=pose;score=distance;}
 }
 return best;
}
export function syncWallMounts(items,walls,{reanchorDistance=.18}={}){
 let updated=0,missing=0;
 for(const item of items){
  if(!item.wallMount)continue;
  let pose=poseOnWall(item,item.wallMount,walls);
  if(!pose){
   const found=findWallMount(item,{x:item.x,z:item.z},walls,{
    radius:reanchorDistance,centerY:item.wallMount.y});
   pose=found||null;
  }
  if(!pose){missing++;continue;}
  // Preserve an explicit later collision override; default wall fixtures are
  // decoration so they do not add invisible player blockers.
  const keepCollision=item.collision||'none';
  Object.assign(item,pose,{collision:keepCollision});
  updated++;
 }
 return {updated,missing};
}
