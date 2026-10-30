import {makePoster,locatePoster} from './build/posters.mjs';
import {createCurtain,createBlind,treatmentPosition} from './build/treatments.mjs';
import {buildProjectFurniture,buildProjectDecorations} from './build/project-visuals.mjs?v=3.5.0';
import {resolveProjectScene,writeProjectScene,floor5Baseline,projectWallPieces} from './build/project-scene.mjs';
import {inheritFloor5Gameplay} from '../src/fps/world.mjs?v=3.5.0';
import {wallAtPoint,planPaintOverWall} from './build/paint-over-wall.mjs';
import {planResizeFloor,planResizeFloorEdge,planSlideInsert,planMoveWallEnd,roomBoundaryIds} from './build/direct-manipulation.mjs?v=4.3.0';
import {parsePosters} from './build/posters.mjs';
import {parseTreatments} from './build/treatments.mjs';
import * as T from '../vendor/three/three.module.js';
import {exportProject,parseProject,parseProjectZip,exportProjectZip} from './build/level-project.mjs?v=3.6.0';
import {validateLevel} from './build/validate-level.mjs?v=3.5.0';
import {validate,corners,inside,segmentIntersectsRectangle,intersects} from './core.mjs';
import {wallPieces,standardPassageSpan,standardDoorMarkerSpan,isDoor} from './build/architecture.mjs';
import {LIBRARY_ALL} from './library/catalog.mjs?v=3.7.0';
import {upgradeLegacyOrangeChair} from './library/procedural.mjs?v=3.5.0';
import {proposeSmartPose,duplicateFurnitureAssembly} from './smart-placement.mjs';
import {findNearbyFreePlacement} from './soft-placement.mjs';
import {importLocalGLB,getLocalFile,localLibrary} from './library/models.mjs';
import {assetHash} from './library/glb-utils.mjs';
import {installSelectionDock} from './selection-dock.mjs';
import {planAdjacentRoom,ADJACENT_SIDES} from './adjacent-room.mjs';

const $=id=>document.getElementById(id),canvas=$('plan'),ctx=canvas.getContext('2d');
const catalogEntries=LIBRARY_ALL;
const correctOldOrangeChair=doc=>(upgradeLegacyOrangeChair(doc),doc);
const mode=new URLSearchParams(location.search).get('mode')==='edit-floor5'?'edit-floor5':'new-level';
const STORAGE=mode==='edit-floor5'?'cartridge-floor5-level-v2':'cartridge-new-level-v2';let project,selected=null,tab='build',first=null,hover=null,drag=null,view='plan',zoom=1,offset={x:0,z:0},orbit=.65,history=[],future=[],localCatalog=[];
try{project=parseProject(localStorage.getItem(STORAGE)||'');if(project.mode!==mode)throw Error('mode');project=inheritFloor5Gameplay(correctOldOrangeChair(project));}catch{project=inheritFloor5Gameplay(exportProject({mode,name:mode==='edit-floor5'?'Floor 5 – min version':'Min bana',projectId:'lvl-'+crypto.randomUUID().slice(0,12)}));if(mode==='edit-floor5'){try{const old=localStorage.getItem('cartridge-furniture-studio-0.17.0-v1');if(old)project=inheritFloor5Gameplay(parseProject(old));}catch{}}}
if(project.mode==='edit-floor5')project.ground.bounds={x0:-48,z0:-33,x1:52,z1:40};
let roomPreview=null,pendingFurniture=null,pendingTemplate=null,pendingYaw=0,drawGesture=null,planPan=null,spaceHeld=false,view3dZoom=1,view3dCenter=null;
let gameLook=false,gameLookTimer=0,walkReturnView='plan',walkReturnLook=false,walkPose=null;
let sceneModel,sceneProject;function model(){if(sceneProject!==project){sceneProject=project;sceneModel=resolveProjectScene(project);}return sceneModel;}
const p=()=>project,arch=()=>model().entries,floors=()=>p().mode==='new-level'?p().ground.floors:model().floors,objects=()=>model().items,markers=()=>[...p().gameplay.spawns,...[p().gameplay.objectives.bomb,p().gameplay.objectives.rescue,...p().gameplay.objectives.hostages].filter(Boolean)];
const snap=n=>Math.round(n*10)/10,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const status=s=>$('status').textContent=s;
const guideKey=part=>`cartridge-studio-${part}-${p().projectId}`;
function updateFirstBuild(){
 const panel=$('firstBuild'),hidden=p().mode!=='new-level'||localStorage.getItem(guideKey('guide-hidden'))==='1';
 panel.hidden=hidden;$('showGuide').hidden=p().mode!=='new-level'||!hidden;if(hidden)return;
 const steps=[
  {done:floors().length>0,text:'Tryck Skapa rum så får du ett färdigt golv, väggar och en standarddörr.',button:'SKAPA RUM'},
  {done:arch().some(e=>['door','card-door','opening'].includes(e.kind)),text:'Klicka på en vägg för att sätta dit en dörr. Dra den sedan längs väggen.',button:'VÄLJ DÖRR'},
  {done:objects().length>0,text:'Välj en möbelbild och klicka där möbeln ska stå.',button:'VISA MÖBLER'},
  {done:localStorage.getItem(guideKey('walked'))==='1',text:'Gå runt i banan med FPS-spelets modeller och fysik.',button:'GÅ RUNT'},
  {done:localStorage.getItem(guideKey('saved'))==='1',text:'Spara ZIP och öppna den igen när du vill fortsätta.',button:'SPARA ZIP'}
 ];
 const index=steps.findIndex(s=>!s.done),step=steps[index]||{text:'Din första byggresa är klar. Fortsätt bygga fritt.',button:'BYGG VIDARE'};
 $('firstBuildProgress').textContent=index<0?'5 av 5 klara':`Steg ${index+1} av 5`;
 $('firstBuildText').textContent=step.text;$('firstBuildNext').textContent=step.button;
 panel.dataset.step=String(index);
}
const floorAt=(x,z)=>floors().find(f=>inside(x,z,f.polygon||[[f.x0,f.z0],[f.x1,f.z0],[f.x1,f.z1],[f.x0,f.z1]]));
const nextId=prefix=>{let i=1;const ids=new Set([...floors(),...arch(),...objects()].map(o=>o.id));while(ids.has(prefix+String(i).padStart(4,'0')))i++;return prefix+String(i).padStart(4,'0');};
function commit(before){if(p().mode==='edit-floor5')writeProjectScene(p(),model());if(before===JSON.stringify(p()))return;if(view==='walk')leaveWalk();history.push(before);if(history.length>60)history.shift();future=[];persist();redraw();queueGameLook();}
function persist(){try{localStorage.setItem(p().mode==='edit-floor5'?'cartridge-floor5-level-v2':'cartridge-new-level-v2',JSON.stringify(p()));$('autosave').textContent='Ändringar sparade lokalt.';}catch{$('autosave').textContent='Lokal lagring är full. Spara ZIP nu.';}}
function point(e){const r=canvas.getBoundingClientRect(),b=p().ground.bounds,scale=Math.min(canvas.width/(b.x1-b.x0),canvas.height/(b.z1-b.z0))*zoom;
 return {x:snap(((e.clientX-r.left)*canvas.width/r.width-canvas.width/2)/scale+(b.x0+b.x1)/2-offset.x),z:snap(((e.clientY-r.top)*canvas.height/r.height-canvas.height/2)/scale+(b.z0+b.z1)/2-offset.z)};}
