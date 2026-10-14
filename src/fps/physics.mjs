import { Box3, BoxGeometry, Matrix4, Vector2, Vector3, Triangle, ShapeUtils } from '../../vendor/three/three.module.js';
import { Capsule } from '../../vendor/three/addons/math/Capsule.js';
import { Octree } from '../../vendor/three/addons/math/Octree.js';

export const ACTOR_RADIUS=.20;
export const STANDING_HEIGHT=1.70;
export const CEILING_HEIGHT=2.85;
const EPS=1e-5;
export const polygonBounds=p=>({minX:Math.min(...p.map(v=>v[0])),maxX:Math.max(...p.map(v=>v[0])),minZ:Math.min(...p.map(v=>v[1])),maxZ:Math.max(...p.map(v=>v[1]))});
export function insidePolygon(x,z,p){let yes=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
export function distanceSegment(x,z,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t);}

/** Static two-dimensional broad phase. It never changes the authoritative geometry. */
export class SpatialIndex {
  constructor(size=2){this.size=size;this.cells=new Map();}
  insert(item,bounds){
    for(let x=Math.floor(bounds.minX/this.size);x<=Math.floor(bounds.maxX/this.size);x++)for(let z=Math.floor(bounds.minZ/this.size);z<=Math.floor(bounds.maxZ/this.size);z++){
      const key=`${x},${z}`,cell=this.cells.get(key)||[];cell.push(item);this.cells.set(key,cell);
    }
  }
  at(x,z){return this.cells.get(`${Math.floor(x/this.size)},${Math.floor(z/this.size)}`)||[];}
  nearby(x,z,r){const out=new Set();for(let ix=Math.floor((x-r)/this.size);ix<=Math.floor((x+r)/this.size);ix++)for(let iz=Math.floor((z-r)/this.size);iz<=Math.floor((z+r)/this.size);iz++)for(const p of this.cells.get(`${ix},${iz}`)||[])out.add(p);return out;}
}

function boxBounds(b){const c=Math.abs(Math.cos(b.angle||0)),s=Math.abs(Math.sin(b.angle||0)),hx=(b.w*c+b.d*s)/2,hz=(b.w*s+b.d*c)/2;return {minX:b.x-hx,maxX:b.x+hx,minZ:b.z-hz,maxZ:b.z+hz};}
function circleHitsBox(x,z,r,b){
  const dx=x-b.x,dz=z-b.z,lx=b.cos*dx-b.sin*dz,lz=b.sin*dx+b.cos*dz;
  return Math.hypot(Math.max(Math.abs(lx)-b.w/2,0),Math.max(Math.abs(lz)-b.d/2,0))<r-EPS;
}
function capsuleFootprintRadius(b,y,height,r){
  const low=y+r,high=y+height-r;
  const gap=Math.max(0,low-(b.y+b.h/2),(b.y-b.h/2)-high);
  return gap>=r?0:Math.sqrt(r*r-gap*gap);
}
function touchesPolygon(x,z,r,p){return insidePolygon(x,z,p)||p.some((a,i)=>distanceSegment(x,z,a,p[(i+1)%p.length])<r-EPS);}

/** A bounded builder for the upstream Octree; all intersection routines remain Three.js.
 * Adapted from Three.js Octree.split (MIT; Copyright 2010-2025 Three.js authors).
 * Upstream children reset maxLevel/trianglesPerLeaf to defaults. Explicitly propagating
 * those limits avoids hundreds of megabytes of tiny nodes around coplanar office trim.
 */
class FloorOctree extends Octree {
  split(level){
    if(!this.box)return this;
    const half=this.box.max.clone().sub(this.box.min).multiplyScalar(.5),children=[];
    for(let x=0;x<2;x++)for(let y=0;y<2;y++)for(let z=0;z<2;z++){
      const min=this.box.min.clone().add(new Vector3(x,y,z).multiply(half));
      const child=new FloorOctree(new Box3(min,min.clone().add(half)));child.maxLevel=this.maxLevel;child.trianglesPerLeaf=this.trianglesPerLeaf;children.push(child);
    }
    for(const triangle of this.triangles)for(const child of children)if(child.box.intersectsTriangle(triangle))child.triangles.push(triangle);
    this.triangles=[];
    for(const child of children)if(child.triangles.length){if(child.triangles.length>this.trianglesPerLeaf&&level<this.maxLevel)child.split(level+1);this.subTrees.push(child);}
    return this;
  }
}

