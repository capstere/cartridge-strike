/** Cartridge Strike Furniture Studio — pure, read-only runtime adapter.
 * This file deliberately has no imports from the active FPS, no mutations of game data,
 * and no storage or network side effects. The exported JSON is review-only.
 */
export const EDITOR_VERSION = '1.0.0';
export const GAME_VERSION = '0.17.0';
export const BASE_COMMIT = '7b99da56c9cc7f7e5bdbc626a174c8db9a9e33bc';
export const PATCH_FORMAT = 'cartridge-strike-furniture-studio';
export const PATCH_SCHEMA = 1;
export const DEFAULT_ROOMS = Object.freeze(['I09','I10','I19','I14','I16','I17','I22','I23','I24','I28','I25','I20']);
export const EDITABLE_KINDS = Object.freeze({
  'authored-chair':'chair', 'authored-dining-table':'table',
  'authored-sofa':'sofa', 'authored-coffee-table':'coffee-table',
});
export const ROOM_LABELS = Object.freeze({I09:'Stora lunchrummet',I10:'Västra pentryt',I19:'Östra pentryt'});
const TAU = Math.PI*2;
export function round(n,precision=3){return Number(Number(n).toFixed(precision));}
export function normalizeAngle(radians){return ((radians+Math.PI)%TAU+TAU)%TAU-Math.PI;}
export function bounds(points){return [Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))];}
export function centroid(poly){const [x0,z0,x1,z1]=bounds(poly);return [(x0+x1)/2,(z0+z1)/2];}
export function inside(x,z,p){let yes=false;for(let i=0,j=p.length-1;i<p.length;j=i++){
 const a=p[i],b=p[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])yes=!yes;
}return yes;}
export function distanceSegment(x,z,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);}
export function corners(q,pad=0){const w=q.w/2+pad,d=q.d/2+pad,c=Math.cos(q.yaw),s=Math.sin(q.yaw);
 return [[-w,-d],[w,-d],[w,d],[-w,d]].map(([u,v])=>[q.x+c*u+s*v,q.z-s*u+c*v]);}