function screen(x,z){const b=p().ground.bounds,scale=Math.min(canvas.width/(b.x1-b.x0),canvas.height/(b.z1-b.z0))*zoom;
 return [canvas.width/2+(x-(b.x0+b.x1)/2+offset.x)*scale,canvas.height/2+(z-(b.z0+b.z1)/2+offset.z)*scale];}
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const rectCorners=f=>({nw:{x:f.x0,z:f.z0},ne:{x:f.x1,z:f.z0},se:{x:f.x1,z:f.z1},sw:{x:f.x0,z:f.z1}});
const edgeHandles=f=>{
 const x=f.x0+(f.x1-f.x0)*.28,z=f.z0+(f.z1-f.z0)*.28;
 return {'edge-top':{x,z:f.z0},'edge-right':{x:f.x1,z},
  'edge-bottom':{x,z:f.z1},'edge-left':{x:f.x0,z}};
};
// Only offer arrows for edges where a small resize is actually possible.
// Connected, immovable edges stay visible as ordinary wall geometry.
function allowedEdgeHandles(f){
 if(f?.source||!floors().includes(f))return {};
 const positions=edgeHandles(f),others=floors().filter(x=>x.id!==f.id);
 const entries=arch(),bounds=p().ground.bounds;
 return Object.fromEntries(Object.entries(positions).filter(([handle,point])=>{
  const side=handle.slice(5);
  return [-.5,.5].some(delta=>{
   const candidate=side==='left'||side==='right'?{...point,x:point.x+delta}:{...point,z:point.z+delta};
   try{
    const result=planResizeFloorEdge(f,entries,side,candidate,{bounds,otherFloors:others});
    parsePosters(p().architecture.posters||[],result.entries);
    parseTreatments(p().architecture.treatments||[],result.entries);
    return true;
   }catch{return false;}
  });
 }));
}
const insertCenter=o=>({x:(o.a[0]+o.b[0])/2,z:(o.a[1]+o.b[1])/2});
const directInsert=o=>['door','card-door','opening','window','glazed'].includes(o?.kind);
function editHandleAt(e){
 const item=lookup(),r=canvas.getBoundingClientRect(),dpr=canvas.width/r.width;
 const x=(e.clientX-r.left)*dpr,z=(e.clientY-r.top)*canvas.height/r.height;
 const candidates=item&&!item.source&&floors().includes(item)?
  Object.entries({...rectCorners(item),...allowedEdgeHandles(item)}).map(([handle,q])=>({handle,q})):
  item?.kind==='wall'&&arch().includes(item)?['a','b'].map(handle=>({handle,q:{x:item[handle][0],z:item[handle][1]}})):[];
 return candidates.find(({handle,q})=>{
  const [sx,sz]=screen(q.x,q.z),radius=handle.startsWith('edge-')?22:13;
  return Math.hypot(x-sx,z-sz)<radius*dpr;
 })?.handle||null;
}
function beginDirectDrag(item,q,handle=null){
 const type=handle&&floors().includes(item)?(handle.startsWith('edge-')?'wall-edge':'resize'):
  handle&&item.kind==='wall'?'endpoint':directInsert(item)?'slide':null;
 if(!type)return null;
 const center=type==='slide'?insertCenter(item):null;
 return {direct:true,type,id:item.id,handle,initialEntries:structuredClone(arch()),
  initialFloor:['resize','wall-edge'].includes(type)?structuredClone(item):null,before:JSON.stringify(p()),
  dx:center?q.x-center.x:0,dz:center?q.z-center.z:0};
}
function applyDirectDrag(info,q){
 try{
  let planned;
  if(info.type==='resize'||info.type==='wall-edge'){
   const options={bounds:p().ground.bounds,otherFloors:floors().filter(f=>f.id!==info.id)};
   planned=info.type==='resize'?
    planResizeFloor(info.initialFloor,info.initialEntries,info.handle,q,options):
    planResizeFloorEdge(info.initialFloor,info.initialEntries,info.handle.slice(5),q,options);
  }else if(info.type==='endpoint')planned=planMoveWallEnd(info.initialEntries,info.id,info.handle,q,
   {bounds:p().ground.bounds,posters:p().architecture.posters,treatments:p().architecture.treatments});
  else planned=planSlideInsert(info.initialEntries,info.id,{x:q.x-info.dx,z:q.z-info.dz},
   {posters:p().architecture.posters,treatments:p().architecture.treatments});
  parsePosters(p().architecture.posters||[],planned.entries);
  parseTreatments(p().architecture.treatments||[],planned.entries);
  arch().splice(0,arch().length,...planned.entries);
  if(planned.floor){const stored=p().ground.floors.find(f=>f.id===info.id);Object.assign(stored,planned.floor);
   const displayed=model().floors.find(f=>f.id===info.id);
   if(displayed&&displayed!==stored)Object.assign(displayed,planned.floor,
    {polygon:[[planned.floor.x0,planned.floor.z0],[planned.floor.x1,planned.floor.z0],
     [planned.floor.x1,planned.floor.z1],[planned.floor.x0,planned.floor.z1]]});}
  status(['resize','wall-edge'].includes(info.type)?'Klart! Väggen, hörnen och dörrarna följer med.':
   info.type==='slide'?'Öppningen sitter kvar i väggen. Fysiken följer med.':'Väggänden flyttad.');
  redraw();return true;
 }catch(err){status(err.message);return false;}
}
function find(x,z){for(const d of decorations()){const at=decorationAt(d);if(at&&Math.hypot(x-at.x,z-at.z)<.3)return d;}for(const m of markers())if(dist(m,{x,z})<.35)return m;
 // Small and narrow objects must still be easy to pick at Floor 5 scale.
 // Prefer recently placed furniture when objects overlap in free-building mode.
  for(const o of objects().slice().reverse())if(inside(x,z,corners(o,.15)))return o;
 for(const a of [...arch().filter(directInsert),...arch().filter(a=>!directInsert(a))]){
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
 return {rooms:zones,excludedRooms:[],obstacles:model().fixed,walls:projectWallPieces(arch()),doors:arch().filter(a=>['door','card-door','opening'].includes(a.kind)).map(a=>({...a,blocked:false}))};}
function placementIssue(item,other=objects()){
 if(!floorAt(item.x,item.z))return 'Utanför golvet. Rita golv här eller flytta föremålet senare.';
 return validate(item,other,occupyData(),null,{emptyFixed:p().mode==='new-level'||p().legacyPatch?.emptyFixed===true});
}
function placementStatus(item){status(`${item.assetName||item.kind} placerad. Dra för att flytta eller välj exakta mått.`);}
function easyFurniturePose(item){
 if(!$('autoPlace').checked||item.mountId||item.collision==='none')return {item,adjusted:false};
 const floor=floorAt(item.x,item.z);
 if(!floor)return {item,adjusted:false};
 return findNearbyFreePlacement(item,candidate=>
  floorAt(candidate.x,candidate.z)?.id===floor.id&&!placementIssue(candidate),
  {step:.2,maxRadius:.8});
}
function addFurniture(entry,x,z){const floor=floorAt(x,z),id=nextId('NY-OBJ-');
 const assetId=entry.id==='clone'?pendingTemplate?.assetId:entry.assetId||entry.id;
 let item={...(pendingTemplate||{}),id,roomId:floor?.id||'',kind:pendingTemplate?.kind||entry.kind||'prop',assetId,assetName:entry.name,x,z,yaw:pendingYaw,w:entry.width,d:entry.depth,height:entry.height};
 if(entry.chairRole&&!pendingTemplate)item.chairRole=entry.chairRole;
 item={...item,...proposeSmartPose(item,{x,z},objects())};
  const fitted=easyFurniturePose(item);item=fitted.item;
 if(pendingTemplate){const copies=duplicateFurnitureAssembly(pendingTemplate,objects(),{x:item.x,z:item.z,yaw:item.yaw,mountId:item.mountId,elevation:item.elevation||0});for(const copy of copies)copy.roomId=floor?.id||'';objects().push(...copies);item=copies[0];}else objects().push(item);if(entry.id.startsWith('local:')){
  if(!p().assets.local.some(a=>a.assetId===entry.id))p().assets.local.push({assetId:entry.id,file:`assets/models/${entry.id.slice(6)}.glb`,bytes:entry.byteCount||entry.size,license:'private, unverified'});
 }else if(entry.id!=='clone'&&!p().assets.library.includes(assetId))p().assets.library.push(assetId);
 selected=item.id;placementStatus(item);
  if(fitted.adjusted)status(`${item.assetName||item.kind} placerad lite bredvid klicket. Flytta precis som du vill.`);}
function placeMarker(kind,x,z){if(!floorAt(x,z))throw Error('Placera spelpunkter på ett golv.');const g=p().gameplay,o=g.objectives;
 if(['analysts','counterAnalysts'].includes(kind)){
  const subset=g.spawns.filter(s=>s.team===kind);if(subset.length>=5)throw Error('Fem spawns är redan placerade för laget. Flytta en markör i stället.');
  const index=subset.length,id=`SP-${kind==='analysts'?'A':'C'}-${String(index+1).padStart(2,'0')}`;g.spawns.push({id,team:kind,index,x,z,yaw:kind==='analysts'?0:Math.PI});selected=id;
 }else if(kind==='hostages'){
  if(o.hostages.length>=2)throw Error('Två gisslan finns redan. Flytta dem med musen.');
  const id='OBJ-H'+(o.hostages.length+1);o.hostages.push({id,x,z,yaw:0,roomId:floorAt(x,z).id});selected=id;
 }else{const id=kind==='bomb'?'OBJ-BOMB':'OBJ-RESCUE';o[kind]={id,x,z,radius:kind==='bomb'?1.1:1.65,roomId:floorAt(x,z).id};selected=id;}
}
const decorations=()=>[...(p().architecture.posters||[]),...(p().architecture.treatments||[])];
function decorationAt(d){if(d.type){const at=treatmentPosition(d,arch());return at?{x:at.center[0],z:at.center[1]}:null;}return locatePoster(d,arch());}
function lookup(){return [...decorations(),...floors(),...arch(),...objects(),...markers()].find(o=>o.id===selected);}
const selectionDock=installSelectionDock({
 getIssue:placementIssue,
 onHeight:value=>{
  const item=lookup();
  if(!item||!objects().includes(item)||!Number.isFinite(value)||value<.1||value>8)return;
  const before=JSON.stringify(p()),delta=value-item.height;
  item.height=value;
  // A countertop-mounted accessory stays on top when its supporting table changes height.
  for(const child of objects().filter(child=>child.mountId===item.id&&Number.isFinite(child.elevation)))
   child.elevation=Math.max(0,Math.round((child.elevation+delta)*1000)/1000);
  placementStatus(item);commit(before);
 }
});
function updateProps(){const o=lookup();$('selection').hidden=!o;$('posterText').disabled=!o||!p().architecture.posters?.includes(o);$('posterText').value=o?.text||'';$('selectedLabel').disabled=!o||!floors().some(f=>f.id===o.id)||!!o.source;$('selectedLabel').value=o?.name||'';$('selectedSurface').disabled=!o||!floors().includes(o)||!!o.source;$('selectedSurface').value=o?.surface||'carpet';$('selectedSill').disabled=!o||o.kind!=='window';$('selectedSill').value=o?.sill??.9;$('collisionSetting').hidden=!o||!objects().includes(o);$('collisionMode').value=o?.collision||'solid';$('selectionName').textContent=o?`${o.name||o.assetName||o.text||o.type||o.team||o.kind||o.role}`:'Ingenting';
 $('x').value=o?(o.x??o.x0??o.a?.[0]??''):'';$('z').value=o?(o.z??o.z0??o.a?.[1]??''):'';
 $('w').value=o?(o.w??(o.x1!==undefined?o.x1-o.x0:o.b?Math.hypot(o.b[0]-o.a[0],o.b[1]-o.a[1]):'')):'';
 $('d').value=o?(o.d??(o.z1!==undefined?o.z1-o.z0:'')):'';
 for(const id of ['x','z','w','d','remove','rotate','duplicate'])$(id).disabled=!o;
 selectionDock.sync(o,{isFurniture:!!o&&objects().includes(o)&&!pendingFurniture&&(tab!=='build'||$('tool').value==='select')});
}
function rotateWithChildren(o,delta){const c=Math.cos(delta),s=Math.sin(delta);for(const child of objects().filter(v=>v.mountId===o.id)){const dx=child.x-o.x,dz=child.z-o.z;child.x=o.x+c*dx+s*dz;child.z=o.z-s*dx+c*dz;child.yaw+=delta;}o.yaw=((o.yaw+delta+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;if(objects().includes(o))placementStatus(o);return true;}
function moveObject(o,x,z){if(arch().includes(o)){
  if(o.kind==='wall'&&floors().some(f=>roomBoundaryIds(f,[o]).includes(o.id))){
   status('Dra rummets orange hörn för att flytta dess väggar tillsammans.');return false;}
  if(p().mode==='new-level'&&o.kind==='wall'&&arch().some(e=>e!==o&&[e.a,e.b].some(v=>[o.a,o.b].some(w=>dist({x:v[0],z:v[1]},{x:w[0],z:w[1]})<.02)))){
   status('Väggen sitter ihop med en annan byggdel. Flytta hörnet eller öppningen.');return false;}
  const dx=snap(x-o.a[0]),dz=snap(z-o.a[1]);o.a=[snap(o.a[0]+dx),snap(o.a[1]+dz)];o.b=[snap(o.b[0]+dx),snap(o.b[1]+dz)];return true;}const floor=floorAt(x,z);
 if(o.kind&&objects().includes(o)){
  let candidate={...o,x,z,roomId:floor?.id||'',...proposeSmartPose(o,{x,z},objects())};
  const dx=candidate.x-o.x,dz=candidate.z-o.z;Object.assign(o,candidate);
  for(const child of objects().filter(c=>c.mountId===o.id)){child.x=snap(child.x+dx);child.z=snap(child.z+dz);child.roomId=o.roomId;}placementStatus(o);return true;
 }
 if(markers().includes(o)){if(!floor)return false;o.x=x;o.z=z;if(o.roomId)o.roomId=floor.id;return true;}
 return false;}
function finishBuild(a,q,tool){try{const before=JSON.stringify(p());
 selected=['room','corridor'].includes(tool)?makeFloor(a,q,tool).id:makeSegment(tool,[a.x,a.z],[q.x,q.z]).id;
 first=null;drawGesture=null;commit(before);status('Ritad. Bygg vidare eller tryck Esc för att välja och flytta.');
 }catch(err){first=null;drawGesture=null;status(err.message);redraw();}}
function handleBuild(q,tool,gesture){try{
 if(['poster','curtain','blind'].includes(tool)){const hit=wallAtPoint(arch(),[q.x,q.z],{radius:.4});if(!hit)throw Error('Klicka på en vägg eller ett fönster för att fästa tillbehöret.');const before=JSON.stringify(p());p().architecture.posters||=[];p().architecture.treatments||=[];let fresh;if(tool==='poster'){fresh=makePoster(hit.wall,p().architecture.posters,hit.t);p().architecture.posters.push(fresh);}else if(tool==='blind'){fresh=createBlind(arch(),p().architecture.treatments,hit.wall.id);p().architecture.treatments.push(fresh);}else{const w=hit.wall,L=hit.length,half=Math.min(.45,3/L),t=clamp(hit.t,half,1-half),pt=v=>w.a.map((n,i)=>n+(w.b[i]-n)*v);fresh=createCurtain(arch(),p().architecture.treatments,w.id,pt(t-half),pt(t+half));p().architecture.treatments.push(fresh);}selected=fresh.id;commit(before);return;}
 if(!first&&['door','card-door','opening','window','glazed'].includes(tool)){const nearest=wallAtPoint(arch(),[q.x,q.z],{radius:.4});if(nearest){if((p().architecture.treatments||[]).some(t=>t.wallId===nearest.wall.id))throw Error('Ta bort gardinen eller persiennen innan du delar väggen. Ångra återställer båda.');const before=JSON.stringify(p()),w=nearest.wall,len=nearest.length,width=isDoor(tool)?1.2:Math.min(1.6,len),t=clamp(nearest.t,width/2/len,1-width/2/len),span=(v)=>w.a.map((n,i)=>n+(w.b[i]-n)*v);const plan=planPaintOverWall(arch(),w.id,span(t-width/2/len),span(t+width/2/len),tool,{posters:p().architecture.posters||[]});arch().splice(0,arch().length,...plan.entries.filter(e=>!e.deleted));p().architecture.posters=plan.posters;selected=plan.paintedId;const part=lookup();if(part&&tool==='window')part.sill=Number($('sill').value);commit(before);status('Infäst i väggen. Öppningen och fysiken uppdateras automatiskt.');return;}
  if(tool!=='glazed')throw Error('Klicka på en synlig vägg först. Dörr och fönster skapar öppningen automatiskt.');}
 if(!first){first=q;drawGesture=gesture;status('Startpunkt vald. Klicka slutpunkt eller dra. Esc avbryter.');redraw();return;}
 finishBuild(first,q,tool);
 }catch(err){first=null;drawGesture=null;status(err.message);redraw();}}
canvas.addEventListener('pointerdown',e=>{if(view!=='plan')return;if(e.button===1||e.button===2||(e.button===0&&spaceHeld)){e.preventDefault();canvas.setPointerCapture(e.pointerId);planPan={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,button:e.button,moved:false};return;}if(e.button!==0)return;canvas.setPointerCapture(e.pointerId);const q=point(e),tool=tab==='build'?$('tool').value:tab==='play'?$('gameTool').value:'furnish';
 if(pendingFurniture){try{const before=JSON.stringify(p());addFurniture(pendingFurniture,q.x,q.z);commit(before);}catch(err){status(err.message);}return;}
 if(tool==='select'||tool==='furnish'){const handle=editHandleAt(e),hit=handle?lookup():find(q.x,q.z);if(hit){selected=hit.id;drag=beginDirectDrag(hit,q,handle)||
  {before:JSON.stringify(p()),start:q,hit,dx:q.x-(hit.x??hit.a?.[0]??q.x),dz:q.z-(hit.z??hit.a?.[1]??q.z)};redraw();return;}if(tool==='furnish'){status('Välj ett objekt i listan och klicka PLACERA.');return;}selected=null;redraw();return;}
 if(tab==='play'){try{const found=markers().find(m=>dist(m,q)<.35);if(found){selected=found.id;drag={before:JSON.stringify(p()),start:q,hit:found,dx:q.x-found.x,dz:q.z-found.z};redraw();return;}const before=JSON.stringify(p());placeMarker(tool,q.x,q.z);commit(before);}catch(err){status(err.message);}return;}
 handleBuild(q,tool,{x:e.clientX,y:e.clientY,tool,view:'plan'});});
canvas.addEventListener('pointermove',e=>{if(view!=='plan')return;if(planPan){const r=canvas.getBoundingClientRect(),b=p().ground.bounds,scale=Math.min(canvas.width/(b.x1-b.x0),canvas.height/(b.z1-b.z0))*zoom;offset.x+=(e.clientX-planPan.x)*canvas.width/r.width/scale;offset.z+=(e.clientY-planPan.y)*canvas.height/r.height/scale;planPan.moved ||= Math.hypot(e.clientX-planPan.startX,e.clientY-planPan.startY)>6;planPan.x=e.clientX;planPan.y=e.clientY;drawPlan();return;}const q=point(e);$('coordinates').textContent=`X ${q.x.toFixed(1)} · Z ${q.z.toFixed(1)}`;
 if(drag){if(drag.direct)applyDirectDrag(drag,q);else if(moveObject(drag.hit,snap(q.x-drag.dx),snap(q.z-drag.dz)))redraw();return;}
 hover=q;if(first||pendingFurniture||tab==='build'&&['door','window','glazed','opening','card-door'].includes($('tool').value))redraw();});
canvas.addEventListener('pointerup',e=>{if(planPan){const rotate=planPan.button===2&&!planPan.moved;planPan=null;if(rotate){const o=lookup();if(o?.yaw!==undefined){const before=JSON.stringify(p());rotateWithChildren(o,Math.PI/12);commit(before);}}return;}if(drawGesture?.view==='plan'&&first&&Math.hypot(e.clientX-drawGesture.x,e.clientY-drawGesture.y)>6)finishBuild(first,point(e),drawGesture.tool);drawGesture=null;if(drag){commit(drag.before);drag=null;}});
canvas.addEventListener('pointercancel',()=>{planPan=null;if(drag?.before){project=JSON.parse(drag.before);redraw();}drag=null;drawGesture=null;});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
function drawPlan(){const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#e6efea';ctx.fillRect(0,0,canvas.width,canvas.height);
 const b=p().ground.bounds;ctx.strokeStyle='#bfd1ca';ctx.lineWidth=1;for(let x=b.x0;x<=b.x1;x++)for(let z=b.z0;z<=b.z1;z++){const [sx,sz]=screen(x,z);if(sx>=0&&sx<canvas.width&&sz>=0&&sz<canvas.height)ctx.fillRect(sx,sz,1,1);}
 for(const f of floors()){const poly=(f.polygon||[[f.x0,f.z0],[f.x1,f.z0],[f.x1,f.z1],[f.x0,f.z1]]).map(v=>screen(...v));ctx.beginPath();poly.forEach((v,i)=>i?ctx.lineTo(...v):ctx.moveTo(...v));ctx.closePath();ctx.fillStyle=f.surface==='vinyl'?'#d3e8e3':'#f3e4d0';ctx.fill();ctx.strokeStyle=selected===f.id?'#ed993a':'#adc3b8';ctx.lineWidth=selected===f.id?3:1;ctx.stroke();if(zoom>1||!f.source){ctx.fillStyle='#426367';ctx.font=`${12*dpr}px system-ui`;const [x,z]=screen(f.x0,f.z0);ctx.fillText(f.name,x+8,z+17*dpr);}}
 if(roomPreview&&view==='plan'){
  const r=roomPreview.rect,pts=[[r.x0,r.z0],[r.x1,r.z0],[r.x1,r.z1],[r.x0,r.z1]].map(q=>screen(...q));
  ctx.save();ctx.beginPath();pts.forEach((v,i)=>i?ctx.lineTo(...v):ctx.moveTo(...v));ctx.closePath();
  ctx.fillStyle='#42be9f40';ctx.strokeStyle='#157d68';ctx.lineWidth=3;ctx.setLineDash([8,5]);ctx.fill();ctx.stroke();ctx.restore();
 }
 for(const e of [...projectWallPieces(arch()),...arch().filter(e=>isDoor(e.kind))]){const marker=isDoor(e.kind)?standardDoorMarkerSpan(e):e;const a=screen(...marker.a),b=screen(...marker.b);ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.lineWidth=selected===e.id?7:Math.max(3,5*dpr);ctx.strokeStyle=selected===e.id?'#f2a03e':({wall:'#bc5961',glazed:'#35aa8a',window:'#46a0c0',door:'#dc9b4f','card-door':'#dc9b4f',opening:'#fff'}[e.kind]);ctx.stroke();}
 for(const o of objects()){const pts=corners(o).map(v=>screen(...v));ctx.beginPath();pts.forEach((v,i)=>i?ctx.lineTo(...v):ctx.moveTo(...v));ctx.closePath();ctx.fillStyle=selected===o.id?'#ffc874':'#5a7e88';ctx.fill();ctx.strokeStyle='#233e4a';ctx.stroke();}
 for(const m of markers()){const [x,z]=screen(m.x,m.z);ctx.beginPath();ctx.arc(x,z,selected===m.id?12*dpr:9*dpr,0,Math.PI*2);ctx.fillStyle=m.team==='analysts'?'#298bb7':m.team==='counterAnalysts'?'#d5684d':m.id.includes('BOMB')?'#dfb03e':m.id.includes('RESCUE')?'#41b89a':'#bf78b5';ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#16343b';ctx.font=`bold ${10*dpr}px system-ui`;ctx.fillText(m.team?String(m.index+1):m.id.includes('H')?'H':m.id.includes('BOMB')?'B':'R',x+11*dpr,z);}
 for(const d of decorations()){const at=decorationAt(d);if(!at)continue;const [x,z]=screen(at.x,at.z);ctx.fillStyle=selected===d.id?'#f0ae4a':d.type?'#7987a9':'#bb78a2';ctx.fillRect(x-5*dpr,z-5*dpr,10*dpr,10*dpr);}
 const chosen=lookup(),handles=chosen&&!chosen.source&&floors().includes(chosen)?
  {...rectCorners(chosen),...allowedEdgeHandles(chosen)}:
  chosen?.kind==='wall'&&arch().includes(chosen)?{
   a:{x:chosen.a[0],z:chosen.a[1]},b:{x:chosen.b[0],z:chosen.b[1]}}:{};
 for(const [key,q] of Object.entries(handles)){
  const [x,z]=screen(q.x,q.z),edge=key.startsWith('edge-');
  ctx.save();ctx.lineWidth=2*dpr;ctx.strokeStyle='#12383d';
  if(edge){
   ctx.beginPath();ctx.arc(x,z,14*dpr,0,Math.PI*2);
   ctx.fillStyle='#36b88c';ctx.fill();ctx.stroke();
   ctx.fillStyle='#093d31';ctx.font=`bold ${18*dpr}px system-ui`;
   ctx.textAlign='center';ctx.textBaseline='middle';
   ctx.fillText(key==='edge-left'||key==='edge-right'?'↔':'↕',x,z);
  }else{
   ctx.fillStyle='#f6aa42';ctx.fillRect(x-6*dpr,z-6*dpr,12*dpr,12*dpr);
   ctx.strokeRect(x-6*dpr,z-6*dpr,12*dpr,12*dpr);
  }
  ctx.restore();
 }
 if($('showPhysics').checked){ctx.save();ctx.strokeStyle='#d42f52';ctx.lineWidth=3*dpr;ctx.setLineDash([5,3]);for(const w of projectWallPieces(arch())){ctx.beginPath();ctx.moveTo(...screen(...w.a));ctx.lineTo(...screen(...w.b));ctx.stroke();}for(const o of objects().filter(o=>o.collision!=='none')){const pts=corners(o).map(v=>screen(...v));ctx.beginPath();pts.forEach((v,i)=>i?ctx.lineTo(...v):ctx.moveTo(...v));ctx.closePath();ctx.stroke();}ctx.restore();}
 if(pendingFurniture&&hover){let ghost={id:'ghost',kind:'prop',assetId:pendingFurniture.id,x:hover.x,z:hover.z,yaw:pendingYaw,w:pendingFurniture.width,d:pendingFurniture.depth,height:pendingFurniture.height,roomId:floorAt(hover.x,hover.z)?.id};ghost={...ghost,...proposeSmartPose(ghost,hover,objects())};ghost=easyFurniturePose(ghost).item;const pts=corners(ghost).map(v=>screen(...v));ctx.beginPath();pts.forEach((v,i)=>i?ctx.lineTo(...v):ctx.moveTo(...v));ctx.closePath();ctx.fillStyle='#36b98b88';ctx.fill();ctx.strokeStyle='#14785b';ctx.lineWidth=2*dpr;ctx.stroke();}
 if(hover&&tab==='build'&&!first&&['door','card-door','opening','window','glazed'].includes($('tool').value)){
  const hit=wallAtPoint(arch(),[hover.x,hover.z],{radius:.4});if(hit){const width=isDoor($('tool').value)?1.2:Math.min(1.6,hit.length),fraction=clamp(hit.t,width/2/hit.length,1-width/2/hit.length);
   const x=hit.wall.a[0]+(hit.wall.b[0]-hit.wall.a[0])*fraction,z=hit.wall.a[1]+(hit.wall.b[1]-hit.wall.a[1])*fraction;
   const vx=(hit.wall.b[0]-hit.wall.a[0])/hit.length,vz=(hit.wall.b[1]-hit.wall.a[1])/hit.length;
   ctx.beginPath();ctx.moveTo(...screen(x-vx*width/2,z-vz*width/2));ctx.lineTo(...screen(x+vx*width/2,z+vz*width/2));
   ctx.strokeStyle='#f4ad42';ctx.lineWidth=9*dpr;ctx.globalAlpha=.7;ctx.stroke();ctx.globalAlpha=1;}}
 if(first&&hover){const a=screen(first.x,first.z),b=screen(hover.x,hover.z);ctx.beginPath();if(['room','corridor'].includes($('tool').value))ctx.rect(a[0],a[1],b[0]-a[0],b[1]-a[1]);else{ctx.moveTo(...a);ctx.lineTo(...b);}ctx.setLineDash([7,5]);ctx.lineWidth=2;ctx.strokeStyle='#106f79';ctx.stroke();ctx.setLineDash([]);}
}
const scene=new T.Scene();scene.background=new T.Color(0xd9e8e4);const camera=new T.PerspectiveCamera(55,1,.1,250);let renderer=null;
function ensureRenderer(){
 if(renderer)return true;
 try{const context=$('scene3d').getContext('webgl2',{antialias:true});if(!context)throw Error('WebGL saknas');
  renderer=new T.WebGLRenderer({canvas:$('scene3d'),context,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));return true;
 }catch{status('3D och FPS kräver WebGL 2. Aktivera maskinvaruacceleration i webbläsaren. Du kan fortsätta bygga och spara i planvyn.');return false;}
}
scene.add(new T.HemisphereLight(0xffffff,0x819a97,2.2));const sun=new T.DirectionalLight(0xffffff,2);sun.position.set(5,15,6);scene.add(sun);const group=new T.Group(),preview3d=new T.Group();scene.add(group,preview3d);let hover3d=null;
let furnitureRoot=null,furnitureSignature='';
function refreshFurnitureVisuals(){const signature=JSON.stringify(objects());if(signature===furnitureSignature)return;furnitureSignature=signature;
 if(furnitureRoot){scene.remove(furnitureRoot);furnitureRoot.traverse(o=>{if(o.isMesh){if(o.userData.studioGeometry)o.geometry?.dispose();if(o.material?.userData?.studioOwned)o.material.dispose();}});}
 furnitureRoot=new T.Group();scene.add(furnitureRoot);const target=furnitureRoot;
 buildProjectFurniture(objects(),target,{assets:p().assets.local}).then(()=>{if(target===furnitureRoot&&renderer&&view==='3d')renderer.render(scene,camera);})
  .catch(e=>{if(target===furnitureRoot)status('Kunde inte visa möbelmodellen: '+e.message);});
}
function box(x,y,z,w,h,d,color,angle=0,opacity=1,id=null){const material=new T.MeshStandardMaterial({color,transparent:opacity<1,opacity,side:T.DoubleSide});material.userData.studioOwned=true;const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.rotation.y=angle;if(id)mesh.userData.editId=id;group.add(mesh);return mesh;}
function previewBox(x,y,z,w,h,d,color,angle=0,opacity=.35){const mesh=new T.Mesh(new T.BoxGeometry(Math.max(.04,w),Math.max(.025,h),Math.max(.04,d)),new T.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:T.DoubleSide}));mesh.position.set(x,y,z);mesh.rotation.y=angle;preview3d.add(mesh);}
function update3DPreview(q=hover3d){preview3d.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});preview3d.clear();if(view!=='3d'||!renderer)return;
 const current=lookup();if(objects().includes(current))previewBox(current.x,(current.elevation||0)+current.height/2,current.z,current.w,current.height,current.d,0xf2a03e,current.yaw||0,.15);
 if(q&&pendingFurniture){const pose={kind:pendingFurniture.kind||'prop',assetId:pendingFurniture.assetId||pendingFurniture.id,x:q.x,z:q.z,yaw:pendingYaw,w:pendingFurniture.width,d:pendingFurniture.depth,height:pendingFurniture.height,roomId:floorAt(q.x,q.z)?.id};Object.assign(pose,proposeSmartPose(pose,q,objects()));const fit=easyFurniturePose(pose).item;previewBox(fit.x,(fit.elevation||0)+fit.height/2,fit.z,fit.w,fit.height,fit.d,0x24aa80,pendingYaw);}
 else if(q&&first&&tab==='build'){const tool=$('tool').value,x=(first.x+q.x)/2,z=(first.z+q.z)/2,w=Math.abs(q.x-first.x),d=Math.abs(q.z-first.z);if(['room','corridor'].includes(tool))previewBox(x,.035,z,w,.06,d,0x188d84,0,.28);else{const len=Math.hypot(w,d),angle=-Math.atan2(q.z-first.z,q.x-first.x);previewBox(x,.8,z,len,1.6,.07,0x188d84,angle,.35);}}
 else if(q&&tab==='build'&&['door','card-door','opening','window','glazed'].includes($('tool').value)){const hit=wallAtPoint(arch(),[q.x,q.z],{radius:.4});if(hit){const w=isDoor($('tool').value)?1.2:Math.min(1.6,hit.length),angle=-Math.atan2(hit.wall.b[1]-hit.wall.a[1],hit.wall.b[0]-hit.wall.a[0]);previewBox(hit.point[0],.7,hit.point[1],w,1.4,.12,0xf4ad42,angle,.3);}}
 renderer.render(scene,camera);
}
function frameBuiltFloors(){const polys=floors().map(f=>f.polygon||[[f.x0,f.z0],[f.x1,f.z0],[f.x1,f.z1],[f.x0,f.z1]]).flat();
 const b=p().ground.bounds,points=polys.length?polys:[[b.x0,b.z0],[b.x1,b.z1]];
 const xs=points.map(q=>q[0]),zs=points.map(q=>q[1]),x0=Math.min(...xs),x1=Math.max(...xs),z0=Math.min(...zs),z1=Math.max(...zs);
 return {x:(x0+x1)/2,z:(z0+z1)/2,span:Math.max(8,x1-x0+3,z1-z0+3)};
}
function position3DCamera(){const focus=view3dCenter??=frameBuiltFloors(),span=focus.span/view3dZoom;
 camera.position.set(focus.x+Math.sin(orbit)*span*.75,span*.72,focus.z+Math.cos(orbit)*span*.75);camera.lookAt(focus.x,0,focus.z);
}
function visibleSpan(){const b=p().ground.bounds;return view==='3d'?(view3dCenter??=frameBuiltFloors()).span/view3dZoom:Math.max(b.x1-b.x0,b.z1-b.z0)/zoom;}
function moveView(direction,distance){if(view==='walk')return;
 const forward=view==='3d'?{x:-Math.sin(orbit),z:-Math.cos(orbit)}:{x:0,z:-1};
 const right=view==='3d'?{x:Math.cos(orbit),z:-Math.sin(orbit)}:{x:1,z:0};
 const axis=direction==='forward'?forward:direction==='backward'?{x:-forward.x,z:-forward.z}:direction==='right'?right:{x:-right.x,z:-right.z};
 const dx=axis.x*distance,dz=axis.z*distance;
 if(view==='plan'){offset.x-=dx;offset.z-=dz;drawPlan();}
 else {const focus=view3dCenter??=frameBuiltFloors();focus.x+=dx;focus.z+=dz;position3DCamera();renderer.render(scene,camera);}
}
const movementKeys=new Map([['KeyW','forward'],['ArrowUp','forward'],['KeyS','backward'],['ArrowDown','backward'],['KeyA','left'],['ArrowLeft','left'],['KeyD','right'],['ArrowRight','right']]);
const heldMovement=new Set();let movementFrame=0,movementLast=0;
function animateMovement(now){movementFrame=0;if(!heldMovement.size||view==='walk')return;
 const dt=Math.min(.05,Math.max(0,(now-movementLast)/1000));movementLast=now;
 const down=direction=>[...heldMovement].some(code=>movementKeys.get(code)===direction);
 const horizontal=Number(down('right'))-Number(down('left'));
 const vertical=Number(down('forward'))-Number(down('backward'));
 const speed=Math.max(1.5,Math.min(20,visibleSpan()*.3))*dt/(Math.hypot(horizontal,vertical)||1);
 if(horizontal)moveView(horizontal>0?'right':'left',speed*Math.abs(horizontal));
 if(vertical)moveView(vertical>0?'forward':'backward',speed*Math.abs(vertical));
 movementFrame=requestAnimationFrame(animateMovement);
}
function stopMovement(){heldMovement.clear();if(movementFrame)cancelAnimationFrame(movementFrame);movementFrame=0;}
function draw3D(){if(!ensureRenderer())return;group.traverse(o=>{if(o.isMesh){o.geometry?.dispose();if(o.material?.userData?.studioOwned){o.material.map?.dispose();o.material.dispose();}}});group.clear();
 for(const f of floors()){const shape=new T.Shape(),poly=f.polygon||[[f.x0,f.z0],[f.x1,f.z0],[f.x1,f.z1],[f.x0,f.z1]];poly.forEach(([x,z],i)=>i?shape.lineTo(x,z):shape.moveTo(x,z));shape.closePath();const m=new T.MeshStandardMaterial({color:selected===f.id?0xf4d795:f.surface==='vinyl'?0xb7d6d0:0xd8cbbb,side:T.DoubleSide});m.userData.studioOwned=true;const mesh=new T.Mesh(new T.ShapeGeometry(shape),m);mesh.rotation.x=Math.PI/2;mesh.position.y=-.025;mesh.userData.editId=f.id;group.add(mesh);}
 for(const e of projectWallPieces(arch())){const dx=e.b[0]-e.a[0],dz=e.b[1]-e.a[1],len=Math.hypot(dx,dz),angle=-Math.atan2(dz,dx),x=(e.a[0]+e.b[0])/2,z=(e.a[1]+e.b[1])/2;
  if(e.kind==='window'){box(x,e.sill/2,z,len,e.sill,e.thickness,selected===e.id?0xf4ad42:0xc1d0d0,angle,1,e.id);box(x,(e.sill+e.height)/2,z,len,e.height-e.sill,.04,selected===e.id?0xf4ad42:0x7ec4d2,angle,.38,e.id);}
  else {const h=$('cutaway').checked&&e.kind==='wall'?Math.min(.8,e.height):e.height;box(x,h/2,z,len,h,e.thickness,selected===e.id?0xf4ad42:e.kind==='glazed'?0x82d5c5:0xb6c2bf,angle,e.kind==='glazed'?.4:1,e.id);}
 }
 for(const d of arch().filter(e=>isDoor(e.kind)&&e.kind!=='opening')){const len=Math.hypot(d.b[0]-d.a[0],d.b[1]-d.a[1]),angle=-Math.atan2(d.b[1]-d.a[1],d.b[0]-d.a[0])+Math.PI/5;box(d.a[0]+Math.cos(angle)*len/2,.45,d.a[1]-Math.sin(angle)*len/2,len,.9,.06,selected===d.id?0xf4ad42:0xcc9d61,angle,1,d.id);}
 for(const m of markers())box(m.x,.25,m.z,.34,.5,.34,selected===m.id?0xf4ad42:m.team==='analysts'?0x298bb7:m.team==='counterAnalysts'?0xd5684d:m.id.includes('BOMB')?0xdfb03e:m.id.includes('RESCUE')?0x41b89a:0xbf78b5,0,1,m.id);
 const chosen=lookup();
 if(chosen&&!chosen.source&&floors().includes(chosen))for(const [handle,q] of
  Object.entries({...rectCorners(chosen),...allowedEdgeHandles(chosen)})){
  const edge=handle.startsWith('edge-');
  const mesh=box(q.x,.24,q.z,edge?0.57:0.34,edge?0.42:0.34,edge?0.57:0.34,
   edge?0x35ba87:0xf8a849,0,1,chosen.id);
  mesh.userData.editHandle=handle;
 }
 if(chosen?.kind==='wall'&&arch().includes(chosen))for(const handle of ['a','b']){
  const q=chosen[handle],mesh=box(q[0],.22,q[1],.34,.44,.34,0xf8a849,0,1,chosen.id);
  mesh.userData.editHandle=handle;
 }
 refreshFurnitureVisuals();
 buildProjectDecorations(p(),arch(),group,()=>renderer.render(scene,camera));
 position3DCamera();
 const r=$('scene3d').getBoundingClientRect();renderer.setSize(Math.max(1,r.width),Math.max(1,r.height),false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();update3DPreview();
}
/** Starter room is a SINGLE undoable project change: actual floor + connected wall pieces + real standard door. */
function makeStarterRoom(){
 if(p().mode!=='new-level'||floors().length||arch().length)return false;
 const before=JSON.stringify(p());
 try{
  const b=p().ground.bounds,cx=snap((b.x0+b.x1)/2),cz=snap((b.z0+b.z1)/2);
  // 8 x 8 units is large enough for a standard 1.20-wide doorway.
  if(Math.min(b.x1-b.x0,b.z1-b.z0)<8)throw Error('Gör banans grundyta lite större först.');
  const x0=snap(cx-4),x1=snap(cx+4),z0=snap(cz-4),z1=snap(cz+4);
  if(!$('floorName').value.trim())$('floorName').value='Mitt första rum';
  makeFloor({x:x0,z:z0},{x:x1,z:z1},'room');
  const bottom=arch().find(w=>w.kind==='wall'&&w.a[1]===z0&&w.b[1]===z0&&Math.abs(w.b[0]-w.a[0])>7.9);
  if(!bottom)throw Error('Kunde inte hitta rummets vägg.');
  const painted=planPaintOverWall(arch(),bottom.id,[snap(cx-.6),z0],[snap(cx+.6),z0],'door',
   {posters:p().architecture.posters||[]});
  arch().splice(0,arch().length,...painted.entries.filter(w=>!w.deleted));
  p().architecture.posters=painted.posters;
  selected=null;pendingFurniture=null;pendingTemplate=null;first=null;
  if(tab!=='build')switchTab('build');
  setBuildTool('select');
  if(view!=='plan')$('planView').click();
  // Show the ROOM, not the full 80-unit empty canvas.
  zoom=clamp(Math.max(b.x1-b.x0,b.z1-b.z0)/12,1,10);
  offset={x:(b.x0+b.x1)/2-cx,z:(b.z0+b.z1)/2-cz};view3dCenter=null;
  commit(before);
  status('Klart! Ett rum med fyra väggar och en riktig dörr. Välj nu MÖBLERA och klicka på en bild.');
  return true;
 }catch(error){
  project=JSON.parse(before);sceneProject=null;sceneModel=null;
  redraw();status('Rummet kunde inte skapas: '+error.message);return false;
 }
}
function currentRoomForAddition(){
 const active=lookup(),rooms=floors().filter(f=>f.role==='room'&&!f.source);
 if(rooms.includes(active))return active;
 if(objects().includes(active)&&active.roomId){
  const home=rooms.find(f=>f.id===active.roomId);
  if(home)return home;
 }
 return rooms.at(-1)||null;
}
function roomOptions(room){
 if(!room)return [];
 const attachments=[...(p().architecture.treatments||[]),...(p().architecture.posters||[])];
 return ADJACENT_SIDES.map(side=>planAdjacentRoom(room,side,floors(),arch(),p().ground.bounds,
  {treatments:attachments}));
}
function closeRoomChoices({redrawScene=false}={}){
 const picker=$('roomChoices'),changed=!picker.hidden||!!roomPreview;
 picker.hidden=true;roomPreview=null;$('kidRoom').setAttribute('aria-expanded','false');
 if(changed&&redrawScene)redraw();
}
function renderRoomChoices(){
 const room=currentRoomForAddition(),options=roomOptions(room);
 $('roomChoiceHint').textContent=!room?'Välj ett rum i planen för att bygga vidare.':
  options.some(x=>x.ok)?'Bygger vidare från '+(room.name||'ditt rum')+'. Välj en ledig sida så kommer en dörr automatiskt.':
  'Inga lediga sidor här. Välj ett annat rum eller rita ett eget.';
 for(const button of document.querySelectorAll('[data-room-side]')){
  const plan=options.find(x=>x.side===button.dataset.roomSide);
  button.disabled=!plan?.ok;button.title=plan?.ok?'Skapa ett anslutet rum med riktig dörr':plan?.reason||'Välj ett rum först';
 }
 return options;
}
function openRoomChoices(){
 if(view==='walk')leaveWalk();
 if(view!=='plan')$('planView').click();
 if(tab!=='build')switchTab('build');
 setBuildTool('select');
 const picker=$('roomChoices');
 picker.hidden=false;$('kidRoom').setAttribute('aria-expanded','true');
 renderRoomChoices();redraw();
}
function makeAdjacentRoom(side){
 const plan=roomOptions(currentRoomForAddition()).find(item=>item.side===side);
 if(!plan?.ok){status(plan?.reason||'Välj ett annat rum och prova igen.');renderRoomChoices();return false;}
 const before=JSON.stringify(p()),input=$('floorName'),originalName=input.value;
 try{
  input.value=originalName.trim()&&originalName.trim()!=='Mitt första rum'?originalName:
   'Rum '+(floors().filter(f=>f.role==='room').length+1);
  const {x0,x1,z0,z1}=plan.rect;
  const next=makeFloor({x:x0,z:z0},{x:x1,z:z1},'room');
  const shared=arch().find(w=>w.id===plan.sharedWallId&&w.kind==='wall');
  if(!shared)throw Error('Den gemensamma väggen finns inte kvar.');
  const door=planPaintOverWall(arch(),shared.id,plan.doorStart,plan.doorEnd,'door',
   {posters:p().architecture.posters||[]});
  arch().splice(0,arch().length,...door.entries.filter(e=>!e.deleted));
  p().architecture.posters=door.posters;
  selected=next.id;pendingFurniture=null;pendingTemplate=null;first=null;
  roomPreview=null;closeRoomChoices();
  input.value='';setBuildTool('select');
  const f=frameBuiltFloors(),b=p().ground.bounds;
  zoom=clamp(Math.min((b.x1-b.x0)/(f.span+1),(b.z1-b.z0)/(f.span+1)),1,10);
  offset={x:(b.x0+b.x1)/2-f.x,z:(b.z0+b.z1)/2-f.z};
  view3dCenter=null;
  commit(before);
  status('Klart! Rum '+(floors().length)+' har en riktig dörr till det första. Lägg till fler rum eller möblera!');
  return true;
 }catch(err){
  project=JSON.parse(before);sceneProject=null;sceneModel=null;
  input.value=originalName;roomPreview=null;renderRoomChoices();redraw();
  status('Kunde inte lägga till rum: '+err.message);
  return false;
 }
}
function startCustomRoom(){
 closeRoomChoices();
 if(view==='walk')leaveWalk();
 if(tab!=='build')switchTab('build');
 setBuildTool('room');if(view!=='plan')$('planView').click();
 status('Rita ett eget rum: dra mellan två hörn i planen. Väggarna byggs automatiskt.');
}
function updateKidSteps(){
 const ready=floors().some(f=>f.role==='room');
 $('kidRoom').querySelector('strong').textContent=ready?'1. Fler rum':'1. Skapa rum';
 $('kidWalk').querySelector('strong').textContent=view==='walk'?'3. Till bygget':'3. Gå runt';
 $('kidRoom').classList.toggle('kid-step-primary',!ready);
}
$('kidRoom').addEventListener('click',()=>{
 if(makeStarterRoom()){closeRoomChoices();return;}
 if(p().mode==='new-level'&&floors().some(f=>f.role==='room')){
  if($('roomChoices').hidden)openRoomChoices();else closeRoomChoices({redrawScene:true});
  return;
 }
 startCustomRoom();
});
for(const button of document.querySelectorAll('[data-room-side]')){
 const show=()=>{
  const plan=roomOptions(currentRoomForAddition()).find(x=>x.side===button.dataset.roomSide);
  roomPreview=plan?.ok?plan:null;
  if(view==='plan')redraw();
 };
 button.addEventListener('pointerenter',show);
 button.addEventListener('focus',show);
 button.addEventListener('pointerleave',()=>{roomPreview=null;if(view==='plan')redraw();});
 button.addEventListener('blur',()=>{roomPreview=null;if(view==='plan')redraw();});
 button.addEventListener('click',()=>makeAdjacentRoom(button.dataset.roomSide));
}
$('roomChoiceClose').addEventListener('click',()=>closeRoomChoices({redrawScene:true}));
$('roomDrawCustom').addEventListener('click',startCustomRoom);
$('kidFurnish').addEventListener('click',()=>{
 closeRoomChoices();if(p().mode==='new-level'&&!floors().length&&!makeStarterRoom())return;
 if(matchMedia('(max-width:700px)').matches)document.querySelector('[data-mobile-tab="furnish"]').click();
 else switchTab('furnish');
 status('Välj en möbelbild och klicka på platsen i rummet. Du kan alltid flytta den igen.');
});
$('kidWalk').addEventListener('click',()=>{
 closeRoomChoices();if(view==='walk'){leaveWalk();return;}
 if(p().mode==='new-level'&&!floors().length&&!makeStarterRoom())return;
 $('walkView').click();
 if(view==='walk')updateKidSteps();
});
$('kidSave').addEventListener('click',()=>{closeRoomChoices();$('save').click();});

const toolLabels={select:'VÄLJ',room:'RUM',corridor:'GOLV',wall:'VÄGG',door:'DÖRR','card-door':'KORTDÖRR',opening:'ÖPPNING',window:'FÖNSTER',glazed:'GLAS',poster:'AFFISCH',curtain:'GARDIN',blind:'PERSIENN'};
function updateGuide(){const tool=$('tool').value,active=tab==='build'&&tool!=='select',placing=!!pendingFurniture,chosen=lookup();
 $('activeMode').textContent=placing?'PLACERA '+pendingFurniture.name:tab==='build'?toolLabels[tool]||'BYGG':tab==='play'?'SPEL':'MÖBLERA';
 $('activeHelp').textContent=placing?'Klicka där möbeln ska stå. Flytta den sedan precis som du vill.':first?'Klicka slutpunkten eller dra från start.':active?['room','corridor','wall'].includes(tool)?'Klicka två punkter eller dra i planen eller 3D.':'Klicka direkt på en vägg i planen eller 3D.':
  chosen&&!chosen.source&&floors().includes(chosen)?
   'Dra en GRÖN pil för att flytta en vägg, eller ett ORANGE hörn för två väggar. Dörrar följer med.':
  directInsert(chosen)?'Dra öppningen längs väggen. Den gamla luckan stängs automatiskt.':
  chosen?.kind==='wall'?'Dra en orange ändpunkt för att ändra en fri vägg.':'Klicka för att välja. Dra för att flytta.';
 $('cancelAction').hidden=!active&&!placing&&!first;$('deleteAction').disabled=!lookup();
}
function redraw(){updateKidSteps();$('modeLabel').textContent=p().mode==='edit-floor5'?'DESIGNSTUDION / FLOOR 5':'DESIGNSTUDION / NY BANA';updateProps();updateGuide();updateFirstBuild();$('undo').disabled=!history.length;$('redo').disabled=!future.length;if(view==='plan')drawPlan();else if(view==='3d')draw3D();}
function switchTab(t){closeRoomChoices();if(view==='walk')leaveWalk();tab=t;pendingFurniture=null;pendingTemplate=null;for(const b of document.querySelectorAll('[data-tab]'))b.classList.toggle('active',b.dataset.tab===t);for(const s of document.querySelectorAll('[data-panel]'))s.hidden=s.dataset.panel!==t;first=null;redraw();}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));
$('firstBuildDismiss').onclick=()=>{localStorage.setItem(guideKey('guide-hidden'),'1');updateFirstBuild();};
$('showGuide').onclick=()=>{localStorage.removeItem(guideKey('guide-hidden'));updateFirstBuild();};
$('firstBuildNext').onclick=()=>{switch(Number($('firstBuild').dataset.step)){
 case 0:$('kidRoom').click();break;
 case 1:switchTab('build');setBuildTool('door');break;
 case 2:switchTab('furnish');$('catalogSearch').focus();break;
 case 3:$('walkView').click();break;
 case 4:$('save').click();break;
 default:switchTab('build');setBuildTool('select');
 }};
