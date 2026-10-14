import '../floor5-data.js';
import '../world.js';
import { createPhysics, ACTOR_RADIUS, insidePolygon, distanceSegment } from './physics.mjs';
import { createNavigation } from './navigation.mjs';
import { createFurnishings } from './furnishings.mjs';
import { createTacticalMap } from './tactical-map.mjs';

let sharedWorld;
const flatPoint=p=>({x:p[0],y:0,z:p[1]});

export function createWorld({fresh=false}={}){
  if(sharedWorld&&!fresh)return sharedWorld;
  const source=globalThis.SpelWorld,data=source.data;
  const inherited=source.build({doors:{D06:true,D08:true}});
  const furnishings=createFurnishings(data,inherited,{inside:insidePolygon,distanceSegment});
  const description={...inherited,boxes:[...inherited.boxes,...furnishings.boxes],surfaces:[...inherited.surfaces],labels:[...inherited.labels.map(l=>({...l,text:l.text.replace(' · PASSERKORT',' · OPEN')})),...furnishings.labels],furnishings:furnishings.instances};
  const physics=createPhysics(description,data);
  const navigation=createNavigation(data,physics);
  const roomAt=(x,z)=>data.rooms.find(r=>r.status!=='uncertain'&&insidePolygon(x,z,r.polygon))||data.corridors.find(r=>insidePolygon(x,z,r.polygon))||null;
  function freeGroup(target,count,{roomId=null,range=4,separation=.95,yaw=0}={}){
    const room=roomId?data.rooms.find(r=>r.id===roomId):null,candidates=[];
    const add=(x,z)=>{if((!room||insidePolygon(x,z,room.polygon))&&physics.canOccupy(x,z,ACTOR_RADIUS+.015))candidates.push({x,y:0,z,yaw});};
    add(target.x,target.z);
    for(let x=target.x-range;x<=target.x+range;x+=.25)for(let z=target.z-range;z<=target.z+range;z+=.25)if(Math.hypot(x-target.x,z-target.z)<=range)add(x,z);
    candidates.sort((a,b)=>Math.hypot(a.x-target.x,a.z-target.z)-Math.hypot(b.x-target.x,b.z-target.z));
    const selected=[];
    for(const p of candidates){if(selected.every(q=>Math.hypot(p.x-q.x,p.z-q.z)>=separation)&&navigation.nearest(p)){selected.push(p);if(selected.length===count)return selected;}}
    throw new Error(`No ${count} free connected positions near ${roomId||'D06'}`);
  }
  const labTarget=id=>flatPoint(data.targets.find(t=>t.id===id).point);
  const d06=data.doors.find(d=>d.id==='D06');
  const counterOrigin={x:d06.center[0]-1.55,z:d06.center[1]-.18};
  const analysts=freeGroup(labTarget('L2'),5,{roomId:'I02',yaw:-Math.PI/2});
  const counterAnalysts=freeGroup(counterOrigin,5,{roomId:'I31',yaw:Math.PI/2,range:2.5});
  const bomb={...freeGroup(labTarget('L1'),1,{roomId:'I01'})[0],radius:1.10,roomId:'I01'};
  const hostageRoute=data.routes.find(r=>r.id==='S16').segments.at(-1).points.at(-1);
  const hostages=freeGroup(flatPoint(hostageRoute),2,{roomId:'I12',separation:.85,yaw:Math.PI/2}).map(p=>({...p,roomId:'I12'}));
  const rescue={...counterAnalysts[0],radius:1.65,doorId:'D06'};
  const anchors={analysts,counterAnalysts,bomb,hostages,rescue};
  const tactical=createTacticalMap(data,physics,navigation,anchors);
  for(const point of [...analysts,...counterAnalysts,bomb,...hostages])if(!navigation.findPath(point,rescue).length)throw new Error(`Disconnected FPS anchor at ${point.x},${point.z}`);
  description.labels.push(
    {text:'GX LAB 5 · I01\nCARTRIDGE SITE',x:bomb.x,y:.025,z:bomb.z,yaw:0,width:1.8,height:.50,color:'#ffd580',accent:'#624821',floor:true},
    {text:'D06 · RESCUE / BUY',x:rescue.x,y:.025,z:rescue.z,yaw:0,width:2,height:.48,color:'#92e8e4',accent:'#164b53',floor:true}
  );
  const materialAt=(x,z)=>{const r=roomAt(x,z);return r&&(['I01','I02','I03','I04','I29'].includes(r.id)||/RESTROOM|STÄD|PENTRY/.test(r.name))?'vinyl':'carpet';};
  const world={description,data,anchors,tactical,furnishings,roomAt,materialAt,...physics,findPath:navigation.findPath,navigation,statistics:{...physics.statistics,navigation:navigation.statistics,furnishings:furnishings.instances.length}};
  if(!fresh)sharedWorld=world;
  return world;
}

export { ACTOR_RADIUS } from './physics.mjs';
