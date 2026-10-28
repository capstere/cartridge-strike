import {resolveProjectScene,writeProjectScene,floor5Baseline} from './build/project-scene.mjs';
import {inheritFloor5Gameplay} from '../src/fps/world.mjs';
import {wallAtPoint,planPaintOverWall} from './build/paint-over-wall.mjs';
import * as T from '../vendor/three/three.module.js';
import {exportProject,parseProject,parseProjectZip,exportProjectZip} from './build/level-project.mjs';
import {validateLevel} from './build/validate-level.mjs';
import {validate,corners,inside,segmentIntersectsRectangle,intersects} from './core.mjs';
import {wallPieces,standardPassageSpan,standardDoorMarkerSpan,isDoor} from './build/architecture.mjs';
import {LIBRARY_ALL} from './library/catalog.mjs';
import {proceduralOf} from './library/procedural.mjs';
import {populateProcedural} from './library/procedural-mesh.mjs';
import {proposeSmartPose} from './smart-placement.mjs';
import {addModelToGroup,importLocalGLB,getLocalFile,localLibrary} from './library/models.mjs';
import {assetHash} from './library/glb-utils.mjs';

const $=id=>document.getElementById(id),canvas=$('plan'),ctx=canvas.getContext('2d');
const mode=new URLSearchParams(location.search).get('mode')==='edit-floor5'?'edit-floor5':'new-level';
const STORAGE=mode==='edit-floor5'?'cartridge-floor5-level-v2':'cartridge-new-level-v2';let project,selected=null,tab='build',first=null,hover=null,drag=null,view='plan',zoom=1,offset={x:0,z:0},orbit=.65,history=[],future=[],localCatalog=[];
try{project=parseProject(localStorage.getItem(STORAGE)||'');if(project.mode!==mode)throw Error('mode');project=inheritFloor5Gameplay(project);}catch{project=inheritFloor5Gameplay(exportProject({mode,name:mode==='edit-floor5'?'Floor 5 – min version':'Min bana',projectId:'lvl-'+crypto.randomUUID().slice(0,12)}));if(mode==='edit-floor5'){try{const old=localStorage.getItem('cartridge-furniture-studio-0.17.0-v1');if(old)project=inheritFloor5Gameplay(parseProject(old));}catch{}}}
if(project.mode==='edit-floor5')project.ground.bounds={x0:-48,z0:-33,x1:52,z1:40};
let pendingFurniture=null,pendingYaw=0,drawGesture=null;
let sceneModel,sceneProject;function model(){if(sceneProject!==project){sceneProject=project;sceneModel=resolveProjectScene(project);}return sceneModel;}
const p=()=>project,arch=()=>model().entries,floors=()=>p().mode==='new-level'?p().ground.floors:model().floors,objects=()=>model().items,markers=()=>[...p().gameplay.spawns,...[p().gameplay.objectives.bomb,p().gameplay.objectives.rescue,...p().gameplay.objectives.hostages].filter(Boolean)];
const snap=n=>Math.round(n*10)/10,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const status=s=>$('status').textContent=s;
const floorAt=(x,z)=>floors().find(f=>inside(x,z,f.polygon||[[f.x0,f.z0],[f.x1,f.z0],[f.x1,f.z1],[f.x0,f.z1]]));
const nextId=prefix=>{let i=1;const ids=new Set([...floors(),...arch(),...objects()].map(o=>o.id));while(ids.has(prefix+String(i).padStart(4,'0')))i++;return prefix+String(i).padStart(4,'0');};
function commit(before){if(p().mode==='edit-floor5')writeProjectScene(p(),model());if(before===JSON.stringify(p()))return;history.push(before);if(history.length>60)history.shift();future=[];persist();redraw();}
function persist(){try{localStorage.setItem(p().mode==='edit-floor5'?'cartridge-floor5-level-v2':'cartridge-new-level-v2',JSON.stringify(p()));$('autosave').textContent='Ändringar sparade lokalt.';}catch{$('autosave').textContent='Lokal lagring är full. Spara ZIP nu.';}}
function point(e){const r=canvas.getBoundingClientRect(),b=p().ground.bounds,scale=Math.min(canvas.width/(b.x1-b.x0),canvas.height/(b.z1-b.z0))*zoom;
 return {x:snap(((e.clientX-r.left)*canvas.width/r.width-canvas.width/2)/scale+(b.x0+b.x1)/2-offset.x),z:snap(((e.clientY-r.top)*canvas.height/r.height-canvas.height/2)/scale+(b.z0+b.z1)/2-offset.z)};}
function screen(x,z){const b=p().ground.bounds,scale=Math.min(canvas.width/(b.x1-b.x0),canvas.height/(b.z1-b.z0))*zoom;
 return [canvas.width/2+(x-(b.x0+b.x1)/2+offset.x)*scale,canvas.height/2+(z-(b.z0+b.z1)/2+offset.z)*scale];}
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function find(x,z){for(const m of markers())if(dist(m,{x,z})<.35)return m;
 for(const o of objects())if(inside(x,z,corners(o)))return o;
 for(const a of arch()){
  const dx=a.b[0]-a.a[0],dz=a.b[1]-a.a[1],len=Math.hypot(dx,dz),t=clamp(((x-a.a[0])*dx+(z-a.a[1])*dz)/len**2,0,1);
  if(Math.hypot(x-a.a[0]-dx*t,z-a.a[1]-dz*t)<.18)return a;
 }
 return floors().find(f=>x>=f.x0&&x<=f.x1&&z>=f.z0&&z<=f.z1)||null;}