function armFurniture(entry){pendingTemplate=null;pendingFurniture=entry;pendingYaw=0;first=null;$('catalog').value=entry.id;
 document.querySelectorAll('.catalog-card').forEach(card=>card.classList.toggle('active',card.dataset.asset===entry.id));
 status(`Klicka där ${entry.name} ska stå. Du kan flytta efteråt. R vrider · Esc avbryter.`);redraw();}
const autoPlace=$('autoPlace');
try{const saved=localStorage.getItem('cartridge-studio-smart-position');if(saved!==null)autoPlace.checked=saved==='1';}catch{}
autoPlace.addEventListener('change',()=>{try{localStorage.setItem('cartridge-studio-smart-position',autoPlace.checked?'1':'0');}catch{}redraw();});
const catalogWords=text=>String(text).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('sv').split(/\s+/).filter(Boolean);
function renderCatalog(){const list=$('catalog'),cards=$('catalogCards'),query=$('catalogSearch').value.trim().toLocaleLowerCase('sv'),category=$('catalogCategory').value;
 list.replaceChildren();cards.replaceChildren();const entries=[...catalogEntries,...localCatalog].filter(e=>(category==='all'||e.category===category||(category==='onboard'&&e.pack==='onboard')||(category==='used'&&objects().some(o=>o.assetId===e.id)))&&catalogWords(query).every(word=>catalogWords(`${e.name} ${e.category} ${e.keywords||''}`).join(' ').includes(word)));
 for(const entry of entries){const opt=document.createElement('option');opt.value=entry.id;opt.textContent=entry.name+' · '+entry.category;list.append(opt);
  const card=document.createElement('button');card.type='button';card.className='catalog-card';card.dataset.asset=entry.id;card.title=`Placera ${entry.name}${entry.staticOnly?' · statiskt dekorobjekt':''}`;card.setAttribute('aria-label',`Placera ${entry.name}`);
  const image=document.createElement('span');image.className='catalog-image';if(entry.thumb){const img=document.createElement('img');img.src=entry.thumb;img.alt='';img.loading='lazy';image.append(img);}else if(entry.id==='studio:orange-kitchen-chair')image.innerHTML='<svg viewBox="0 0 100 80" aria-hidden="true"><path fill="#aab6bd" d="M22 47h5v27h-5zm48 0h5v27h-5zM35 49h5v27h-5zm47-7h5v28h-5z"/><path fill="#df753c" d="M22 10h49v32H22zM17 42h60l10 10H27z"/></svg>';else image.textContent=entry.category==='egna'?'3D':entry.category==='bord'?'▤':'▣';
  if(entry.featured){const badge=document.createElement('span');badge.className='catalog-color-badge';badge.textContent='ORANGE';image.append(badge);}
  const name=document.createElement('strong');name.textContent=entry.name;const size=document.createElement('small');size.textContent=`${entry.width} × ${entry.depth} × ${entry.height} · ${entry.category}${entry.staticOnly?' · dekor':''}`;
  card.append(image,name,size);card.onclick=()=>armFurniture(entry);card.classList.toggle('active',pendingFurniture?.id===entry.id);cards.append(card);
 }if(list.options.length&&!entries.some(e=>e.id===list.value))list.selectedIndex=0;$('catalogCount').textContent=entries.length?`${entries.length} objekt · bredd × djup × höjd i modellenheter`:'Inga träffar. Prova färre sökord eller Alla kategorier.';
}
$('posterText').onchange=()=>{const o=lookup();if(!p().architecture.posters?.includes(o))return;const before=JSON.stringify(p());o.text=$('posterText').value.slice(0,140);commit(before);};
$('selectedSurface').onchange=()=>{const o=lookup();if(!o||o.source)return;const before=JSON.stringify(p());o.surface=$('selectedSurface').value;commit(before);};$('selectedSill').onchange=()=>{const o=lookup();if(!o||o.kind!=='window')return;const value=Number($('selectedSill').value);if(!Number.isFinite(value)||value<0||value>o.height-.15)return;const before=JSON.stringify(p());o.sill=value;commit(before);};
$('cutaway').onchange=redraw;$('showPhysics').onchange=redraw;$('selectedLabel').onchange=()=>{const o=lookup();if(!o||o.source)return;const before=JSON.stringify(p());o.name=$('selectedLabel').value.slice(0,60);commit(before);};
$('catalogSearch').oninput=renderCatalog;
$('catalogCategory').onchange=renderCatalog;
$('resetCatalog').onclick=()=>{$('catalogSearch').value='';$('catalogCategory').value='all';renderCatalog();$('catalogSearch').focus();};
function setBuildTool(tool){$('tool').value=tool;first=null;drawGesture=null;pendingFurniture=null;pendingTemplate=null;for(const b of document.querySelectorAll('[data-tool]'))b.classList.toggle('active',b.dataset.tool===tool);renderCatalog();redraw();}
for(const button of document.querySelectorAll('[data-tool]'))button.onclick=()=>{const tool=$('tool').value===button.dataset.tool&&button.dataset.tool!=='select'?'select':button.dataset.tool;setBuildTool(tool);status(tool==='select'?'Välj en byggdel eller möbel. Delete tar bort den markerade delen.':button.title+' · Esc avslutar verktyget.');};
for(const button of document.querySelectorAll('[data-tool="door"],[data-tool="window"],[data-tool="glazed"],[data-tool="opening"]')){
 button.draggable=true;
 button.addEventListener('dragstart',e=>{setBuildTool(button.dataset.tool);e.dataTransfer.setData('text/plain',button.dataset.tool);e.dataTransfer.effectAllowed='copy';});
}
for(const surface of [canvas,$('scene3d')]){
 surface.addEventListener('dragover',e=>{if(!['door','window','glazed','opening'].includes($('tool').value))return;e.preventDefault();e.dataTransfer.dropEffect='copy';
  if(surface===canvas){hover=point(e);drawPlan();}else{const pick=pick3d(e);hover3d=pick.surface||pick.ground;update3DPreview();}});
 surface.addEventListener('drop',e=>{const tool=e.dataTransfer.getData('text/plain');if(!['door','window','glazed','opening'].includes(tool))return;e.preventDefault();
  const q=surface===canvas?point(e):(()=>{const hit=pick3d(e);return hit.surface||hit.ground;})();
  if(q)handleBuild(q,tool,null);});
}
$('tool').onchange=()=>{const tool=$('tool').value;setBuildTool(tool);status('Valt: '+(toolLabels[tool]||tool)+'. Klicka i planen eller 3D. Esc avslutar.');};
$('cancelAction').onclick=()=>cancelTool();$('deleteAction').onclick=()=>$('remove').click();
$('placeFurniture').onclick=()=>{const entry=[...catalogEntries,...localCatalog].find(e=>e.id===$('catalog').value);if(entry)armFurniture(entry);};
$('glb').onchange=async e=>{try{for(const file of e.target.files){const entry=await importLocalGLB(file);localCatalog.push(entry);}renderCatalog();status('Egna GLB-filer tillagda i biblioteket.');}catch(err){status(err.message);}e.target.value='';};
$('doorInWall').onclick=()=>{const wall=arch().find(e=>e.id===selected&&['wall','window','glazed'].includes(e.kind));if(!wall){status('Markera en vägg i planen först.');return;}
 try{const len=Math.hypot(wall.b[0]-wall.a[0],wall.b[1]-wall.a[1]);if(len<1.45)throw Error('Väggen måste vara minst 1,45 enheter för en standarddörr på 1,20.');const before=JSON.stringify(p());selected=makeSegment('door',wall.a,wall.b).id;commit(before);status('Standarddörr 1,20 ritad mitt i väggen. Kollisionen klipps automatiskt.');}catch(err){status(err.message);}};
