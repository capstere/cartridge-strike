import * as T from '../vendor/three/three.module.js';
import {exportProject,parseProject,parseProjectZip,exportProjectZip} from './build/level-project.mjs';
import {validateLevel} from './build/validate-level.mjs';
import {validate,corners,inside,segmentIntersectsRectangle,intersects} from './core.mjs';
import {wallPieces} from './build/architecture.mjs';
import {LIBRARY_ALL} from './library/catalog.mjs';
import {proceduralOf} from './library/procedural.mjs';
import {populateProcedural} from './library/procedural-mesh.mjs';
import {proposeSmartPose} from './smart-placement.mjs';
import {addModelToGroup,importLocalGLB,getLocalFile,localLibrary} from './library/models.mjs';
import {assetHash} from './library/glb-utils.mjs';

const $=id=>document.getElementById(id),canvas=$('plan'),ctx=canvas.getContext('2d');
const STORAGE='cartridge-new-level-v2';let project,selected=null,tab='build',first=null,hover=null,drag=null,view='plan',zoom=1,offset={x:0,z:0},orbit=.65,history=[],future=[],localCatalog=[];
try{project=parseProject(localStorage.getItem(STORAGE)||'');if(project.mode!=='new-level')throw Error('mode');}catch{project=exportProject({projectId:'lvl-'+crypto.randomUUID().slice(0,12)});}
const p=()=>project,arch=()=>p().architecture.added,floors=()=>p().ground.floors,objects=()=>p().furniture.added,markers=()=>[...p().gameplay.spawns,...[p().gameplay.objectives.bomb,p().gameplay.objectives.rescue,...p().gameplay.objectives.hostages].filter(Boolean)];
const snap=n=>Math.round(n*10)/10,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const status=s=>$('status').textContent=s;
const floorAt=(x,z)=>floors().find(f=>x>f.x0&&x<f.x1&&z>f.z0&&z<f.z1);
const nextId=prefix=>{let i=1;const ids=new Set([...floors(),...arch(),...objects()].map(o=>o.id));while(ids.has(prefix+String(i).padStart(4,'0')))i++;return prefix+String(i).padStart(4,'0');};
function commit(before){if(before===JSON.stringify(p()))return;history.push(before);if(history.length>60)history.shift();future=[];persist();redraw();}
function persist(){try{localStorage.setItem(STORAGE,JSON.stringify(p()));$('autosave').textContent='Ändringar sparade lokalt.';}catch{$('autosave').textContent='Lokal lagring är full. Spara ZIP nu.';}}
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
 const f={id,name,role,surface:$('surface').value,x0,z0,x1,z1};floors().push(f);if(role==='room'){
  for(const [u,v] of [[ [x0,z0],[x1,z0] ],[[x1,z0],[x1,z1]],[[x1,z1],[x0,z1]],[[x0,z1],[x0,z0]]])makeSegment('wall',u,v);
 }return f;}
function makeSegment(kind,a,b){const len=Math.hypot(a[0]-b[0],a[1]-b[1]);if(len<.25||len>90)throw Error('Byggdelen måste vara 0,25–90 modellenheter lång.');
 const id=nextId(['wall','window','glazed'].includes(kind)?'BYGG-V-':'BYGG-D-'),entry={id,kind,a,b,height:['door','card-door'].includes(kind)?2.4:2.85,thickness:.11,sill:Number($('sill').value)||.9,finish:'white'};
 arch().push(entry);return entry;}
function occupyData(){const zones=floors().map(f=>({id:f.id,status:'included',polygon:[[f.x0,f.z0],[f.x1,f.z0],[f.x1,f.z1],[f.x0,f.z1]]}));
 return {rooms:zones,excludedRooms:[],obstacles:[],walls:wallPieces(arch()),doors:arch().filter(a=>['door','card-door','opening'].includes(a.kind)).map(a=>({...a,blocked:false}))};}