function makeFloor(a,b,role){const x0=Math.min(a.x,b.x),x1=Math.max(a.x,b.x),z0=Math.min(a.z,b.z),z1=Math.max(a.z,b.z);
 if(x1-x0<.5||z1-z0<.5||x1-x0>50||z1-z0>50)throw Error('Golvet måste vara 0,5–50 modellenheter på varje sida.');
 const id=nextId('BYGG-G-'),name=$('floorName').value.trim()||`${role==='room'?'Rum':'Korridor'} ${floors().length+1}`;
 const f={id,name,role,surface:$('surface').value,x0,z0,x1,z1};p().ground.floors.push(f);if(p().mode==='edit-floor5')model().floors.push({...f,polygon:[[x0,z0],[x1,z0],[x1,z1],[x0,z1]]});if(role==='room'){
  for(const [u,v] of [[ [x0,z0],[x1,z0] ],[[x1,z0],[x1,z1]],[[x1,z1],[x0,z1]],[[x0,z1],[x0,z0]]])makeSegment('wall',u,v);
 }return f;}
function makeSegment(kind,a,b){
 if(kind==='wall'&&arch().some(e=>e.kind==='wall'&&((dist({x:e.a[0],z:e.a[1]},{x:a[0],z:a[1]})<.01&&dist({x:e.b[0],z:e.b[1]},{x:b[0],z:b[1]})<.01)||(dist({x:e.b[0],z:e.b[1]},{x:a[0],z:a[1]})<.01&&dist({x:e.a[0],z:e.a[1]},{x:b[0],z:b[1]})<.01))))return arch().find(e=>e.kind==='wall');const len=Math.hypot(a[0]-b[0],a[1]-b[1]);if(len<.25||len>90)throw Error('Byggdelen måste vara 0,25–90 modellenheter lång.');
 const span=isDoor(kind)?standardPassageSpan(a,b):{a,b};
 const id=nextId(['wall','window','glazed'].includes(kind)?'BYGG-V-':'BYGG-D-'),entry={id,kind,...span,height:isDoor(kind)?2.4:2.85,thickness:.11,sill:Number($('sill').value)||.9,finish:'white'};
 arch().push(entry);return entry;}
function occupyData(){const zones=floors().map(f=>({id:f.id,status:'included',polygon:f.polygon||[[f.x0,f.z0],[f.x1,f.z0],[f.x1,f.z1],[f.x0,f.z1]]}));
 return {rooms:zones,excludedRooms:[],obstacles:model().fixed,walls:wallPieces(arch()),doors:arch().filter(a=>['door','card-door','opening'].includes(a.kind)).map(a=>({...a,blocked:false}))};}
function addFurniture(entry,x,z){const floor=floorAt(x,z);if(!floor)throw Error('Välj en punkt inuti en golvyta.');const id=nextId('NY-OBJ-');
 let item={id,roomId:floor.id,kind:'prop',assetId:entry.id,assetName:entry.name,x,z,yaw:pendingYaw,w:entry.width,d:entry.depth,height:entry.height};
 item={...item,...proposeSmartPose(item,{x,z},objects())};
 const issue=validate(item,objects(),occupyData(),null,{emptyFixed:true});if(issue)throw Error(issue);
 objects().push(item);if(entry.id.startsWith('local:')){
  if(!p().assets.local.some(a=>a.assetId===entry.id))p().assets.local.push({assetId:entry.id,file:`assets/models/${entry.id.slice(6)}.glb`,bytes:entry.byteCount||entry.size,license:'private, unverified'});
 }else if(!p().assets.library.includes(entry.id))p().assets.library.push(entry.id);
 selected=id;status(entry.name+' placerad. Dra objektet för att flytta det.');}