/** Floor adapter uses the official Three Capsule/Octree FPS collision pattern.
 * Static triangles are built once from the same boxes/surfaces sent to the renderer.
 * Authoritative scope constraints additionally prevent any jump into excluded volumes.
 */
export function createPhysics(description,data){
  const floorIndex=new SpatialIndex(),scopeIndex=new SpatialIndex(),navObstacleIndex=new SpatialIndex(),boxIndex=new SpatialIndex();
  for(const p of data.floorPolygons)floorIndex.insert(p,polygonBounds(p));
  for(const r of [...data.excludedRooms,...data.rooms.filter(r=>r.status==='uncertain'),...data.obstacles.filter(o=>o.kind==='uncertain-area')])scopeIndex.insert(r.polygon,polygonBounds(r.polygon));
  for(const o of data.obstacles)navObstacleIndex.insert(o.polygon,polygonBounds(o.polygon));
  const staticBoxes=description.boxes.filter(b=>b.w>0&&b.h>0&&b.d>0).map(b=>({...b,cos:Math.cos(b.angle||0),sin:Math.sin(b.angle||0)}));
  for(const b of staticBoxes)boxIndex.insert(b,boxBounds(b));
  const onFloor=(x,z)=>floorIndex.at(x,z).some(p=>insidePolygon(x,z,p)||p.some((a,i)=>distanceSegment(x,z,a,p[(i+1)%p.length])<EPS));
  function scopeAllowed(x,z,r=ACTOR_RADIUS){
    if(!Number.isFinite(x)||!Number.isFinite(z))return false;
    if(!onFloor(x,z))return false;
    for(let i=0;i<16;i++){const a=i*Math.PI/8;if(!onFloor(x+Math.cos(a)*r,z+Math.sin(a)*r))return false;}
    for(const p of scopeIndex.nearby(x,z,r))if(touchesPolygon(x,z,r,p))return false;
    return true;
  }
  function canOccupy(x,z,r=ACTOR_RADIUS,height=STANDING_HEIGHT,y=0){
    if(!scopeAllowed(x,z,r))return false;
    // Accepted furniture footprints stay outside the navigation surface. At jumping
    // height movement uses the exact visible geometry; no furniture is a scope shortcut.
    if(y<.1)for(const p of navObstacleIndex.nearby(x,z,r))if(touchesPolygon(x,z,r,p))return false;
    for(const b of boxIndex.nearby(x,z,r)){
      // The feet/head are hemispheres, not a full-height cylinder. In particular
      // a 9-cm skirting board does not require a full 20-cm horizontal offset.
      // This exact capsule cross-section matches the Octree's physical clearance.
      const effectiveRadius=capsuleFootprintRadius(b,y,height,r);
      if(b.y+b.h/2>.035&&effectiveRadius>0&&circleHitsBox(x,z,effectiveRadius,b))return false;
    }
    return true;
  }

  const octree=new FloorOctree();octree.trianglesPerLeaf=24;octree.maxLevel=7;
  const cube=new BoxGeometry(1,1,1).toNonIndexed(),vertices=cube.getAttribute('position');
  const transform=new Matrix4(),rotation=new Matrix4(),scale=new Matrix4();
  for(const b of staticBoxes){
    // Millimetre-scale threshold trim is walkable; rendered height and ray hits stay exact.
    if(b.y+b.h/2<=.035)continue;
    transform.makeTranslation(b.x,b.y,b.z).multiply(rotation.makeRotationY(b.angle||0)).multiply(scale.makeScale(b.w,b.h,b.d));
    for(let i=0;i<vertices.count;i+=3){const vs=[0,1,2].map(k=>new Vector3().fromBufferAttribute(vertices,i+k).applyMatrix4(transform));const t=new Triangle(...vs);t.objectId=b.id;octree.addTriangle(t);}
  }
  cube.dispose();
  const surfaces=description.surfaces.filter(s=>s.material==='table'||s.id.startsWith('floor-')||s.id.startsWith('ceiling-'));
  // Floor/ceiling are planar at known source heights: scopeAllowed + the exact
  // vertical bounds in move handle them without inserting thousands of overlapping
  // coplanar triangles into an Octree. Ray tests still use every source polygon.
  for(const s of surfaces.filter(s=>s.material==='table')){
    const contour=s.polygon.map(p=>new Vector2(p[0],p[1]));
    for(const face of ShapeUtils.triangulateShape(contour,[])){
      const vs=face.map(i=>new Vector3(s.polygon[i][0],s.y,s.polygon[i][1]));
      // Both windings make table undersides and ceiling underside physically solid.
      const t=new Triangle(...vs),r=new Triangle(vs[2].clone(),vs[1].clone(),vs[0].clone());t.objectId=r.objectId=s.id;octree.addTriangle(t);octree.addTriangle(r);
    }
  }
  // Cubic partitions avoid dividing a 2.85-high floor into millimetre-tall cells
  // while the horizontal span is almost 100 units. Empty upper cells are discarded.
  const span=octree.bounds.getSize(new Vector3());octree.bounds.max.y=octree.bounds.min.y+Math.max(span.x,span.y,span.z);
  octree.build();
  const capsule=new Capsule(),translation=new Vector3();
  function setCapsule(actor,height=actor.height||STANDING_HEIGHT){const r=actor.radius||ACTOR_RADIUS;capsule.radius=r;capsule.start.set(actor.x,(actor.y||0)+r,actor.z);capsule.end.set(actor.x,(actor.y||0)+Math.max(r,height-r),actor.z);return capsule;}
  function canStand(actor,height=STANDING_HEIGHT){
    // Standing is legal only if the extra head volume is clear, including tables and lintels.
    const y=actor.y||0,r=actor.radius||ACTOR_RADIUS;
    if(y+height>CEILING_HEIGHT+.001)return false;
    for(const b of boxIndex.nearby(actor.x,actor.z,r))if(b.y+b.h/2>y+(actor.height||1.08)-.02&&b.y-b.h/2<y+height&&circleHitsBox(actor.x,actor.z,r,b))return false;
    return true;
  }
  function move(actor,dx,dy,dz){
    const result={collision:false,onGround:false,ceiling:false,normal:{x:0,y:0,z:0}};
    if(![dx,dy,dz].every(Number.isFinite)||Math.max(Math.abs(dx),Math.abs(dy),Math.abs(dz))>5)return result;
    actor.y=Number.isFinite(actor.y)?actor.y:0;
    const r=actor.radius||ACTOR_RADIUS,h=actor.height||STANDING_HEIGHT,n=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy),Math.abs(dz))/.07));
    for(let i=0;i<n;i++){
      const ox=actor.x,oy=actor.y,oz=actor.z;
      const nx=ox+dx/n,nz=oz+dz/n;
      if(scopeAllowed(nx,nz,r)){actor.x=nx;actor.z=nz;}
      else{
        result.collision=true;
        if(scopeAllowed(nx,oz,r))actor.x=nx;
        if(scopeAllowed(actor.x,nz,r))actor.z=nz;
      }
      actor.y+=dy/n;
      setCapsule(actor,h);
      for(let j=0;j<3;j++){
        const collision=octree.capsuleIntersect(capsule);if(!collision||collision.depth<1e-7)break;
        result.collision=true;result.normal={x:collision.normal.x,y:collision.normal.y,z:collision.normal.z};
        if(collision.normal.y>.45){result.onGround=true;if(actor.vy<0)actor.vy=0;}
        if(collision.normal.y<-.45){result.ceiling=true;if(actor.vy>0)actor.vy=0;}
        capsule.translate(translation.copy(collision.normal).multiplyScalar(collision.depth+.00001));
      }
      actor.x=capsule.start.x;actor.y=capsule.start.y-r;actor.z=capsule.start.z;
      if(!scopeAllowed(actor.x,actor.z,r)){actor.x=ox;actor.z=oz;result.collision=true;}
      if(actor.y<.0001){actor.y=0;result.onGround=true;if(actor.vy<0)actor.vy=0;}
      if(actor.y+h>CEILING_HEIGHT){actor.y=CEILING_HEIGHT-h;result.ceiling=true;if(actor.vy>0)actor.vy=0;}
      if(!Number.isFinite(actor.y)){actor.y=oy;result.collision=true;}
    }
    actor.onGround=result.onGround||actor.y<=.001;return result;
  }

  function raycast(origin,direction,maxDistance=100,{vision=false}={}){
    const len=Math.hypot(direction.x,direction.y||0,direction.z);if(len<EPS||maxDistance<=0)return null;
    const dir={x:direction.x/len,y:(direction.y||0)/len,z:direction.z/len},o={x:origin.x,y:origin.y??1.5,z:origin.z};
    let hit=null,best=maxDistance;
    // Segment broad phase: stepping cells collects the exact OBBs a ray can reach.
    const candidates=new Set(),steps=Math.max(1,Math.ceil(maxDistance/1.5));
    // The .8 expansion covers the whole interval between <=1.5-unit samples,
    // including a ray that clips a cell corner between two sample positions.
    for(let i=0;i<=steps;i++){const t=maxDistance*i/steps;for(const b of boxIndex.nearby(o.x+dir.x*t,o.z+dir.z*t,.8))candidates.add(b);}
    for(const b of candidates){
      if(vision&&b.material==='glass')continue;
      const ox=o.x-b.x,oz=o.z-b.z,p=[b.cos*ox-b.sin*oz,o.y-b.y,b.sin*ox+b.cos*oz],d=[b.cos*dir.x-b.sin*dir.z,dir.y,b.sin*dir.x+b.cos*dir.z],half=[b.w/2,b.h/2,b.d/2];
      let enter=-Infinity,leave=Infinity,axis=-1,sign=0,ok=true;
      for(let j=0;j<3;j++){
        if(Math.abs(d[j])<1e-10){if(Math.abs(p[j])>half[j]){ok=false;break;}}
        else{let t1=(-half[j]-p[j])/d[j],t2=(half[j]-p[j])/d[j];const n=d[j]>0?-1:1;if(t1>t2)[t1,t2]=[t2,t1];if(t1>enter){enter=t1;axis=j;sign=n;}leave=Math.min(leave,t2);if(enter>leave){ok=false;break;}}
      }
      if(!ok||leave<.0001||enter>best)continue;
      const t=Math.max(0,enter);const normal=[0,0,0];if(axis>=0)normal[axis]=sign;
      best=t;hit={distance:t,point:{x:o.x+dir.x*t,y:o.y+dir.y*t,z:o.z+dir.z*t},normal:{x:b.cos*normal[0]+b.sin*normal[2],y:normal[1],z:-b.sin*normal[0]+b.cos*normal[2]},id:b.id,material:b.material};
    }
    if(Math.abs(dir.y)>1e-9)for(const s of surfaces){const t=(s.y-o.y)/dir.y;if(t>=.0001&&t<best&&insidePolygon(o.x+dir.x*t,o.z+dir.z*t,s.polygon)){best=t;hit={distance:t,point:{x:o.x+dir.x*t,y:s.y,z:o.z+dir.z*t},normal:{x:0,y:dir.y>0?-1:1,z:0},id:s.id,material:s.material};}}
    return hit;
  }
  function segmentClear(from,to,options={}){const dx=to.x-from.x,dy=(to.y??1.5)-(from.y??1.5),dz=to.z-from.z,d=Math.hypot(dx,dy,dz);return d<EPS||!raycast({...from,y:from.y??1.5},{x:dx,y:dy,z:dz},Math.max(0,d-.015),options);}
  return {canOccupy,scopeAllowed,onFloor,canStand,move,raycast,segmentClear,octree,staticBoxes,statistics:{staticBoxes:staticBoxes.length,collisionSurfaces:surfaces.length,source:'Three.js Capsule + Octree; source boxes and polygons'}};
}
