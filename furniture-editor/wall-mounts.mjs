/**
 * Wall mounts are authored furniture, not painted textures. Their 3D pose is
 * derived from a stable wall ID, fractional position, face and centre height.
 * This pure geometry is shared by plan/3D and preserves normal FPS furniture
 * serialization. A missing wall is never silently replaced by an invisible one.
 */
import {wallFootprint} from './model-alignment.mjs?v=5.0.0';
const r=n=>Math.round(n*1000000)/1000000;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const normalAngle=a=>Math.atan2(Math.sin(a),Math.cos(a));
const wallIsSolid=w=>w&&!w.deleted&&w.kind==='wall'&&Array.isArray(w.a)&&Array.isArray(w.b);
const normWall=(wall,canonical=false)=>{
 if(canonical&&(wall.a[0]>wall.b[0]||wall.a[0]===wall.b[0]&&wall.a[1]>wall.b[1]))wall={...wall,a:wall.b,b:wall.a};
 const dx=wall.b[0]-wall.a[0],dz=wall.b[1]-wall.a[1],length=Math.hypot(dx,dz);
 return length>.25?{a:wall.a,dx,dz,length,ux:dx/length,uz:dz/length,nx:-dz/length,nz:dx/length}:null;
};
export function validWallMount(mount){
 return !!mount&&typeof mount==='object'&&!Array.isArray(mount)&&
  typeof mount.wallId==='string'&&mount.wallId.length>0&&mount.wallId.length<=100&&
  finite(mount.t)&&mount.t>=0&&mount.t<=1&&
  (mount.side===1||mount.side===-1)&&finite(mount.y)&&mount.y>=.1&&mount.y<=5.9&&(mount.frame===undefined||mount.frame===1);
}
export function poseOnWall(item,mount,walls){
 if(!validWallMount(mount)||!finite(item?.w)||!finite(item?.d)||!finite(item?.height))return null;
 const wall=walls.find(w=>w.id===mount.wallId&&wallIsSolid(w));
 if(!wall)return null;
 const geo=normWall(wall,mount.frame===1),fit=wallFootprint(item);
 if(!geo||item.w<=0||item.d<=0||item.height<=0||geo.length<fit.width+.09)return null;
 const lo=(fit.width/2+.045)/geo.length,hi=1-lo;
 if(lo>hi)return null;
 const maxY=wall.height-fit.height/2-.06,minY=fit.height/2+.1;
 if(maxY<minY)return null;
 let spans=[[0,geo.length]];
 for(const opening of walls.filter(w=>!w.deleted&&['door','card-door','opening','window','glazed'].includes(w.kind)&&Array.isArray(w.a)&&Array.isArray(w.b))){
  const projection=opening.a&&[opening.a,opening.b].map(p=>({t:(p[0]-geo.a[0])*geo.ux+(p[1]-geo.a[1])*geo.uz,n:(p[0]-geo.a[0])*geo.nx+(p[1]-geo.a[1])*geo.nz}));
  if(!projection.every(p=>Math.abs(p.n)<Math.max(.08,(wall.thickness||.1)/2)))continue;
  const start=Math.min(...projection.map(p=>p.t)),end=Math.max(...projection.map(p=>p.t));
  spans=spans.flatMap(([a,b])=>end<=a||start>=b?[[a,b]]:[[a,Math.max(a,start)],[Math.min(b,end),b]].filter(([x,y])=>y>x));
 }
 const margin=fit.width/2+.045,available=spans.filter(([a,b])=>b-a>=fit.width+.09).map(([a,b])=>clamp(mount.t,(a+margin)/geo.length,(b-margin)/geo.length));
 if(!available.length)return null;
 const t=r(available.sort((a,b)=>Math.abs(a-mount.t)-Math.abs(b-mount.t))[0]),y=r(clamp(mount.y,minY,maxY));
 const side=mount.side;
 const offset=(Math.max(.035,wall.thickness||.10)/2)+fit.depth/2+.012;
 return {x:r(geo.a[0]+geo.dx*t+geo.nx*side*offset),
  z:r(geo.a[1]+geo.dz*t+geo.nz*side*offset),
  yaw:r(normalAngle(Math.atan2(geo.nx*side,geo.nz*side)-fit.frontAngle)),
  elevation:r(y-fit.height/2),mountId:null,wallMount:{wallId:wall.id,t:r(t),side,y:r(y),...(mount.frame===1?{frame:1}:{})},
  snapRole:'wall',collision:'none'};
}
export function findWallMount(item,point,walls,{radius=.85,centerY=null,floors=[]}={}){
 if(!point||!finite(point.x)||!finite(point.z))return null;
 let best=null,score=Infinity;
 for(const wall of walls||[]){
  if(!wallIsSolid(wall)||point.wallId&&point.wallId!==wall.id)continue;
  const g=normWall(wall,true);if(!g)continue;
  const vx=point.x-g.a[0],vz=point.z-g.a[1];
  const t=clamp((vx*g.dx+vz*g.dz)/(g.length*g.length),0,1);
  const cx=g.a[0]+g.dx*t,cz=g.a[1]+g.dz*t;
  const signed=vx*g.nx+vz*g.nz;
  let side=signed<0?-1:1;
  if(point.normal&&Math.hypot(point.normal.x,point.normal.z)>.5)side=point.normal.x*g.nx+point.normal.z*g.nz<0?-1:1;
  else if(Math.abs(signed)<.006){
   const plus=onFloor(cx+g.nx*.3,cz+g.nz*.3,floors),minus=onFloor(cx-g.nx*.3,cz-g.nz*.3,floors);
   if(plus!==minus)side=plus?1:-1;
   else if(item.wallMount?.wallId===wall.id&&item.wallMount.frame===1)side=item.wallMount.side;
  }
  const desired=finite(centerY)?centerY:finite(point.y)?point.y:item.wallMount?.y??1.55;
  const pose=poseOnWall(item,{wallId:wall.id,t,side,y:desired,frame:1},walls);
  if(!pose)continue;
  const distance=Math.max(0,Math.hypot(point.x-cx,point.z-cz)-(wall.thickness||.10)/2);
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
  if(!pose&&!walls.some(w=>w.id===item.wallMount.wallId)){
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

// Point-in-polygon is evaluated only for a centre-line click. A real picked face wins.
function onFloor(x,z,floors){return floors.some(f=>{const poly=f.polygon||[[f.x0,f.z0],[f.x1,f.z0],[f.x1,f.z1],[f.x0,f.z1]];let inside=false;
 for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;});}
export function wallMountProblem(item,point,walls){
 const fit=wallFootprint(item),near=(walls||[]).filter(w=>wallIsSolid(w)&&(!point.wallId||w.id===point.wallId)).map(w=>{const g=normWall(w),t=g&&clamp(((point.x-g.a[0])*g.dx+(point.z-g.a[1])*g.dz)/g.length**2,0,1);return {w,g,d:g?Math.hypot(point.x-g.a[0]-g.dx*t,point.z-g.a[1]-g.dz*t):Infinity};}).sort((a,b)=>a.d-b.d)[0];
 if(!near||near.d>.85)return 'Peka närmare en hel väggyta. Välj Fritt på golvet om du vill ställa föremålet där.';
 if(near.g.length<fit.width+.09)return `Föremålet behöver ${(fit.width+.09).toFixed(2)} i väggbredd; här finns ${near.g.length.toFixed(2)}. Välj en längre vägg eller minska föremålet.`;
 if(near.w.height<fit.height+.16)return `Föremålet behöver ${(fit.height+.16).toFixed(2)} i vägghöjd; väggen är ${near.w.height.toFixed(2)}.`;
 return 'Föremålet får inte plats på en hel väggyta. En dörr eller ett fönster kan dela väggen. Välj en annan plats.';
}