function placeMarker(kind,x,z){if(!floorAt(x,z))throw Error('Placera spelpunkter på ett golv.');const g=p().gameplay,o=g.objectives;
 if(['analysts','counterAnalysts'].includes(kind)){
  const subset=g.spawns.filter(s=>s.team===kind);if(subset.length>=5)throw Error('Fem spawns är redan placerade för laget. Flytta en markör i stället.');
  const index=subset.length,id=`SP-${kind==='analysts'?'A':'C'}-${String(index+1).padStart(2,'0')}`;g.spawns.push({id,team:kind,index,x,z,yaw:kind==='analysts'?0:Math.PI});selected=id;
 }else if(kind==='hostages'){
  if(o.hostages.length>=2)throw Error('Två gisslan finns redan. Flytta dem med musen.');
  const id='OBJ-H'+(o.hostages.length+1);o.hostages.push({id,x,z,yaw:0,roomId:floorAt(x,z).id});selected=id;
 }else{const id=kind==='bomb'?'OBJ-BOMB':'OBJ-RESCUE';o[kind]={id,x,z,radius:kind==='bomb'?1.1:1.65,roomId:floorAt(x,z).id};selected=id;}
}
function lookup(){return [...floors(),...arch(),...objects(),...markers()].find(o=>o.id===selected);}
function updateProps(){const o=lookup();$('selectedLabel').disabled=!o||!floors().some(f=>f.id===o.id)||!!o.source;$('selectedLabel').value=o?.name||'';$('selectedSurface').disabled=!o||!floors().includes(o)||!!o.source;$('selectedSurface').value=o?.surface||'carpet';$('selectedSill').disabled=!o||o.kind!=='window';$('selectedSill').value=o?.sill??.9;$('collisionSetting').hidden=!o||!objects().includes(o);$('collisionMode').value=o?.collision||'solid';$('selectionName').textContent=o?`${o.name||o.assetName||o.team||o.kind||o.role}`:'Ingenting';
 $('x').value=o?(o.x??o.x0??o.a?.[0]??''):'';$('z').value=o?(o.z??o.z0??o.a?.[1]??''):'';
 $('w').value=o?(o.w??(o.x1!==undefined?o.x1-o.x0:o.b?Math.hypot(o.b[0]-o.a[0],o.b[1]-o.a[1]):'')):'';
 $('d').value=o?(o.d??(o.z1!==undefined?o.z1-o.z0:'')):'';
 for(const id of ['x','z','w','d','remove','rotate','duplicate'])$(id).disabled=!o;
}
function rotateWithChildren(o,delta){const before=JSON.stringify(p()),c=Math.cos(delta),s=Math.sin(delta);for(const child of objects().filter(v=>v.mountId===o.id)){const dx=child.x-o.x,dz=child.z-o.z;child.x=o.x+c*dx+s*dz;child.z=o.z-s*dx+c*dz;child.yaw+=delta;}o.yaw=((o.yaw+delta+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;const issue=objects().includes(o)?validate(o,objects(),occupyData(),null,{emptyFixed:true}):null;if(issue){project=JSON.parse(before);status(issue);return false;}return true;}
function moveObject(o,x,z){if(arch().includes(o)){const dx=snap(x-o.a[0]),dz=snap(z-o.a[1]);o.a=[snap(o.a[0]+dx),snap(o.a[1]+dz)];o.b=[snap(o.b[0]+dx),snap(o.b[1]+dz)];return true;}const floor=floorAt(x,z);if(!floor)return false;
 if(o.kind&&objects().includes(o)){
  let candidate={...o,x,z,roomId:floor.id,...proposeSmartPose(o,{x,z},objects())};
  const issue=validate(candidate,objects(),occupyData(),null,{emptyFixed:true});if(issue){status(issue);return false;}
  const dx=candidate.x-o.x,dz=candidate.z-o.z;Object.assign(o,candidate);
  for(const child of objects().filter(c=>c.mountId===o.id)){child.x=snap(child.x+dx);child.z=snap(child.z+dz);}return true;
 }
 if(markers().includes(o)){o.x=x;o.z=z;if(o.roomId)o.roomId=floor.id;return true;}
 return false;}
canvas.addEventListener('pointerdown',e=>{if(view!=='plan'||e.button!==0)return;canvas.setPointerCapture(e.pointerId);const q=point(e),tool=tab==='build'?$('tool').value:tab==='play'?$('gameTool').value:'furnish';
 if(pendingFurniture){try{const before=JSON.stringify(p());addFurniture(pendingFurniture,q.x,q.z);commit(before);}catch(err){status(err.message);}return;}
 if(tool==='select'||tool==='furnish'){const hit=find(q.x,q.z);if(hit){selected=hit.id;drag={before:JSON.stringify(p()),start:q,hit,dx:q.x-(hit.x??hit.a?.[0]??q.x),dz:q.z-(hit.z??hit.a?.[1]??q.z)};redraw();return;}if(tool==='furnish'){status('Välj ett objekt i listan och klicka PLACERA.');return;}selected=null;redraw();return;}
 try{if(tab==='play'){const found=markers().find(m=>dist(m,q)<.35);if(found){selected=found.id;drag={before:JSON.stringify(p()),start:q,hit:found,dx:q.x-found.x,dz:q.z-found.z};redraw();return;}const before=JSON.stringify(p());placeMarker(tool,q.x,q.z);commit(before);return;}
  if(!first&&['door','card-door','opening','window','glazed'].includes(tool)){const nearest=wallAtPoint(arch(),[q.x,q.z],{radius:.4});if(nearest){const before=JSON.stringify(p()),w=nearest.wall,len=nearest.length,width=isDoor(tool)?1.2:Math.min(1.6,len),t=clamp(nearest.t,width/2/len,1-width/2/len),span=(v)=>w.a.map((n,i)=>n+(w.b[i]-n)*v);const plan=planPaintOverWall(arch(),w.id,span(t-width/2/len),span(t+width/2/len),tool,{posters:p().architecture.posters||[]});arch().splice(0,arch().length,...plan.entries.filter(e=>!e.deleted));p().architecture.posters=plan.posters;selected=plan.paintedId;const part=lookup();if(part&&tool==='window')part.sill=Number($('sill').value);commit(before);status('Infäst i väggen. Öppningen och fysiken uppdateras automatiskt.');return;}}
  if(!first){first=q;drawGesture={x:e.clientX,y:e.clientY,tool};status('Startpunkt vald. Klicka motsatt hörn eller slutpunkt.');redraw();return;}
  const before=JSON.stringify(p()),a=first;first=null;
  selected=tool==='room'||tool==='corridor'?makeFloor(a,q,tool).id:makeSegment(tool,[a.x,a.z],[q.x,q.z]).id;
  commit(before);status('Ritad. Välj nästa del eller byt verktyg.');
 }catch(err){first=null;status(err.message);redraw();}});
canvas.addEventListener('pointermove',e=>{if(view!=='plan')return;const q=point(e);$('coordinates').textContent=`X ${q.x.toFixed(1)} · Z ${q.z.toFixed(1)}`;
 if(drag){if(moveObject(drag.hit,snap(q.x-drag.dx),snap(q.z-drag.dz)))redraw();return;}hover=q;if(first||pendingFurniture)redraw();});
canvas.addEventListener('pointerup',e=>{if(drawGesture&&first&&Math.hypot(e.clientX-drawGesture.x,e.clientY-drawGesture.y)>6){const q=point(e),a=first,before=JSON.stringify(p());try{selected=['room','corridor'].includes(drawGesture.tool)?makeFloor(a,q,drawGesture.tool).id:makeSegment(drawGesture.tool,[a.x,a.z],[q.x,q.z]).id;first=null;commit(before);}catch(err){status(err.message);}}drawGesture=null;if(drag){commit(drag.before);drag=null;}});
canvas.addEventListener('contextmenu',e=>{e.preventDefault();const o=lookup();if(o?.yaw!==undefined){const before=JSON.stringify(p());rotateWithChildren(o,Math.PI/12);commit(before);}});
function drawPlan(){const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#e6efea';ctx.fillRect(0,0,canvas.width,canvas.height);
 const b=p().ground.bounds;ctx.strokeStyle='#bfd1ca';ctx.lineWidth=1;for(let x=b.x0;x<=b.x1;x++)for(let z=b.z0;z<=b.z1;z++){const [sx,sz]=screen(x,z);if(sx>=0&&sx<canvas.width&&sz>=0&&sz<canvas.height)ctx.fillRect(sx,sz,1,1);}
 for(const f of floors()){const poly=(f.polygon||[[f.x0,f.z0],[f.x1,f.z0],[f.x1,f.z1],[f.x0,f.z1]]).map(v=>screen(...v));ctx.beginPath();poly.forEach((v,i)=>i?ctx.lineTo(...v):ctx.moveTo(...v));ctx.closePath();ctx.fillStyle=f.surface==='vinyl'?'#d3e8e3':'#f3e4d0';ctx.fill();ctx.strokeStyle=selected===f.id?'#ed993a':'#adc3b8';ctx.lineWidth=selected===f.id?3:1;ctx.stroke();if(zoom>1||!f.source){ctx.fillStyle='#426367';ctx.font=`${12*dpr}px system-ui`;const [x,z]=screen(f.x0,f.z0);ctx.fillText(f.name,x+8,z+17*dpr);}}
 for(const e of [...wallPieces(arch()),...arch().filter(e=>isDoor(e.kind))]){const marker=isDoor(e.kind)?standardDoorMarkerSpan(e):e;const a=screen(...marker.a),b=screen(...marker.b);ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.lineWidth=selected===e.id?7:Math.max(3,5*dpr);ctx.strokeStyle=selected===e.id?'#f2a03e':({wall:'#bc5961',glazed:'#35aa8a',window:'#46a0c0',door:'#dc9b4f','card-door':'#dc9b4f',opening:'#fff'}[e.kind]);ctx.stroke();}
 for(const o of objects()){const pts=corners(o).map(v=>screen(...v));ctx.beginPath();pts.forEach((v,i)=>i?ctx.lineTo(...v):ctx.moveTo(...v));ctx.closePath();ctx.fillStyle=selected===o.id?'#ffc874':'#5a7e88';ctx.fill();ctx.strokeStyle='#233e4a';ctx.stroke();}
 for(const m of markers()){const [x,z]=screen(m.x,m.z);ctx.beginPath();ctx.arc(x,z,selected===m.id?12*dpr:9*dpr,0,Math.PI*2);ctx.fillStyle=m.team==='analysts'?'#298bb7':m.team==='counterAnalysts'?'#d5684d':m.id.includes('BOMB')?'#dfb03e':m.id.includes('RESCUE')?'#41b89a':'#bf78b5';ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#16343b';ctx.font=`bold ${10*dpr}px system-ui`;ctx.fillText(m.team?String(m.index+1):m.id.includes('H')?'H':m.id.includes('BOMB')?'B':'R',x+11*dpr,z);}
 if($('showPhysics').checked){ctx.save();ctx.strokeStyle='#d42f52';ctx.lineWidth=3*dpr;ctx.setLineDash([5,3]);for(const w of wallPieces(arch())){ctx.beginPath();ctx.moveTo(...screen(...w.a));ctx.lineTo(...screen(...w.b));ctx.stroke();}for(const o of objects().filter(o=>o.collision!=='none')){const pts=corners(o).map(v=>screen(...v));ctx.beginPath();pts.forEach((v,i)=>i?ctx.lineTo(...v):ctx.moveTo(...v));ctx.closePath();ctx.stroke();}ctx.restore();}
 if(pendingFurniture&&hover){let ghost={id:'ghost',kind:'prop',assetId:pendingFurniture.id,x:hover.x,z:hover.z,yaw:pendingYaw,w:pendingFurniture.width,d:pendingFurniture.depth,height:pendingFurniture.height,roomId:floorAt(hover.x,hover.z)?.id};ghost={...ghost,...proposeSmartPose(ghost,hover,objects())};const issue=validate(ghost,objects(),occupyData(),null,{emptyFixed:true}),pts=corners(ghost).map(v=>screen(...v));ctx.beginPath();pts.forEach((v,i)=>i?ctx.lineTo(...v):ctx.moveTo(...v));ctx.closePath();ctx.fillStyle=issue?'#db526677':'#36b98b88';ctx.fill();ctx.strokeStyle=issue?'#bd3048':'#14785b';ctx.lineWidth=2*dpr;ctx.stroke();}
 if(first&&hover){const a=screen(first.x,first.z),b=screen(hover.x,hover.z);ctx.beginPath();if(['room','corridor'].includes($('tool').value))ctx.rect(a[0],a[1],b[0]-a[0],b[1]-a[1]);else{ctx.moveTo(...a);ctx.lineTo(...b);}ctx.setLineDash([7,5]);ctx.lineWidth=2;ctx.strokeStyle='#106f79';ctx.stroke();ctx.setLineDash([]);}
}
const scene=new T.Scene();scene.background=new T.Color(0xd9e8e4);const camera=new T.PerspectiveCamera(55,1,.1,250);const renderer=new T.WebGLRenderer({canvas:$('scene3d'),antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));scene.add(new T.HemisphereLight(0xffffff,0x819a97,2.2));const sun=new T.DirectionalLight(0xffffff,2);sun.position.set(5,15,6);scene.add(sun);const group=new T.Group();scene.add(group);
function box(x,y,z,w,h,d,color,angle=0,opacity=1){const material=new T.MeshStandardMaterial({color,transparent:opacity<1,opacity,side:T.DoubleSide});material.userData.studioOwned=true;const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.rotation.y=angle;group.add(mesh);return mesh;}
function draw3D(){group.traverse(o=>{if(o.isMesh){o.geometry?.dispose();if(o.material?.userData?.studioOwned)o.material.dispose();}});group.clear();
 for(const f of floors()){const shape=new T.Shape(),poly=f.polygon||[[f.x0,f.z0],[f.x1,f.z0],[f.x1,f.z1],[f.x0,f.z1]];poly.forEach(([x,z],i)=>i?shape.lineTo(x,z):shape.moveTo(x,z));shape.closePath();const m=new T.MeshStandardMaterial({color:f.surface==='vinyl'?0xb7d6d0:0xd8cbbb,side:T.DoubleSide});m.userData.studioOwned=true;const mesh=new T.Mesh(new T.ShapeGeometry(shape),m);mesh.rotation.x=Math.PI/2;mesh.position.y=-.025;group.add(mesh);}
 for(const e of wallPieces(arch())){const dx=e.b[0]-e.a[0],dz=e.b[1]-e.a[1],len=Math.hypot(dx,dz),angle=-Math.atan2(dz,dx),x=(e.a[0]+e.b[0])/2,z=(e.a[1]+e.b[1])/2;
  if(e.kind==='window'){box(x,e.sill/2,z,len,e.sill,e.thickness,0xc1d0d0,angle);box(x,(e.sill+e.height)/2,z,len,e.height-e.sill,.04,0x7ec4d2,angle,.38);}
  else {const h=$('cutaway').checked&&e.kind==='wall'?Math.min(.8,e.height):e.height;box(x,h/2,z,len,h,e.thickness,e.kind==='glazed'?0x82d5c5:0xb6c2bf,angle,e.kind==='glazed'?.4:1);}
 }
 for(const d of arch().filter(e=>isDoor(e.kind)&&e.kind!=='opening')){const len=Math.hypot(d.b[0]-d.a[0],d.b[1]-d.a[1]),angle=-Math.atan2(d.b[1]-d.a[1],d.b[0]-d.a[0])+Math.PI/5;box(d.a[0]+Math.cos(angle)*len/2,.45,d.a[1]-Math.sin(angle)*len/2,len,.9,.06,0xcc9d61,angle);}
 for(const o of objects()){const holder=new T.Group();holder.position.set(o.x,o.elevation||0,o.z);holder.rotation.y=o.yaw||0;holder.userData.editId=o.id;group.add(holder);
  const put=(x,y,z,w,h,d,m)=>{const material=typeof m==='number'?new T.MeshStandardMaterial({color:m}):m;if(typeof m==='number')material.userData.studioOwned=true;const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);holder.add(mesh);return mesh;};
  if(proceduralOf(o))populateProcedural(o,holder,put);
  else if(o.assetId)addModelToGroup(o,holder,()=>renderer.render(scene,camera));
  else put(0,o.height/2,0,o.w,o.height,o.d,0x587e8a);
 }
 const b=p().ground.bounds,span=Math.max(b.x1-b.x0,b.z1-b.z0),cx=(b.x0+b.x1)/2,cz=(b.z0+b.z1)/2;
 camera.position.set(cx+Math.sin(orbit)*span*.75,span*.72,cz+Math.cos(orbit)*span*.75);camera.lookAt(cx,0,cz);
 const r=$('scene3d').getBoundingClientRect();renderer.setSize(Math.max(1,r.width),Math.max(1,r.height),false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();renderer.render(scene,camera);
}
function redraw(){$('modeLabel').textContent=p().mode==='edit-floor5'?'DESIGNSTUDION / FLOOR 5':'DESIGNSTUDION / NY BANA';updateProps();$('undo').disabled=!history.length;$('redo').disabled=!future.length;if(view==='plan')drawPlan();else draw3D();}
function switchTab(t){tab=t;pendingFurniture=null;for(const b of document.querySelectorAll('[data-tab]'))b.classList.toggle('active',b.dataset.tab===t);for(const s of document.querySelectorAll('[data-panel]'))s.hidden=s.dataset.panel!==t;first=null;redraw();}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));
function renderCatalog(){const list=$('catalog'),query=$('catalogSearch').value.toLowerCase();list.replaceChildren();for(const entry of [...LIBRARY_ALL,...localCatalog].filter(e=>e.name.toLowerCase().includes(query))){const opt=document.createElement('option');opt.value=entry.id;opt.textContent=entry.name+' · '+entry.category;list.append(opt);}if(list.options.length)list.selectedIndex=0;}
$('selectedSurface').onchange=()=>{const o=lookup();if(!o||o.source)return;const before=JSON.stringify(p());o.surface=$('selectedSurface').value;commit(before);};$('selectedSill').onchange=()=>{const o=lookup();if(!o||o.kind!=='window')return;const value=Number($('selectedSill').value);if(!Number.isFinite(value)||value<0||value>o.height-.15)return;const before=JSON.stringify(p());o.sill=value;commit(before);};
$('cutaway').onchange=redraw;$('showPhysics').onchange=redraw;$('selectedLabel').onchange=()=>{const o=lookup();if(!o||o.source)return;const before=JSON.stringify(p());o.name=$('selectedLabel').value.slice(0,60);commit(before);};
$('catalogSearch').oninput=renderCatalog;
for(const button of document.querySelectorAll('[data-tool]'))button.onclick=()=>{pendingFurniture=null;first=null;$('tool').value=button.dataset.tool;for(const b of document.querySelectorAll('[data-tool]'))b.classList.toggle('active',b===button);status(button.title);redraw();};
$('placeFurniture').onclick=()=>{pendingFurniture=[...LIBRARY_ALL,...localCatalog].find(e=>e.id===$('catalog').value);first=null;if(pendingFurniture)status('Placera '+pendingFurniture.name+' genom att klicka på golvet. R vrider, Esc avslutar.');redraw();};
$('glb').onchange=async e=>{try{for(const file of e.target.files){const entry=await importLocalGLB(file);localCatalog.push(entry);}renderCatalog();status('Egna GLB-filer tillagda i biblioteket.');}catch(err){status(err.message);}e.target.value='';};
$('doorInWall').onclick=()=>{const wall=arch().find(e=>e.id===selected&&['wall','window','glazed'].includes(e.kind));if(!wall){status('Markera en vägg i planen först.');return;}
 try{const len=Math.hypot(wall.b[0]-wall.a[0],wall.b[1]-wall.a[1]);if(len<1.45)throw Error('Väggen måste vara minst 1,45 enheter för en standarddörr på 1,20.');const before=JSON.stringify(p());selected=makeSegment('door',wall.a,wall.b).id;commit(before);status('Standarddörr 1,20 ritad mitt i väggen. Kollisionen klipps automatiskt.');}catch(err){status(err.message);}};
$('collisionMode').onchange=()=>{const o=lookup();if(!o||!objects().includes(o))return;
 const before=JSON.stringify(p());o.collision=$('collisionMode').value;commit(before);
 status(o.collision==='none'?'Möbeln är dekorativ: ingen gångkollision i FPS.':'Möbeln blockerar spelare i FPS.');};
$('newBlank').onclick=()=>{if(!window.confirm('Töm hela NY BANA? Ångra med Ctrl+Z innan du laddar om sidan.'))return;
 const before=JSON.stringify(p()),v=p();
 project=exportProject({projectId:v.projectId,name:v.name,ground:{...v.ground,floors:[]},createdAt:v.createdAt});
 selected=null;first=null;hover=null;drag=null;commit(before);
 status('Tom värld. Rita golv, väggar och öppningar. Kollision skapas automatiskt.');};
$('remove').onclick=()=>{const o=lookup();if(!o)return;if(o.source&&o.polygon){status('Floor 5:s ursprungliga golv bevaras. Ändra väggar eller lägg till nya golvytor.');return;}const before=JSON.stringify(p());for(const list of [p().ground.floors,arch(),objects(),p().gameplay.spawns,p().gameplay.objectives.hostages]){const i=list.indexOf(o);if(i>=0)list.splice(i,1);}
 for(const key of ['bomb','rescue'])if(p().gameplay.objectives[key]===o)p().gameplay.objectives[key]=null;
 if(objects().includes(o)===false)for(const child of objects().filter(x=>x.mountId===o.id)){child.mountId=null;child.elevation=0;}
 p().assets.local=p().assets.local.filter(a=>objects().some(item=>item.assetId===a.assetId));
 selected=null;if(p().mode==='edit-floor5')model().floors=model().floors.filter(f=>f.source||p().ground.floors.some(g=>g.id===f.id));commit(before);};
$('duplicate').onclick=()=>{const o=lookup();if(!o||!objects().includes(o))return;try{const before=JSON.stringify(p()),copy={...o,id:nextId('NY-OBJ-'),x:snap(o.x+.5),mountId:o.mountId||undefined};const issue=validate(copy,objects(),occupyData(),null,{emptyFixed:true});if(issue)throw Error(issue);objects().push(copy);selected=copy.id;commit(before);}catch(e){status(e.message);}};
$('rotate').onclick=()=>{const o=lookup();if(o?.yaw===undefined)return;const before=JSON.stringify(p());rotateWithChildren(o,Math.PI/12);commit(before);};
for(const id of ['x','z','w','d'])$(id).onchange=()=>{const o=lookup(),value=Number($(id).value);if(!o||!Number.isFinite(value))return;const before=JSON.stringify(p());
 if(objects().includes(o)){if(id==='x'||id==='z'){if(!moveObject(o,id==='x'?value:o.x,id==='z'?value:o.z)){redraw();return;}}else{o[id]=value;const issue=validate(o,objects(),occupyData(),null,{emptyFixed:true});if(issue){project=JSON.parse(before);status(issue);redraw();return;}}}
 else if(markers().includes(o)){if(id==='x'||id==='z')moveObject(o,id==='x'?value:o.x,id==='z'?value:o.z);}
 else if(floors().includes(o)&&['w','d'].includes(id)){o[id==='w'?'x1':'z1']=o[id==='w'?'x0':'z0']+value;}
 else if(arch().includes(o)&&['x','z'].includes(id)){const axis=id==='x'?0:1,delta=value-o.a[axis];o.a[axis]+=delta;o.b[axis]+=delta;}
 else if(arch().includes(o)&&id==='w'&&isDoor(o.kind)){
  try{const span=standardPassageSpan(o.a,o.b,value);o.a=span.a;o.b=span.b;}
  catch(e){status(e.message);redraw();return;}
 }
 commit(before);};
$('undo').onclick=()=>{if(!history.length)return;future.push(JSON.stringify(p()));project=JSON.parse(history.pop());persist();redraw();};
$('redo').onclick=()=>{if(!future.length)return;history.push(JSON.stringify(p()));project=JSON.parse(future.pop());persist();redraw();};
document.addEventListener('keydown',e=>{if(e.key==='Escape'){first=null;drag=null;pendingFurniture=null;redraw();}if(e.key.toLowerCase()==='r'&&pendingFurniture){pendingYaw+=Math.PI/2;redraw();}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();$('undo').click();}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();$('redo').click();}});
for(const id of ['name','width','depth'])$(id).onchange=()=>{const before=JSON.stringify(p());if(id==='name')p().name=$('name').value.trim()||'Min bana';else{
  const n=clamp(Number($(id).value),8,100),b=p().ground.bounds;if(id==='width')b.x1=b.x0+n;else b.z1=b.z0+n;}
 try{project=parseProject(p());commit(before);}catch(e){project=JSON.parse(before);status(e.message);redraw();}};