function addFurniture(entry,x,z){const floor=floorAt(x,z);if(!floor)throw Error('Välj en punkt inuti en golvyta.');const id=nextId('NY-OBJ-');
 let item={id,roomId:floor.id,kind:'prop',assetId:entry.id,assetName:entry.name,x,z,yaw:0,w:entry.width,d:entry.depth,height:entry.height};
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
function updateProps(){const o=lookup();$('selectionName').textContent=o?`${o.name||o.assetName||o.team||o.kind||o.role} · ${o.id}`:'Ingenting';
 $('x').value=o?(o.x??o.x0??o.a?.[0]??''):'';$('z').value=o?(o.z??o.z0??o.a?.[1]??''):'';
 $('w').value=o?(o.w??(o.x1!==undefined?o.x1-o.x0:o.b?Math.hypot(o.b[0]-o.a[0],o.b[1]-o.a[1]):'')):'';
 $('d').value=o?(o.d??(o.z1!==undefined?o.z1-o.z0:'')):'';
 for(const id of ['x','z','w','d','remove','rotate','duplicate'])$(id).disabled=!o;
}
function moveObject(o,x,z){const floor=floorAt(x,z);if(!floor)return false;
 if(o.kind&&objects().includes(o)){
  let candidate={...o,x,z,roomId:floor.id,...proposeSmartPose(o,{x,z},objects())};
  const issue=validate(candidate,objects(),occupyData(),null,{emptyFixed:true});if(issue){status(issue);return false;}
  const dx=candidate.x-o.x,dz=candidate.z-o.z;Object.assign(o,candidate);
  for(const child of objects().filter(c=>c.mountId===o.id)){child.x=snap(child.x+dx);child.z=snap(child.z+dz);}return true;
 }
 if(markers().includes(o)){o.x=x;o.z=z;if(o.roomId)o.roomId=floor.id;return true;}
 return false;}
canvas.addEventListener('pointerdown',e=>{if(view!=='plan')return;canvas.setPointerCapture(e.pointerId);const q=point(e),tool=tab==='build'?$('tool').value:tab==='play'?$('gameTool').value:'furnish';
 if(tool==='select'||tool==='furnish'){const hit=find(q.x,q.z);if(hit){selected=hit.id;drag={before:JSON.stringify(p()),start:q,hit};redraw();return;}if(tool==='furnish'){status('Välj ett objekt i listan och klicka PLACERA.');return;}selected=null;redraw();return;}
 try{if(tab==='play'){const before=JSON.stringify(p());placeMarker(tool,q.x,q.z);commit(before);return;}
  if(!first){first=q;status('Startpunkt vald. Klicka motsatt hörn eller slutpunkt.');redraw();return;}
  const before=JSON.stringify(p()),a=first;first=null;
  selected=tool==='room'||tool==='corridor'?makeFloor(a,q,tool).id:makeSegment(tool,[a.x,a.z],[q.x,q.z]).id;
  commit(before);status('Ritad. Välj nästa del eller byt verktyg.');
 }catch(err){first=null;status(err.message);redraw();}});
canvas.addEventListener('pointermove',e=>{if(view!=='plan')return;const q=point(e);$('coordinates').textContent=`X ${q.x.toFixed(1)} · Z ${q.z.toFixed(1)}`;
 if(drag){if(moveObject(drag.hit,q.x,q.z))redraw();return;}hover=q;if(first)redraw();});
canvas.addEventListener('pointerup',()=>{if(drag){commit(drag.before);drag=null;}});
canvas.addEventListener('contextmenu',e=>{e.preventDefault();const o=lookup();if(o?.yaw!==undefined){const before=JSON.stringify(p());o.yaw=Math.round((o.yaw+Math.PI/12)*1000)/1000;commit(before);}});
function drawPlan(){const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#e6efea';ctx.fillRect(0,0,canvas.width,canvas.height);
 const b=p().ground.bounds;ctx.strokeStyle='#bfd1ca';ctx.lineWidth=1;for(let x=b.x0;x<=b.x1;x++)for(let z=b.z0;z<=b.z1;z++){const [sx,sz]=screen(x,z);if(sx>=0&&sx<canvas.width&&sz>=0&&sz<canvas.height)ctx.fillRect(sx,sz,1,1);}
 for(const f of floors()){const [x0,z0]=screen(f.x0,f.z0),[x1,z1]=screen(f.x1,f.z1);ctx.fillStyle=f.surface==='vinyl'?'#d3e8e3':'#f3e4d0';ctx.fillRect(x0,z0,x1-x0,z1-z0);ctx.strokeStyle=selected===f.id?'#ed993a':'#789b95';ctx.lineWidth=selected===f.id?3:1;ctx.strokeRect(x0,z0,x1-x0,z1-z0);ctx.fillStyle='#426367';ctx.font=`${12*dpr}px system-ui`;ctx.fillText(f.name,x0+8,z0+17*dpr);}
 for(const e of arch()){const a=screen(...e.a),b=screen(...e.b);ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.lineWidth=selected===e.id?7:Math.max(3,5*dpr);ctx.strokeStyle=selected===e.id?'#f2a03e':({wall:'#bc5961',glazed:'#35aa8a',window:'#46a0c0',door:'#dc9b4f','card-door':'#dc9b4f',opening:'#fff'}[e.kind]);ctx.stroke();}
 for(const o of objects()){const pts=corners(o).map(v=>screen(...v));ctx.beginPath();pts.forEach((v,i)=>i?ctx.lineTo(...v):ctx.moveTo(...v));ctx.closePath();ctx.fillStyle=selected===o.id?'#ffc874':'#5a7e88';ctx.fill();ctx.strokeStyle='#233e4a';ctx.stroke();}
 for(const m of markers()){const [x,z]=screen(m.x,m.z);ctx.beginPath();ctx.arc(x,z,selected===m.id?12*dpr:9*dpr,0,Math.PI*2);ctx.fillStyle=m.team==='analysts'?'#298bb7':m.team==='counterAnalysts'?'#d5684d':m.id.includes('BOMB')?'#dfb03e':m.id.includes('RESCUE')?'#41b89a':'#bf78b5';ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#16343b';ctx.font=`bold ${10*dpr}px system-ui`;ctx.fillText(m.team?String(m.index+1):m.id.includes('H')?'H':m.id.includes('BOMB')?'B':'R',x+11*dpr,z);}
 if(first&&hover){const a=screen(first.x,first.z),b=screen(hover.x,hover.z);ctx.beginPath();if(['room','corridor'].includes($('tool').value))ctx.rect(a[0],a[1],b[0]-a[0],b[1]-a[1]);else{ctx.moveTo(...a);ctx.lineTo(...b);}ctx.setLineDash([7,5]);ctx.lineWidth=2;ctx.strokeStyle='#106f79';ctx.stroke();ctx.setLineDash([]);}
}
const scene=new T.Scene();scene.background=new T.Color(0xd9e8e4);const camera=new T.PerspectiveCamera(55,1,.1,250);const renderer=new T.WebGLRenderer({canvas:$('scene3d'),antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));scene.add(new T.HemisphereLight(0xffffff,0x819a97,2.2));const sun=new T.DirectionalLight(0xffffff,2);sun.position.set(5,15,6);scene.add(sun);const group=new T.Group();scene.add(group);
function box(x,y,z,w,h,d,color,angle=0,opacity=1){const material=new T.MeshStandardMaterial({color,transparent:opacity<1,opacity,side:T.DoubleSide});material.userData.studioOwned=true;const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.rotation.y=angle;group.add(mesh);return mesh;}
function draw3D(){group.traverse(o=>{if(o.isMesh){o.geometry?.dispose();if(o.material?.userData?.studioOwned)o.material.dispose();}});group.clear();
 for(const f of floors())box((f.x0+f.x1)/2,-.06,(f.z0+f.z1)/2,f.x1-f.x0,.12,f.z1-f.z0,f.surface==='vinyl'?0xb7d6d0:0xd8cbbb);
 for(const e of wallPieces(arch())){const dx=e.b[0]-e.a[0],dz=e.b[1]-e.a[1],len=Math.hypot(dx,dz),angle=-Math.atan2(dz,dx),x=(e.a[0]+e.b[0])/2,z=(e.a[1]+e.b[1])/2;
  if(e.kind==='window'){box(x,e.sill/2,z,len,e.sill,e.thickness,0xc1d0d0,angle);box(x,(e.sill+e.height)/2,z,len,e.height-e.sill,.04,0x7ec4d2,angle,.38);}
  else box(x,e.height/2,z,len,e.height,e.thickness,e.kind==='glazed'?0x82d5c5:0xb6c2bf,angle,e.kind==='glazed'?.4:1);
 }
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
function redraw(){updateProps();$('undo').disabled=!history.length;$('redo').disabled=!future.length;if(view==='plan')drawPlan();else draw3D();}
function switchTab(t){tab=t;for(const b of document.querySelectorAll('[data-tab]'))b.classList.toggle('active',b.dataset.tab===t);for(const s of document.querySelectorAll('[data-panel]'))s.hidden=s.dataset.panel!==t;first=null;redraw();}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));
function renderCatalog(){const list=$('catalog'),query=$('catalogSearch').value.toLowerCase();list.replaceChildren();for(const entry of [...LIBRARY_ALL,...localCatalog].filter(e=>e.name.toLowerCase().includes(query))){const opt=document.createElement('option');opt.value=entry.id;opt.textContent=entry.name+' · '+entry.category;list.append(opt);}if(list.options.length)list.selectedIndex=0;}
$('catalogSearch').oninput=renderCatalog;
$('placeFurniture').onclick=()=>{const entry=[...LIBRARY_ALL,...localCatalog].find(e=>e.id===$('catalog').value);if(!entry)return;const b=p().ground.bounds,x=snap((b.x0+b.x1)/2-offset.x),z=snap((b.z0+b.z1)/2-offset.z),f=floorAt(x,z)||floors()[0];if(!f){status('Rita ett golv först.');return;}
 try{const before=JSON.stringify(p());addFurniture(entry,clamp(x,f.x0+.6,f.x1-.6),clamp(z,f.z0+.6,f.z1-.6));commit(before);}catch(e){status(e.message);}};
$('glb').onchange=async e=>{try{for(const file of e.target.files){const entry=await importLocalGLB(file);localCatalog.push(entry);}renderCatalog();status('Egna GLB-filer tillagda i biblioteket.');}catch(err){status(err.message);}e.target.value='';};
$('doorInWall').onclick=()=>{const wall=arch().find(e=>e.id===selected&&['wall','window','glazed'].includes(e.kind));if(!wall){status('Markera en vägg i planen först.');return;}
 try{const len=Math.hypot(wall.b[0]-wall.a[0],wall.b[1]-wall.a[1]);if(len<1.5)throw Error('Väggen är för kort för en dörr på minst 1,10.');const half=.65/len,before=JSON.stringify(p());const a=wall.a.map((n,i)=>snap(n+(wall.b[i]-n)*(.5-half))),b=wall.a.map((n,i)=>snap(n+(wall.b[i]-n)*(.5+half)));selected=makeSegment('door',a,b).id;commit(before);status('Dörr ritad mitt i väggen. Väggen klipps automatiskt i spelet.');}catch(err){status(err.message);}};
$('remove').onclick=()=>{const o=lookup();if(!o)return;const before=JSON.stringify(p());for(const list of [floors(),arch(),objects(),p().gameplay.spawns,p().gameplay.objectives.hostages]){const i=list.indexOf(o);if(i>=0)list.splice(i,1);}
 for(const key of ['bomb','rescue'])if(p().gameplay.objectives[key]===o)p().gameplay.objectives[key]=null;
 if(objects().includes(o)===false)for(const child of objects().filter(x=>x.mountId===o.id)){child.mountId=null;child.elevation=0;}
 p().assets.local=p().assets.local.filter(a=>objects().some(item=>item.assetId===a.assetId));
 selected=null;commit(before);};
$('duplicate').onclick=()=>{const o=lookup();if(!o||!objects().includes(o))return;try{const before=JSON.stringify(p()),copy={...o,id:nextId('NY-OBJ-'),x:snap(o.x+.5),mountId:o.mountId||undefined};const issue=validate(copy,objects(),occupyData(),null,{emptyFixed:true});if(issue)throw Error(issue);objects().push(copy);selected=copy.id;commit(before);}catch(e){status(e.message);}};
$('rotate').onclick=()=>{const o=lookup();if(o?.yaw===undefined)return;const before=JSON.stringify(p());o.yaw=snap(o.yaw+Math.PI/12);commit(before);};
for(const id of ['x','z','w','d'])$(id).onchange=()=>{const o=lookup(),value=Number($(id).value);if(!o||!Number.isFinite(value))return;const before=JSON.stringify(p());
 if(objects().includes(o)){if(id==='x'||id==='z'){if(!moveObject(o,id==='x'?value:o.x,id==='z'?value:o.z)){redraw();return;}}else{o[id]=value;const issue=validate(o,objects(),occupyData(),null,{emptyFixed:true});if(issue){project=JSON.parse(before);status(issue);redraw();return;}}}
 else if(markers().includes(o)){if(id==='x'||id==='z')moveObject(o,id==='x'?value:o.x,id==='z'?value:o.z);}
 else if(floors().includes(o)&&['w','d'].includes(id)){o[id==='w'?'x1':'z1']=o[id==='w'?'x0':'z0']+value;}
 else if(arch().includes(o)&&['x','z'].includes(id)){const axis=id==='x'?0:1,delta=value-o.a[axis];o.a[axis]+=delta;o.b[axis]+=delta;}
 commit(before);};
$('undo').onclick=()=>{if(!history.length)return;future.push(JSON.stringify(p()));project=JSON.parse(history.pop());persist();redraw();};
$('redo').onclick=()=>{if(!future.length)return;history.push(JSON.stringify(p()));project=JSON.parse(future.pop());persist();redraw();};
document.addEventListener('keydown',e=>{if(e.key==='Escape'){first=null;drag=null;redraw();}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();$('undo').click();}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();$('redo').click();}});
for(const id of ['name','width','depth'])$(id).onchange=()=>{const before=JSON.stringify(p());if(id==='name')p().name=$('name').value.trim()||'Min bana';else{
  const n=clamp(Number($(id).value),8,100),b=p().ground.bounds;if(id==='width')b.x1=b.x0+n;else b.z1=b.z0+n;}
 try{project=parseProject(p());commit(before);}catch(e){project=JSON.parse(before);status(e.message);redraw();}};