$('collisionMode').onchange=()=>{const o=lookup();if(!o||!objects().includes(o))return;
 const before=JSON.stringify(p());o.collision=$('collisionMode').value;commit(before);
 status(o.collision==='none'?'Möbeln är dekorativ: ingen gångkollision i FPS.':'Möbeln blockerar spelare i FPS.');};
$('newBlank').onclick=()=>{if(!window.confirm('Töm hela NY BANA? Ångra med Ctrl+Z innan du laddar om sidan.'))return;
 const before=JSON.stringify(p()),v=p();
 localStorage.removeItem(guideKey('walked'));localStorage.removeItem(guideKey('saved'));
 project=exportProject({projectId:v.projectId,name:v.name,ground:{...v.ground,floors:[]},createdAt:v.createdAt});
 selected=null;pendingFurniture=null;pendingTemplate=null;pendingYaw=0;first=null;hover=null;drag=null;offset={x:0,z:0};zoom=1;view3dCenter=null;view3dZoom=1;commit(before);
 status('Tom värld. Rita golv, väggar och öppningar. Kollision skapas automatiskt.');};
$('remove').onclick=()=>{const o=lookup();if(!o)return;if(o.source&&o.polygon){status('Floor 5:s ursprungliga golv bevaras. Ändra väggar eller lägg till nya golvytor.');return;}const before=JSON.stringify(p());
 const removedIds=new Set([o.id,...(floors().includes(o)?roomBoundaryIds(o,arch(),floors().filter(f=>f.id!==o.id)):[])]);
 for(const list of [p().ground.floors,arch(),objects(),p().gameplay.spawns,p().gameplay.objectives.hostages,p().architecture.posters||[],p().architecture.treatments||[]]){
  for(let i=list.length-1;i>=0;i--)if(removedIds.has(list[i].id))list.splice(i,1);
 }
 p().architecture.posters=(p().architecture.posters||[]).filter(d=>!removedIds.has(d.wallId));p().architecture.treatments=(p().architecture.treatments||[]).filter(d=>!removedIds.has(d.wallId));
 for(const key of ['bomb','rescue'])if(p().gameplay.objectives[key]===o)p().gameplay.objectives[key]=null;
 if(objects().includes(o)===false)for(const child of objects().filter(x=>x.mountId===o.id)){child.mountId=null;child.elevation=0;}
 p().assets.local=p().assets.local.filter(a=>objects().some(item=>item.assetId===a.assetId));
 selected=null;if(p().mode==='edit-floor5')model().floors=model().floors.filter(f=>f.source||p().ground.floors.some(g=>g.id===f.id));commit(before);};