$('check').onclick=()=>{try{const result=validateLevel(p(),{engine:true});p().validation=result;persist();$('results').innerHTML='';const title=document.createElement('strong');title.className=result.summary.playable?'pass':'error';title.textContent=result.summary.playable?'SPELBAR I MOTORN':`${result.summary.errors} fel · ${result.summary.warnings} varningar`;const list=document.createElement('div');list.textContent=result.results.map(r=>`${r.status==='fail'?'✕':r.status==='warn'?'⚠':'✓'} ${r.check} ${r.id||''}: ${r.detail}${r.fix?' → '+r.fix:''}`).join('\n');$('results').append(title,list);status(result.summary.playable?'Motorns fysik och navigering godkände banan.':'Rätta markerade fel och kontrollera igen.');}catch(e){status(e.message);}};
function download(bytes,name,type){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([bytes],{type}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}
$('saveJson').onclick=()=>{try{const doc=parseProject(p());download(JSON.stringify(doc,null,2)+'\n',p().projectId+'.json','application/json');status(p().assets.local.length?'JSON sparad. Använd ZIP för att också ta med egna modeller.':'Hela banprojektet sparat som JSON.');}catch(e){status(e.message);}};
$('save').onclick=async()=>{try{const files=new Map(),local=[];for(const id of new Set(objects().map(o=>o.assetId).filter(x=>x?.startsWith('local:')))){
  const row=await getLocalFile(id);if(!row?.data)throw Error('Egen GLB saknas: '+id);const bytes=new Uint8Array(row.data),file=`assets/models/${id.slice(6)}.glb`;
  if(await assetHash(bytes)!==id.slice(6))throw Error('GLB-hash stämmer inte.');files.set(file,bytes);local.push({assetId:id,file,bytes:bytes.length,license:'private, unverified'});
 }p().assets.local=local;const report=validateLevel(p(),{engine:true});p().validation=report;const bytes=await exportProjectZip(p(),files);
  download(bytes,p().projectId+'.zip','application/zip');persist();status('ZIP sparad med projekt och lokala tillgångar. '+(report.summary.playable?'Banan är spelbar.':'Banan har ännu fel.'));
 }catch(e){status('Kunde inte spara: '+e.message);}};
$('open').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{let incoming,files=new Map();if(file.name.toLowerCase().endsWith('.zip'))({project:incoming,files}=await parseProjectZip(await file.arrayBuffer()));else incoming=parseProject(await file.text());
  for(const [path,bytes] of files)if(path.endsWith('.glb'))await importLocalGLB(new File([bytes],path.split('/').at(-1),{type:'model/gltf-binary'}));
  for(const asset of incoming.assets.local)if(!await getLocalFile(asset.assetId))throw Error('Egen GLB saknas. Öppna ZIP-filen i stället.');
  project=inheritFloor5Gameplay(incoming);history=[];future=[];selected=null;first=null;$('name').value=p().name;$('width').value=p().ground.bounds.x1-p().ground.bounds.x0;$('depth').value=p().ground.bounds.z1-p().ground.bounds.z0;
  localCatalog=await localLibrary();for(const entry of localCatalog)entry.size=(await getLocalFile(entry.id))?.size;renderCatalog();persist();redraw();status('Projektet öppnat. Kontrollera spelbarhet före provspelning.');
 }catch(err){status('Kunde inte öppna: '+err.message);}e.target.value='';};
