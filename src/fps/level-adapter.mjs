/** Pure conversion into the existing world/physics/navigation data contract. */
import {parseProject} from '../../furniture-editor/build/level-project.mjs';
import {wallPieces} from '../../furniture-editor/build/architecture.mjs';
import {corners} from '../../furniture-editor/core.mjs';

const polygon=r=>[[r.x0,r.z0],[r.x1,r.z0],[r.x1,r.z1],[r.x0,r.z1]];
const point=p=>({x:p.x,y:0,z:p.z,yaw:p.yaw||0});
const doorKind=k=>['door','card-door','elevator-door','terrace-door'].includes(k);
export function levelProjectToWorldData(input){
 const project=parseProject(input);
 if(project.mode!=='new-level')throw Error('Only a new-level project can be loaded as a separate FPS map');
 const floors=project.ground.floors,entries=project.architecture.added;
 const zones=floors.map(f=>({id:f.id,name:f.name,status:'included',surface:f.surface,polygon:polygon(f)}));
 const doors=entries.filter(e=>doorKind(e.kind)||e.kind==='opening').map(e=>({
  id:e.id,name:e.id,a:e.a,b:e.b,center:[(e.a[0]+e.b[0])/2,(e.a[1]+e.b[1])/2],
  width:Math.hypot(e.b[0]-e.a[0],e.b[1]-e.a[1]),kind:e.kind==='opening'?'open-passage-no-leaf':'door-aperture',
  status:'included',accessCardConfirmed:e.kind==='card-door',blocked:false,
  passageOpenConfirmed:e.kind==='opening',height:e.height,doorType:e.kind==='card-door'?'card':e.kind==='elevator-door'?'elevator':e.kind==='terrace-door'?'terrace':'ordinary',
  removed:false,lockedUntilImplemented:['elevator-door','terrace-door'].includes(e.kind)
 }));
 const wallIds=new Map();
 const walls=wallPieces(entries.map(e=>({...e,source:false}))).map(e=>({id:`${e.id}-${wallIds.set(e.id,(wallIds.get(e.id)||0)+1).get(e.id)}`,a:e.a,b:e.b,height:e.height,thickness:e.thickness,sill:e.sill,
  surfaceType:e.kind==='glazed'||e.kind==='window'?e.kind:'opaque'}));
 const obstacles=project.furniture.added.map(o=>({id:o.id,name:o.assetName||o.kind,
  polygon:corners(o),height:o.height,kind:o.kind,roomId:o.roomId,yaw:o.yaw}));
 const hints=project.navHints.length?project.navHints:doors.filter(d=>!d.blocked).map(d=>{
  const dx=d.b[0]-d.a[0],dz=d.b[1]-d.a[1],n=Math.hypot(dx,dz),x=d.center[0],z=d.center[1];
  return {id:'NH-'+d.id,points:[[x-dz/n*.7,z+dx/n*.7],[x,z],[x+dz/n*.7,z-dx/n*.7]]};
 });
 const routes=hints.map(h=>({id:h.id,name:h.note||h.id,role:'passage',doorIds:[],segments:[{points:h.points,status:'included'}]}));
 const g=project.gameplay,objectives=g.objectives;
 const anchors={analysts:g.spawns.filter(s=>s.team==='analysts').sort((a,b)=>a.index-b.index).map(point),
  counterAnalysts:g.spawns.filter(s=>s.team==='counterAnalysts').sort((a,b)=>a.index-b.index).map(point),
  bomb:objectives.bomb?{...point(objectives.bomb),radius:objectives.bomb.radius??1.1,roomId:objectives.bomb.roomId}:null,
  rescue:objectives.rescue?{...point(objectives.rescue),radius:objectives.rescue.radius??1.65,doorId:objectives.rescue.doorId}:null,
  hostages:objectives.hostages.map(point)};
 const data={__custom:true,rooms:zones.filter((_,i)=>floors[i].role==='room'),corridors:zones.filter((_,i)=>floors[i].role==='corridor'),
  excludedRooms:[],floorPolygons:zones.map(z=>z.polygon),walls,doors,obstacles,routes,
  targets:[objectives.bomb&&{id:'L1',name:'Bomb',point:[objectives.bomb.x,objectives.bomb.z]},objectives.rescue&&{id:'L2',name:'Rescue',point:[objectives.rescue.x,objectives.rescue.z]}].filter(Boolean),
  spawn:anchors.analysts[0]||{x:0,z:0,yaw:0},layoutPresentation:{},ground:project.ground};
 return {data,anchors,project};
}