$('check').onclick=()=>{try{const result=validateLevel(p(),{engine:true});p().validation=result;persist();$('results').innerHTML='';const title=document.createElement('strong');title.className=result.summary.playable?'pass':'error';title.textContent=result.summary.playable?'SPELBAR I MOTORN':`${result.summary.errors} fel · ${result.summary.warnings} varningar`;const list=document.createElement('div');list.textContent=result.results.map(r=>`${r.status==='fail'?'✕':r.status==='warn'?'⚠':'✓'} ${r.check} ${r.id||''}: ${r.detail}${r.fix?' → '+r.fix:''}`).join('\n');$('results').append(title,list);status(result.summary.playable?'Motorns fysik och navigering godkände banan.':'Rätta markerade fel och kontrollera igen.');}catch(e){status(e.message);}};
function download(bytes,name,type){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([bytes],{type}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}
$('save').onclick=async()=>{try{const files=new Map(),local=[];for(const id of new Set(objects().map(o=>o.assetId).filter(x=>x?.startsWith('local:')))){
  const row=await getLocalFile(id);if(!row?.data)throw Error('Egen GLB saknas: '+id);const bytes=new Uint8Array(row.data),file=`assets/models/${id.slice(6)}.glb`;
  if(await assetHash(bytes)!==id.slice(6))throw Error('GLB-hash stämmer inte.');files.set(file,bytes);local.push({assetId:id,file,bytes:bytes.length,license:'private, unverified'});
 }p().assets.local=local;const report=validateLevel(p(),{engine:true});p().validation=report;const bytes=await exportProjectZip(p(),files);
  download(bytes,p().projectId+'.zip','application/zip');persist();status('ZIP sparad med projekt och lokala tillgångar. '+(report.summary.playable?'Banan är spelbar.':'Banan har ännu fel.'));
 }catch(e){status('Kunde inte spara: '+e.message);}};
$('open').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{let incoming,files=new Map();if(file.name.toLowerCase().endsWith('.zip'))({project:incoming,files}=await parseProjectZip(await file.arrayBuffer()));else incoming=parseProject(await file.text());
  if(incoming.mode==='edit-floor5'){
   const legacy=incoming.legacyPatch;if(!legacy)throw Error('Floor 5-projektet saknar ursprunglig patch. Öppna det i REDIGERA FLOOR 5.');
   for(const [path,bytes] of files)if(path.endsWith('.glb'))await importLocalGLB(new File([bytes],path.split('/').at(-1),{type:'model/gltf-binary'}));
   localStorage.setItem('cartridge-furniture-studio-0.17.0-v1',JSON.stringify(legacy));location.href='index.html';return;
  }
  for(const [path,bytes] of files)if(path.endsWith('.glb'))await importLocalGLB(new File([bytes],path.split('/').at(-1),{type:'model/gltf-binary'}));
  for(const asset of incoming.assets.local)if(!await getLocalFile(asset.assetId))throw Error('Egen GLB saknas. Öppna ZIP-filen i stället.');
  project=incoming;history=[];future=[];selected=null;first=null;$('name').value=p().name;$('width').value=p().ground.bounds.x1-p().ground.bounds.x0;$('depth').value=p().ground.bounds.z1-p().ground.bounds.z0;
  localCatalog=await localLibrary();for(const entry of localCatalog)entry.size=(await getLocalFile(entry.id))?.size;renderCatalog();persist();redraw();status('Projektet öppnat. Kontrollera spelbarhet före provspelning.');
 }catch(err){status('Kunde inte öppna: '+err.message);}e.target.value='';};