$('preview').onclick=()=>{try{const report=validateLevel(p(),{engine:true});p().validation=report;if(!report.summary.playable)throw Error('Åtgärda '+report.summary.errors+' fel innan provspelning.');localStorage.setItem('cartridge-level-preview',JSON.stringify(p()));window.open('../fps/?level=preview','_blank','noopener');status('Privat provspelning öppnad från aktuellt projekt.');}catch(e){status(e.message);}};
$('demo').onclick=async()=>{try{const response=await fetch('../levels/synthetic-demo.json');if(!response.ok)throw Error('Demobanan saknas.');const before=JSON.stringify(p());project=parseProject(await response.text());$('name').value=p().name;commit(before);status('Syntetisk testbana öppnad. Den är separat från ditt sparade projekt.');}catch(e){status(e.message);}};
$('planView').onclick=()=>{view='plan';canvas.hidden=false;$('scene3d').hidden=true;$('planView').classList.add('active');$('threeView').classList.remove('active');redraw();};
$('threeView').onclick=()=>{view='3d';canvas.hidden=true;$('scene3d').hidden=false;$('threeView').classList.add('active');$('planView').classList.remove('active');redraw();};
$('fit').onclick=()=>{zoom=1;offset={x:0,z:0};redraw();};
canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=clamp(zoom*(e.deltaY<0?1.1:.9),.5,6);redraw();},{passive:false});
let pan=null,drag3d=null;
const ray3d=new T.Raycaster(),groundPlane=new T.Plane(new T.Vector3(0,1,0),0);
function hit3d(e){const r=$('scene3d').getBoundingClientRect();ray3d.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);const v=new T.Vector3();return ray3d.ray.intersectPlane(groundPlane,v)?{x:snap(v.x),z:snap(v.z)}:null;}
$('scene3d').addEventListener('pointerdown',e=>{const q=hit3d(e);if(!q)return;$('scene3d').setPointerCapture(e.pointerId);if(pendingFurniture){try{const before=JSON.stringify(p());addFurniture(pendingFurniture,q.x,q.z);commit(before);}catch(err){status(err.message);}return;}
 const hit=ray3d.intersectObjects(group.children,true).find(h=>{let o=h.object;while(o&&!o.userData.editId)o=o.parent;return !!o?.userData.editId;});
 if(hit&&e.button===0){let node=hit.object;while(node&&!node.userData.editId)node=node.parent;selected=node.userData.editId;const item=lookup();drag3d={item,before:JSON.stringify(p()),dx:q.x-item.x,dz:q.z-item.z};redraw();}else pan=e.clientX;});