$('duplicate').onclick=()=>{const o=lookup();if(!o||!objects().includes(o))return;pendingTemplate=structuredClone(o);pendingYaw=o.yaw;pendingFurniture={id:o.assetId||'clone',name:o.assetName||o.kind,width:o.w,depth:o.d,height:o.height};status('Placera kopian med musen. Fästa objekt följer med. Esc avslutar.');redraw();};
$('rotate').onclick=()=>{const o=lookup();if(o?.yaw===undefined)return;const before=JSON.stringify(p());rotateWithChildren(o,Math.PI/12);commit(before);};
for(const id of ['x','z','w','d'])$(id).onchange=()=>{const o=lookup(),value=Number($(id).value);if(!o||!Number.isFinite(value))return;const before=JSON.stringify(p());
 if(objects().includes(o)){if(id==='x'||id==='z'){if(Math.abs(value)>100){status('Koordinaten måste ligga inom ±100 modellenheter.');redraw();return;}moveObject(o,id==='x'?value:o.x,id==='z'?value:o.z);}else{if(value<=0||value>8){status('Ange ett mått mellan 0 och 8.');redraw();return;}o[id]=value;placementStatus(o);}}
 else if(markers().includes(o)){if(id==='x'||id==='z')moveObject(o,id==='x'?value:o.x,id==='z'?value:o.z);}
 else if(floors().includes(o)&&['w','d'].includes(id)){
  const info=beginDirectDrag(o,{x:o.x1,z:o.z1},'se'),q={x:id==='w'?o.x0+value:o.x1,z:id==='d'?o.z0+value:o.z1};
  if(!info||!applyDirectDrag(info,q)){redraw();return;}
 }
 else if(arch().includes(o)&&['x','z'].includes(id)&&directInsert(o)){
  const center=insertCenter(o),info=beginDirectDrag(o,center),q={...center,[id]:center[id]+value-o.a[id==='x'?0:1]};
  if(!applyDirectDrag(info,q)){redraw();return;}
 }
 else if(arch().includes(o)&&['x','z'].includes(id)){
  status('Dra väggens ändpunkt eller rummets hörn i vyn så att anslutningarna följer med.');redraw();return;
 }
 else if(arch().includes(o)&&id==='w'&&directInsert(o)){
  try{const center=insertCenter(o),planned=planSlideInsert(arch(),o.id,center,
   {width:value,posters:p().architecture.posters,treatments:p().architecture.treatments});
   parsePosters(p().architecture.posters||[],planned.entries);parseTreatments(p().architecture.treatments||[],planned.entries);
   arch().splice(0,arch().length,...planned.entries);
  }catch(e){status(e.message);redraw();return;}
 }
 commit(before);};