$('preview').onclick=()=>{try{const report=validateLevel(p(),{engine:true});p().validation=report;if(!report.summary.playable)throw Error('Åtgärda '+report.summary.errors+' fel innan provspelning.');localStorage.setItem('cartridge-level-preview',JSON.stringify(p()));window.open('../fps/?level=preview','_blank','noopener');status('Privat provspelning öppnad från aktuellt projekt.');}catch(e){status(e.message);}};
$('demo').onclick=async()=>{try{const response=await fetch('../levels/synthetic-demo.json');if(!response.ok)throw Error('Demobanan saknas.');const before=JSON.stringify(p());project=parseProject(await response.text());$('name').value=p().name;commit(before);status('Syntetisk testbana öppnad. Den är separat från ditt sparade projekt.');}catch(e){status(e.message);}};
$('planView').onclick=()=>{view='plan';canvas.hidden=false;$('scene3d').hidden=true;$('planView').classList.add('active');$('threeView').classList.remove('active');redraw();};
$('threeView').onclick=()=>{view='3d';canvas.hidden=true;$('scene3d').hidden=false;$('threeView').classList.add('active');$('planView').classList.remove('active');redraw();};
$('fit').onclick=()=>{zoom=1;offset={x:0,z:0};redraw();};
canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=clamp(zoom*(e.deltaY<0?1.1:.9),.5,6);redraw();},{passive:false});
let pan=null;$('scene3d').addEventListener('pointerdown',e=>{pan=e.clientX;$('scene3d').setPointerCapture(e.pointerId);});$('scene3d').addEventListener('pointermove',e=>{if(pan===null)return;orbit+=(e.clientX-pan)*.005;pan=e.clientX;const b=p().ground.bounds,span=Math.max(b.x1-b.x0,b.z1-b.z0),cx=(b.x0+b.x1)/2,cz=(b.z0+b.z1)/2;camera.position.set(cx+Math.sin(orbit)*span*.75,span*.72,cz+Math.cos(orbit)*span*.75);camera.lookAt(cx,0,cz);renderer.render(scene,camera);});$('scene3d').addEventListener('pointerup',()=>pan=null);
new ResizeObserver(redraw).observe(canvas.parentElement);
$('name').value=p().name;$('width').value=p().ground.bounds.x1-p().ground.bounds.x0;$('depth').value=p().ground.bounds.z1-p().ground.bounds.z0;
localCatalog=await localLibrary().catch(()=>[]);for(const entry of localCatalog)entry.size=(await getLocalFile(entry.id))?.size;renderCatalog();redraw();
window.__levelStudio={get project(){return p()},get validation(){return validateLevel(p(),{engine:true})},select:id=>{selected=id;redraw();},
 screenWorldPoint:(x,z)=>{const [sx,sz]=screen(x,z),r=canvas.getBoundingClientRect();return {x:r.left+sx*r.width/canvas.width,y:r.top+sz*r.height/canvas.height};},redraw};