$('scene3d').addEventListener('pointermove',e=>{if(drag3d){const q=hit3d(e);if(q&&moveObject(drag3d.item,snap(q.x-drag3d.dx),snap(q.z-drag3d.dz)))redraw();return;}if(pan===null)return;orbit+=(e.clientX-pan)*.005;pan=e.clientX;const b=p().ground.bounds,span=Math.max(b.x1-b.x0,b.z1-b.z0),cx=(b.x0+b.x1)/2,cz=(b.z0+b.z1)/2;camera.position.set(cx+Math.sin(orbit)*span*.75,span*.72,cz+Math.cos(orbit)*span*.75);camera.lookAt(cx,0,cz);renderer.render(scene,camera);});
$('scene3d').addEventListener('pointerup',()=>{pan=null;if(drag3d){commit(drag3d.before);drag3d=null;}});
new ResizeObserver(redraw).observe(canvas.parentElement);
$('name').value=p().name;$('width').value=p().ground.bounds.x1-p().ground.bounds.x0;$('depth').value=p().ground.bounds.z1-p().ground.bounds.z0;
localCatalog=await localLibrary().catch(()=>[]);for(const entry of localCatalog)entry.size=(await getLocalFile(entry.id))?.size;renderCatalog();redraw();
window.__levelStudio={get scene(){return model()},get project(){return p()},get validation(){return validateLevel(p(),{engine:true})},select:id=>{selected=id;redraw();},
 screenWorldPoint:(x,z)=>{const [sx,sz]=screen(x,z),r=canvas.getBoundingClientRect();return {x:r.left+sx*r.width/canvas.width,y:r.top+sz*r.height/canvas.height};},redraw};