$('undo').onclick=()=>{if(!history.length)return;if(view==='walk')leaveWalk();future.push(JSON.stringify(p()));project=JSON.parse(history.pop());persist();redraw();queueGameLook();};
$('redo').onclick=()=>{if(!future.length)return;if(view==='walk')leaveWalk();history.push(JSON.stringify(p()));project=JSON.parse(future.pop());persist();redraw();queueGameLook();};
document.addEventListener('keyup',e=>{if(e.code==='Space')spaceHeld=false;heldMovement.delete(e.code);});
function cancelTool(){if(drag?.before||drag3d?.before)project=JSON.parse((drag||drag3d).before);
 const wasActive=$('tool').value!=='select'||pendingFurniture||first;if(!wasActive){selected=null;status('Markeringen borttagen.');}else status('Verktyget avslutat. Välj en del eller ett nytt byggverktyg.');setBuildTool('select');hover=null;hover3d=null;drag=null;drag3d=null;}
document.addEventListener('keydown',e=>{const typing=['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)||e.target.isContentEditable;
 if(e.key==='Escape'&&view!=='walk'){e.preventDefault();if(typing)e.target.blur();cancelTool();return;}
 if(typing)return;
 if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();if(lookup())$('remove').click();else status('Klicka på objektet först, tryck sedan Delete eller Backspace.');return;}
 if(movementKeys.has(e.code)&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&view!=='walk'){
  e.preventDefault();heldMovement.add(e.code);if(!movementFrame){movementLast=performance.now();movementFrame=requestAnimationFrame(animateMovement);}return;
 }
 if(e.code==='Space'){e.preventDefault();spaceHeld=true;}if(e.key.toLowerCase()==='r'){if(pendingFurniture){pendingYaw+=Math.PI/2;redraw();}else if(lookup()?.yaw!==undefined)$('rotate').click();}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();$('undo').click();}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();$('redo').click();}});
