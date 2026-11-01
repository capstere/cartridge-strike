/** Real source wall/window/frame geometry and door poses, without a second game loop. */
import * as T from '../../vendor/three/three.module.js';
import {sceneArchitectureData} from '../../src/fps/level-adapter.mjs?v=5.0.0';
import {createDoors} from '../../src/fps/doors.mjs?v=5.0.0';
import {paintDescription,surfaceColor} from './surface-style.mjs?v=5.0.0';
export function architecturePreview(project,scene,{lowWalls=false,openDoors=false,selected=null}={}){
 const root=new T.Group();root.name='studio-architecture';
 const {zones,walls,doors}=sceneArchitectureData(project,scene);
 const data={__custom:true,rooms:zones,corridors:[],floorPolygons:[],walls,doors,obstacles:[],excludedRooms:[],targets:[],routes:[]};
 const desc=paintDescription(globalThis.SpelWorldForLevel(data).build({doors:Object.fromEntries(doors.map(d=>[d.id,true]))}),data);
 const wallMap=new Map(walls.map(w=>[w.id,w])),sources=[...walls.map(w=>[w.id,w.sourceId]),...doors.map(d=>[d.id,d.id])].sort((a,b)=>b[0].length-a[0].length);
 const rgb=c=>Array.isArray(c)?new T.Color().setRGB(...c,T.SRGBColorSpace):new T.Color(c??'#eeeeee');
 function mesh(record,id){
  let h=record.h,y=record.y;const wall=wallMap.get(record.id);
  if(lowWalls&&wall?.surfaceType==='opaque'){h=Math.min(.8,h);y=h/2;}
  const glass=['glass','frosted'].includes(record.material),material=new T.MeshStandardMaterial({color:record.studioColor||rgb(record.color),roughness:record.material==='metal'?.35:.8,metalness:record.material==='metal'?.4:0,transparent:glass,opacity:glass?.28:1,depthWrite:!glass,side:T.DoubleSide});material.userData.studioOwned=true;
  const node=new T.Mesh(new T.BoxGeometry(record.w,h,record.d),material);node.position.set(record.x,y,record.z);node.rotation.y=record.angle||0;node.userData.editId=id;node.userData.architecturePart=record.id;root.add(node);
  if(id===selected){const line=new T.LineSegments(new T.EdgesGeometry(node.geometry),new T.LineBasicMaterial({color:0xf5a735}));line.material.userData.studioOwned=true;line.position.copy(node.position);line.rotation.copy(node.rotation);root.add(line);}
 }
 for(const b of desc.boxes){const source=sources.find(([key])=>b.id===key||b.id.startsWith(key+'-'));if(source)mesh(b,source[1]);}
 const system=createDoors(data,{staticCanOccupy:()=>true});
 for(const door of system.doors){system.pose(door,openDoors&&door.id===selected?Math.PI/3:0);for(const leaf of door.leaves){
  const b=leaf.box,color=door.studioColor||'#c4c3af';mesh({...b,color},door.id);
  // Handles, kickplate and panel follow the same hinge pose; no gameplay state is changed.
  const c=Math.cos(b.angle),s=Math.sin(b.angle),local=(x,z)=>({x:b.x+c*x+s*z,z:b.z-s*x+c*z});
  for(const side of [-1,1]){const at=local(leaf.w*.30,side*.065);mesh({id:b.id+'-handle'+side,...at,y:1.05,w:Math.min(.17,leaf.w*.3),h:.035,d:.04,angle:b.angle,color:'#87989e',material:'metal'},door.id);const kick=local(0,side*.044);mesh({id:b.id+'-kick'+side,...kick,y:.27,w:leaf.w*.88,h:.33,d:.009,angle:b.angle,color:'#87989e',material:'metal'},door.id);}
 }}
 for(const f of scene.floors){const shape=new T.Shape(),points=f.polygon||[[f.x0,f.z0],[f.x1,f.z0],[f.x1,f.z1],[f.x0,f.z1]];points.forEach(([x,z],i)=>i?shape.lineTo(x,z):shape.moveTo(x,z));shape.closePath();const material=new T.MeshStandardMaterial({color:surfaceColor(project,f),roughness:f.surface==='vinyl'?.48:.95,side:T.DoubleSide});material.userData.studioOwned=true;const node=new T.Mesh(new T.ShapeGeometry(shape),material);node.rotation.x=Math.PI/2;node.position.y=-.025;node.userData.editId=f.id;node.userData.architecturePart='floor';root.add(node);}
 return root;
}