export function intersects(a,b){const pa=Array.isArray(a)?a:corners(a),pb=Array.isArray(b)?b:corners(b);
 for(const p of [pa,pb])for(let i=0;i<p.length;i++){
  const a=p[i],b=p[(i+1)%p.length],nx=-(b[1]-a[1]),nz=b[0]-a[0];
  const project=q=>q.map(v=>v[0]*nx+v[1]*nz);
  const qa=project(pa),qb=project(pb);
  if(Math.max(...qa)<Math.min(...qb)-1e-5||Math.max(...qb)<Math.min(...qa)-1e-5)return false;
 }return true;
}
export function segmentIntersectsRectangle(a,b,q,pad=0){const p=corners(q,pad);
 if(inside(a[0],a[1],p)||inside(b[0],b[1],p))return true;
 function crosses(a,b,c,d){const o=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);
 const ab=o(a,b,c)*o(a,b,d),cd=o(c,d,a)*o(c,d,b);return ab<=0&&cd<=0;
 }
 return p.some((c,i)=>crosses(a,b,c,p[(i+1)%p.length]));
}
export function catalog(data,furnishings){
 const objects=[];
 for(const o of data.obstacles){const kind=EDITABLE_KINDS[o.kind];if(!kind)continue;
  const [x,z]=centroid(o.polygon),[x0,z0,x1,z1]=bounds(o.polygon);
  objects.push({id:o.id,source:'authored',kind,roomId:o.roomId,x,z,yaw:o.yaw||0,w:x1-x0,d:z1-z0,height:o.height||.84});
 }
 for(const box of furnishings.boxes){if(box.asset!=='chairDesk'||(box.roomId==='I12'&&box.id.startsWith('fps-I12-sofa-')))continue;
  objects.push({id:box.id,source:'generated-chair',kind:'chair',roomId:box.roomId,x:box.x,z:box.z,yaw:box.angle||0,w:box.w,d:box.d,height:box.h||.94});
 }
 for(const f of furnishings.instances){if(!Number.isFinite(f.transform?.x)||!Number.isFinite(f.transform?.z))continue;
  if(f.roomId==='I12'&&f.prefab==='sofa')continue;
  const kind=({'meeting-table':'table','pantry-table':'table','sofa':'sofa','desk':'desk','storage':'cabinet','printer':'cabinet','plant-cabinet':'cabinet','lab-cart':'cabinet'})[f.prefab];
  if(!kind)continue;
  objects.push({id:f.id,source:'generated-group',kind,roomId:f.roomId,x:f.transform.x,z:f.transform.z,yaw:f.transform.yaw||0,w:f.footprint.w,d:f.footprint.d,height:kind==='cabinet'?1.3:kind==='sofa'?.78:.78});
 }
 const ids=new Set();for(const x of objects){if(ids.has(x.id))throw new Error('Duplicated furniture id: '+x.id);ids.add(x.id);}
 return objects.sort((a,b)=>a.roomId.localeCompare(b.roomId)||a.kind.localeCompare(b.kind)||a.id.localeCompare(b.id));
}
export function isChanged(current,baseline){return Math.hypot(current.x-baseline.x,current.z-baseline.z)>1e-4||Math.abs(normalizeAngle(current.yaw-baseline.yaw))>1e-4;}
export function validate(item,objects,data,original=null){
 const room=data.rooms.find(r=>r.id===item.roomId&&r.status==='included');
 if(!room)return 'Rummet är inte godkänt för möblering.';
 // A square chair turning around its existing anchor does not move its original
 // collision envelope. Do not block a rotation because the original approved
 // arrangement already placed that chair close to a table or a wall.
 if(original&&item.kind==='chair'&&Math.abs(item.w-item.d)<.05&&
    Math.hypot(item.x-original.x,item.z-original.z)<1e-4)return null;
 const pts=corners(item,.025);
 if(pts.some(p=>!inside(...p,room.polygon)))return 'Möbeln hamnar utanför rummet.';
 const blocked=[...data.excludedRooms,...data.rooms.filter(r=>r.status==='uncertain'),...data.obstacles.filter(o=>!EDITABLE_KINDS[o.kind])];
 if(blocked.some(b=>intersects(pts,b.polygon)))return 'Möbeln hamnar på en fast möbel eller spärrad yta.';
 for(const w of data.walls)if(segmentIntersectsRectangle(w.a,w.b,item,Math.max(.06,(w.thickness||.1)/2+.07)))return 'Möbeln krockar med en vägg eller glasvägg.';
 for(const d of data.doors){if(d.blocked||d.kind?.startsWith('open-passage'))continue;
  if(segmentIntersectsRectangle(d.a,d.b,item,.35))return 'Möbeln blockerar en dörröppning.';
 }
 for(const obj of objects){if(obj.id===item.id||obj.deleted)continue;
  if(obj.roomId!==item.roomId)continue;
  // Only guard newly introduced overlaps. Known approximate placement in the
  // reviewed baseline must not prevent rotating a chair in place.
  if(intersects(corners(item,.012),corners(obj,.012)) &&
   !(original&&obj.original&&intersects(corners(original,.012),corners(obj.original,.012))))return 'Möbeln överlappar en annan möbel.';
 }
 return null;
}
export function exportPatch(objects,baseline,{createdAt=new Date().toISOString()}={}){
 const base=new Map(baseline.map(o=>[o.id,o]));const placements=[],added=[],removed=[];
 for(const o of objects){const old=base.get(o.id);if(o.deleted){if(old)removed.push(o.id);continue;}
  const payload={id:o.id,roomId:o.roomId,kind:o.kind,x:round(o.x),z:round(o.z),yaw:round(normalizeAngle(o.yaw),6)};
  if(!old)added.push({...payload,w:round(o.w),d:round(o.d),height:round(o.height)});
  else if(isChanged(o,old))placements.push(payload);
 }
 for(const old of baseline)if(!objects.some(o=>o.id===old.id))removed.push(old.id);
 const sorted=(a,b)=>a.id.localeCompare(b.id);
 return {format:PATCH_FORMAT,schemaVersion:PATCH_SCHEMA,editorVersion:EDITOR_VERSION,
  source:{repository:'capstere/cartridge-strike',commit:BASE_COMMIT,version:GAME_VERSION},createdAt,
  placements:placements.sort(sorted),added:added.sort(sorted),removed:[...new Set(removed)].sort()};
}
export function parsePatch(document,baseline){
 if(!document||typeof document!=='object'||Array.isArray(document))throw Error('Filen innehåller inget giltigt möbelprojekt.');
 if(document.format!==PATCH_FORMAT||document.schemaVersion!==PATCH_SCHEMA)throw Error('Fel filformat: välj en export från Möbelstudion.');
 if(document.source?.commit!==BASE_COMMIT||document.source?.version!==GAME_VERSION||document.source?.repository!=='capstere/cartridge-strike')
  throw Error('Filen är skapad för en annan spelversion.');
 const b=new Map(baseline.map(o=>[o.id,o]));const items=baseline.map(o=>({...o,original:{...o}}));const get=new Map(items.map(o=>[o.id,o]));const seen=new Set();
 const placements=document.placements,added=document.added,removed=document.removed;
 if(!Array.isArray(placements)||!Array.isArray(added)||!Array.isArray(removed)||placements.length+added.length+removed.length>350)
  throw Error('För många eller felaktigt formaterade möbeländringar.');
 function inspect(p,isNew){
  if(!p||typeof p!=='object'||typeof p.id!=='string'||p.id.length>100||seen.has(p.id))throw Error('Ogiltigt eller dubblerat möbel-ID.');
  seen.add(p.id);
  if(![p.x,p.z,p.yaw].every(v=>typeof v==='number'&&Number.isFinite(v))||Math.abs(p.x)>100||Math.abs(p.z)>100||Math.abs(p.yaw)>100)
   throw Error('Ogiltiga koordinater eller rotationer.');
  if(typeof p.roomId!=='string'||p.roomId.length>20||typeof p.kind!=='string')throw Error('Felaktig möbeltyp.');
  if(isNew){if(!/^NY-(STOL|BORD|SOFFA)-\d{1,5}$/.test(p.id)||!['chair','table','sofa'].includes(p.kind)||![p.w,p.d,p.height].every(v=>typeof v==='number'&&Number.isFinite(v)&&v>.05&&v<4))
   throw Error('Ogiltig ny möbel.');
   const obj={...p,source:'added'};get.set(obj.id,obj);items.push(obj);
  }else{
   const obj=get.get(p.id);if(!obj||obj.kind!==p.kind||obj.roomId!==p.roomId)throw Error('Möbeln matchar inte aktuell spelplan: '+p.id);
   Object.assign(obj,{x:p.x,z:p.z,yaw:normalizeAngle(p.yaw)});
  }
 }
 placements.forEach(p=>inspect(p,false));added.forEach(p=>inspect(p,true));
 for(const id of removed){if(typeof id!=='string'||!b.has(id)||seen.has(id))throw Error('Ogiltig borttagen möbel.');seen.add(id);get.get(id).deleted=true;}
 return items;
}