window.addEventListener('blur',()=>{stopMovement();spaceHeld=false;});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopMovement();});
for(const id of ['name','width','depth'])$(id).onchange=()=>{const before=JSON.stringify(p());if(id==='name')p().name=$('name').value.trim()||'Min bana';else{
  const n=clamp(Number($(id).value),8,100),b=p().ground.bounds;if(id==='width')b.x1=b.x0+n;else b.z1=b.z0+n;}
 try{project=parseProject(p());commit(before);}catch(e){project=JSON.parse(before);status(e.message);redraw();}};
$('check').onclick=()=>{try{
 const result=validateLevel(p(),{engine:true});p().validation=result;persist();
 const root=$('results');root.replaceChildren();
 const title=document.createElement('strong');title.className=result.summary.playable?'pass':'error';
 title.textContent=result.summary.playable?'SPELBAR I MOTORN':`${result.summary.errors} saker att ordna före en match`;root.append(title);
 const failed=result.results.filter(r=>r.status==='fail'),brief=document.createElement('p');
 brief.textContent=failed.length?'Det här krävs för en spelbar match. Du kan fortsätta bygga och spara när du vill.':'Du kan spela eller fortsätta bygga fritt. Möbler får stå nära varandra.';
 root.append(brief);
 if(failed.length){const lines=document.createElement('div');lines.textContent=failed.map(r=>`• ${r.detail}${r.fix?' — '+r.fix:''}`).join('\n');root.append(lines);}
 const details=document.createElement('details'),summary=document.createElement('summary');
 summary.textContent=`Visa tekniska detaljer (${result.results.length})`;details.append(summary);
 const all=document.createElement('div');all.textContent=result.results.map(r=>`${r.status==='fail'?'✕':r.status==='warn'?'!':r.status==='info'?'i':'✓'} ${r.check} ${r.id||''}: ${r.detail}${r.fix?' → '+r.fix:''}`).join('\n');
 details.append(all);root.append(details);
 status(result.summary.playable?'Banan kan spelas!':'Fortsätt bygg fritt. Speltestet visar bara det som måste lösas före match.');
}catch(e){status(e.message);}};
function download(bytes,name,type){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([bytes],{type}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}
$('saveJson').onclick=()=>{try{const doc=parseProject(p());download(JSON.stringify(doc,null,2)+'\n',p().projectId+'.json','application/json');status(p().assets.local.length?'JSON sparad. Använd ZIP för att också ta med egna modeller.':'Hela banprojektet sparat som JSON.');}catch(e){status(e.message);}};
$('save').onclick=async()=>{try{const files=new Map(),local=[];for(const id of new Set(objects().map(o=>o.assetId).filter(x=>x?.startsWith('local:')))){
  const row=await getLocalFile(id);if(!row?.data)throw Error('Egen GLB saknas: '+id);const bytes=new Uint8Array(row.data),file=`assets/models/${id.slice(6)}.glb`;
  if(await assetHash(bytes)!==id.slice(6))throw Error('GLB-hash stämmer inte.');files.set(file,bytes);local.push({assetId:id,file,bytes:bytes.length,license:'private, unverified'});
 }p().assets.local=local;const report=validateLevel(p(),{engine:true});p().validation=report;const bytes=await exportProjectZip(p(),files);
  download(bytes,p().projectId+'.zip','application/zip');persist();
  localStorage.setItem(guideKey('saved'),'1');updateFirstBuild();
  status('ZIP sparad med projekt och lokala tillgångar. '+(report.summary.playable?'Banan är spelbar.':'Du kan fortsätta bygga och testa spelbarheten senare.'));
 }catch(e){status('Kunde inte spara: '+e.message);}};
$('open').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{let incoming,files=new Map();if(file.name.toLowerCase().endsWith('.zip'))({project:incoming,files}=await parseProjectZip(await file.arrayBuffer()));else incoming=parseProject(await file.text());
  for(const [path,bytes] of files)if(path.endsWith('.glb'))await importLocalGLB(new File([bytes],path.split('/').at(-1),{type:'model/gltf-binary'}));
  for(const asset of incoming.assets.local)if(!await getLocalFile(asset.assetId))throw Error('Egen GLB saknas. Öppna ZIP-filen i stället.');
  if(view==='walk')leaveWalk();project=inheritFloor5Gameplay(correctOldOrangeChair(incoming));history=[];future=[];selected=null;pendingFurniture=null;pendingTemplate=null;pendingYaw=0;first=null;view3dCenter=null;view3dZoom=1;zoom=1;offset={x:0,z:0};$('name').value=p().name;$('width').value=p().ground.bounds.x1-p().ground.bounds.x0;$('depth').value=p().ground.bounds.z1-p().ground.bounds.z0;
  localCatalog=await localLibrary();for(const entry of localCatalog)entry.size=(await getLocalFile(entry.id))?.size;renderCatalog();persist();redraw();queueGameLook();status('Projektet öppnat. Kontrollera spelbarhet före provspelning.');
 }catch(err){status('Kunde inte öppna: '+err.message);}e.target.value='';};
$('preview').onclick=()=>{try{const report=validateLevel(p(),{engine:true});p().validation=report;if(!report.summary.playable)throw Error('Åtgärda '+report.summary.errors+' fel innan provspelning.');localStorage.setItem('cartridge-level-preview',JSON.stringify(p()));window.open('../fps/?level=preview','_blank','noopener');status('Privat provspelning öppnad från aktuellt projekt.');}catch(e){status(e.message);}};
function walkURL({embed=false,pose=null}={}){
 const params=new URLSearchParams({draft:String(Date.now())});
 if(embed)params.set('embed','1');
 if(new URLSearchParams(location.search).has('test'))params.set('test','1');
 if(pose&&[pose.x,pose.z,pose.yaw].every(Number.isFinite)){
  params.set('x',String(pose.x));params.set('z',String(pose.z));params.set('yaw',String(pose.yaw));}
 return '../fps/walk.html?'+params;
}
function preferredWalkPose(){const framePose=$('gameLookFrame').contentWindow?.studioWalkPose?.();
 if(framePose)return framePose;
 const focus=view3dCenter??frameBuiltFloors();return {x:focus.x,z:focus.z,yaw:orbit};
}
function closeGameLook({render=true}={}){
 clearTimeout(gameLookTimer);gameLookTimer=0;if(!gameLook)return;
 gameLook=false;$('gameLookPanel').hidden=true;$('gameLookFrame').src='about:blank';
 $('gameLook').classList.remove('active');$('gameLook').setAttribute('aria-pressed','false');
 $('scene3d').parentElement.classList.remove('game-look');if(render&&view==='3d')redraw();
}
function queueGameLook(){
 if(!gameLook)return;if(!floors().length){closeGameLook();return;}
 clearTimeout(gameLookTimer);gameLookTimer=setTimeout(()=>{
  if(!gameLook||view!=='3d')return;
  try{const pose=preferredWalkPose();localStorage.setItem('cartridge-level-walk',JSON.stringify(parseProject(p())));
   $('gameLookFrame').src=walkURL({embed:true,pose});
  }catch(err){status('Spelutseendet kunde inte uppdateras: '+err.message);}
 },450);
}
$('gameLook').onclick=()=>{if(gameLook){closeGameLook();return;}
 if(!floors().length){status('Rita ett golv först, sedan kan du visa banan som i spelet.');return;}
 if(view!=='3d')$('threeView').click();if(view!=='3d')return;
 gameLook=true;$('gameLookPanel').hidden=false;$('scene3d').parentElement.classList.add('game-look');
 $('gameLook').classList.add('active');$('gameLook').setAttribute('aria-pressed','true');
 redraw();queueGameLook();status('Spelutseendet visar spelets riktiga renderare. Bygg vidare i 3D till vänster.');};
$('gameLookClose').onclick=()=>closeGameLook();
$('walkView').onclick=()=>{try{if(view==='walk')return;if(!floors().length)throw Error('Rita ett golv först, sedan kan du gå runt direkt – spelmål behövs inte.');
 localStorage.setItem('cartridge-level-walk',JSON.stringify(parseProject(p())));
 walkReturnView=view;walkReturnLook=gameLook;walkPose=preferredWalkPose();if(gameLook)closeGameLook({render:false});
 if(view==='3d'&&renderer){renderer.dispose();renderer=null;}
 stopMovement();first=null;drawGesture=null;view='walk';canvas.hidden=true;$('scene3d').hidden=true;$('movePad').hidden=true;$('workGuide').hidden=true;$('walkFrame').hidden=false;$('walkFrame').src=walkURL({pose:walkPose});
 for(const id of ['planView','threeView','walkView'])$(id).classList.toggle('active',id==='walkView');status('Promenadvy: samma renderare och kollision som FPS. W A S D för att gå, musen för att se dig omkring.');
 }catch(e){status(e.message);}};
function leaveWalk(){if(view!=='walk')return;$('walkFrame').src='about:blank';$('walkFrame').hidden=true;$('movePad').hidden=false;$('workGuide').hidden=false;
 view=walkReturnView==='3d'?'3d':'plan';canvas.hidden=view!=='plan';$('scene3d').hidden=view!=='3d';if(view==='3d')ensureRenderer();
 for(const id of ['planView','threeView','walkView'])$(id).classList.toggle('active',id===(view==='3d'?'threeView':'planView'));redraw();
 if(view==='3d'&&walkReturnLook)$('gameLook').click();walkReturnLook=false;}
window.addEventListener('message',e=>{if(e.origin!==location.origin||![ $('walkFrame').contentWindow,$('gameLookFrame').contentWindow].includes(e.source))return;
 if(e.data?.type==='cartridge-walk-close'&&e.source===$('walkFrame').contentWindow)leaveWalk();
 if(e.data?.type==='cartridge-walk-ready'){localStorage.setItem(guideKey('walked'),'1');updateFirstBuild();}
});
$('demo').onclick=async()=>{try{const response=await fetch('../levels/synthetic-demo.json');if(!response.ok)throw Error('Demobanan saknas.');const before=JSON.stringify(p());project=parseProject(await response.text());selected=null;pendingFurniture=null;pendingTemplate=null;pendingYaw=0;first=null;offset={x:0,z:0};zoom=1;view3dCenter=null;view3dZoom=1;$('name').value=p().name;commit(before);status('Syntetisk testbana öppnad. Den är separat från ditt sparade projekt.');}catch(e){status(e.message);}};
$('planView').onclick=()=>{if(view==='walk')leaveWalk();closeGameLook({render:false});first=null;drawGesture=null;view='plan';canvas.hidden=false;$('scene3d').hidden=true;$('planView').classList.add('active');$('threeView').classList.remove('active');redraw();};
$('threeView').onclick=()=>{if(view==='walk')leaveWalk();if(!ensureRenderer())return;first=null;drawGesture=null;view3dCenter??=frameBuiltFloors();view='3d';canvas.hidden=true;$('scene3d').hidden=false;$('threeView').classList.add('active');$('planView').classList.remove('active');redraw();};
$('fit').onclick=()=>{zoom=1;view3dZoom=1;view3dCenter=frameBuiltFloors();offset={x:0,z:0};redraw();};
let repeatDelay=0,repeatTimer=0,repeated=false;
function stopMoveButton(){clearTimeout(repeatDelay);clearInterval(repeatTimer);repeatDelay=repeatTimer=0;}
for(const button of document.querySelectorAll('[data-move]')){
 button.addEventListener('pointerdown',e=>{if(e.button!==0)return;stopMoveButton();repeated=false;
  repeatDelay=setTimeout(()=>{repeated=true;moveView(button.dataset.move,Math.max(.5,Math.min(7,visibleSpan()*.12)));repeatTimer=setInterval(()=>moveView(button.dataset.move,visibleSpan()*.016),50);},300);
 });
 button.addEventListener('pointerup',stopMoveButton);button.addEventListener('pointercancel',stopMoveButton);button.addEventListener('pointerleave',stopMoveButton);
 button.addEventListener('click',e=>{if(e.detail===0||!repeated)moveView(button.dataset.move,Math.max(.5,Math.min(7,visibleSpan()*.12)));});
}
window.addEventListener('blur',stopMoveButton);
canvas.addEventListener('wheel',e=>{e.preventDefault();const before=point(e);zoom=clamp(zoom*(e.deltaY<0?1.1:.9),.5,10);const after=point(e);offset.x+=after.x-before.x;offset.z+=after.z-before.z;redraw();},{passive:false});
$('scene3d').addEventListener('wheel',e=>{e.preventDefault();view3dZoom=clamp(view3dZoom*(e.deltaY<0?1.15:.87),.5,10);redraw();},{passive:false});
let orbitDrag=null,pan3d=null,drag3d=null;
const ray3d=new T.Raycaster(),groundPlane=new T.Plane(new T.Vector3(0,1,0),0);
function hit3d(e){const r=$('scene3d').getBoundingClientRect();ray3d.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);const v=new T.Vector3();return ray3d.ray.intersectPlane(groundPlane,v)?{x:snap(v.x),z:snap(v.z)}:null;}
function pick3d(e){const ground=hit3d(e);const hit=ray3d.intersectObjects([...group.children,...(furnitureRoot?.children||[])],true).find(h=>{let node=h.object;while(node&&!node.userData.editId)node=node.parent;return !!node?.userData.editId;});
 let node=hit?.object;while(node&&!node.userData.editId)node=node.parent;
 return {ground,id:node?.userData.editId||null,handle:node?.userData.editHandle||null,
  surface:hit?{x:snap(hit.point.x),z:snap(hit.point.z)}:null};}
$('scene3d').addEventListener('pointerdown',e=>{if(e.button===1||e.button===2||(e.button===0&&spaceHeld)){e.preventDefault();$('scene3d').setPointerCapture(e.pointerId);pan3d={x:e.clientX,y:e.clientY};return;}if(e.button!==0)return;
 $('scene3d').setPointerCapture(e.pointerId);if(e.altKey){orbitDrag={x:e.clientX};return;}
 const pick=pick3d(e),tool=tab==='build'?$('tool').value:tab==='play'?$('gameTool').value:'furnish';
 const onWall=arch().some(a=>a.id===pick.id&&['wall','window','glazed'].includes(a.kind));
 const attachesToWall=tab==='build'&&['door','card-door','opening','window','glazed','poster','curtain','blind'].includes(tool);
 const q=onWall&&attachesToWall&&pick.surface?pick.surface:pick.ground;if(!q)return;
 if(pendingFurniture){try{const before=JSON.stringify(p());addFurniture(pendingFurniture,q.x,q.z);commit(before);}catch(err){status(err.message);}return;}
 if(tab==='play'){const marker=markers().find(m=>m.id===pick.id);if(marker){selected=marker.id;drag3d={item:marker,before:JSON.stringify(p()),dx:pick.ground.x-marker.x,dz:pick.ground.z-marker.z};redraw();}else try{const before=JSON.stringify(p());placeMarker(tool,q.x,q.z);commit(before);}catch(err){status(err.message);}return;}
 if(tab==='build'&&tool!=='select'){handleBuild(q,tool,{x:e.clientX,y:e.clientY,tool,view:'3d'});return;}
 if(pick.id){selected=pick.id;const item=lookup(),anchor=item?.a?{x:item.a[0],z:item.a[1]}:item;
  drag3d=item&&pick.ground?beginDirectDrag(item,pick.ground,pick.handle):null;
  if(!drag3d&&item&&(objects().includes(item)||arch().includes(item))&&pick.ground)drag3d={item,before:JSON.stringify(p()),dx:pick.ground.x-anchor.x,dz:pick.ground.z-anchor.z};
  else orbitDrag={x:e.clientX};redraw();return;}
 if(tab==='furnish'){status('Välj en möbel i listan; klicka sedan i 3D för att placera den.');return;}
 selected=null;orbitDrag={x:e.clientX};redraw();});
$('scene3d').addEventListener('pointermove',e=>{if(drag3d){const q=hit3d(e);
  if(q){if(drag3d.direct)applyDirectDrag(drag3d,q);else if(moveObject(drag3d.item,snap(q.x-drag3d.dx),snap(q.z-drag3d.dz)))redraw();}
  return;}
 if(pan3d){const dx=e.clientX-pan3d.x,dy=e.clientY-pan3d.y;pan3d={x:e.clientX,y:e.clientY};const scale=visibleSpan()/Math.max(1,$('scene3d').clientHeight)*1.4;
  const right={x:Math.cos(orbit),z:-Math.sin(orbit)},forward={x:-Math.sin(orbit),z:-Math.cos(orbit)},focus=view3dCenter??=frameBuiltFloors();
  focus.x+=(-dx*right.x+dy*forward.x)*scale;focus.z+=(-dx*right.z+dy*forward.z)*scale;position3DCamera();renderer.render(scene,camera);return;}
 if(orbitDrag){orbit+=(e.clientX-orbitDrag.x)*.005;orbitDrag.x=e.clientX;position3DCamera();renderer.render(scene,camera);return;}
 const pick=pick3d(e),onWall=arch().some(a=>a.id===pick.id&&['wall','window','glazed'].includes(a.kind));
 const tool=tab==='build'?$('tool').value:null,attachesToWall=['door','card-door','opening','window','glazed','poster','curtain','blind'].includes(tool);
 hover3d=onWall&&attachesToWall&&pick.surface?pick.surface:pick.ground;
 if(hover3d)$('coordinates').textContent=`X ${hover3d.x.toFixed(1)} · Z ${hover3d.z.toFixed(1)}`;update3DPreview();});
$('scene3d').addEventListener('pointerup',e=>{if(drawGesture?.view==='3d'&&first&&Math.hypot(e.clientX-drawGesture.x,e.clientY-drawGesture.y)>6){const q=hit3d(e);if(q)finishBuild(first,q,drawGesture.tool);}drawGesture=null;orbitDrag=null;pan3d=null;if(drag3d){commit(drag3d.before);drag3d=null;}});
$('scene3d').addEventListener('pointercancel',()=>{orbitDrag=null;pan3d=null;if(drag3d?.before){project=JSON.parse(drag3d.before);redraw();}drag3d=null;drawGesture=null;});
$('scene3d').addEventListener('contextmenu',e=>e.preventDefault());
new ResizeObserver(redraw).observe(canvas.parentElement);
$('name').value=p().name;$('width').value=p().ground.bounds.x1-p().ground.bounds.x0;$('depth').value=p().ground.bounds.z1-p().ground.bounds.z0;
localCatalog=await localLibrary().catch(()=>[]);for(const entry of localCatalog)entry.size=(await getLocalFile(entry.id))?.size;renderCatalog();redraw();
window.__levelStudio={get scene(){return model()},get project(){return p()},get selected(){return selected},get validation(){return validateLevel(p(),{engine:true})},get viewState(){const b=p().ground.bounds;return {view,planCenter:{x:(b.x0+b.x1)/2-offset.x,z:(b.z0+b.z1)/2-offset.z},threeCenter:{...(view3dCenter??frameBuiltFloors())},orbit,zoom,view3dZoom,panActive:!!planPan};},get visualColors(){const colors=[];furnitureRoot?.traverse(node=>{if(node.isMesh&&node.userData.editId)for(const material of Array.isArray(node.material)?node.material:[node.material])if(material?.color)colors.push({id:node.userData.editId,color:material.color.getHexString()});});return colors;},worldAtScreen:(x,y)=>point({clientX:x,clientY:y}),select:id=>{selected=id;redraw();},leaveWalk,
 screenWorldPoint:(x,z)=>{const [sx,sz]=screen(x,z),r=canvas.getBoundingClientRect();return {x:r.left+sx*r.width/canvas.width,y:r.top+sz*r.height/canvas.height};},
 screen3DPoint:(x,y,z)=>{const p=new T.Vector3(x,y,z).project(camera),r=$('scene3d').getBoundingClientRect();return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};},redraw};
