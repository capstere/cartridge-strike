/** Cartridge Strike Möbelstudion — completely separate read-only source consumer.
 * No import of the FPS app, game state, controllers or game renderer.
 * Edits live only here, in browser-local storage and downloaded review JSON.
 */
import * as T from '../vendor/three/three.module.js';
import {createFurnishings} from '../src/fps/furnishings.mjs';
import {EDITOR_VERSION,GAME_VERSION,BASE_COMMIT,DEFAULT_ROOMS,ROOM_LABELS,
  EDITABLE_KINDS,bounds,centroid,inside,distanceSegment,catalog,normalizeAngle,
  round,validate,exportPatch,parsePatch,isChanged} from './core.mjs';
const $=s=>document.querySelector(s),data=globalThis.SpelFloor5,worldSource=globalThis.SpelWorld;
if(!data||!worldSource||!T.WebGLRenderer)throw new Error('Spelplanen eller Three.js saknas.');
const baseScene=worldSource.build({doors:Object.fromEntries(data.doors.filter(d=>d.accessCardConfirmed).map(d=>[d.id,true]))});
const furnishings=createFurnishings(data,baseScene,{inside,distanceSegment});
const baseline=catalog(data,furnishings),baseMap=new Map(baseline.map(o=>[o.id,o]));
const STORAGE='cartridge-furniture-studio-0.17.0-v1';
const labels={chair:'Stol',table:'Bord',sofa:'Soffa','coffee-table':'Soffbord',desk:'Skrivbord',cabinet:'Skåp'};
const originalCounts={...baseline.reduce((r,o)=>(r[o.kind]=(r[o.kind]||0)+1,r),{})};
let items=baseline.map(o=>({...o,original:{...o}})),chosen=null,undoStack=[],redoStack=[],gesture=null,room='I09',cameraMode='top',zoom=16,azimuth=-.65,polar=.80,noticeTimer=null;
const $canvas=$('#viewport'),scene=new T.Scene();scene.background=new T.Color(0xdfe9e5);
const camera=new T.OrthographicCamera(-10,10,10,-10,.05,300),renderer=new T.WebGLRenderer({canvas:$canvas,antialias:true,alpha:false,powerPreference:'low-power'});
renderer.outputColorSpace=T.SRGBColorSpace;renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.65));
const target=new T.Vector3(7.5,0,11.8),raycaster=new T.Raycaster(),floorPlane=new T.Plane(new T.Vector3(0,1,0),0);
const boxGeometry=new T.BoxGeometry(1,1,1),pickMeshes=[],furnitureGroups=new Map(),originMaterials=[];
const mat=(color,rough=.8,metal=0,opts={})=>new T.MeshStandardMaterial({color,roughness:rough,metalness:metal,...opts});
const m={floor:mat(0xf5f8f3),rooms:mat(0xebf0ee),dark:mat(0x324b50),metal:mat(0x819b9b,.45,.6),white:mat(0xeceee9),wood:mat(0xc1a582),orange:mat(0xdf753c),blue:mat(0x629ca3),teal:mat(0x3b9291),selected:mat(0x17a7a2,.4),fixed:mat(0x9faeac,.85,0,{transparent:true,opacity:.77}),wall:mat(0xa9b7b5,.95,0,{transparent:true,opacity:.63}),glass:mat(0x8ec8cd,.26,.1,{transparent:true,opacity:.34,depthWrite:false}),door:mat(0xd2a36b)};
originMaterials.push(...Object.values(m));
const dynamicGroup=new T.Group();dynamicGroup.name='editable-furnishings';scene.add(dynamicGroup);
function addBox(parent,x,y,z,w,h,d,material,clickable=false){const o=new T.Mesh(boxGeometry,material);o.position.set(x,y,z);o.scale.set(Math.max(.005,w),Math.max(.005,h),Math.max(.005,d));parent.add(o);if(clickable)pickMeshes.push(o);return o;}
function polygonMesh(polygon,material,y){const s=new T.Shape();polygon.forEach(([x,z],i)=>i?s.lineTo(x,z):s.moveTo(x,z));s.closePath();const g=new T.ShapeGeometry(s);const o=new T.Mesh(g,material);o.rotation.x=Math.PI/2;o.position.y=y;o.material.side=T.DoubleSide;return o;}
function makeGround(){
 const floors=new T.Group();floors.name='accepted-floor';scene.add(floors);
 const shapes=data.floorPolygons.map(poly=>{const s=new T.Shape();poly.forEach(([x,z],i)=>i?s.lineTo(x,z):s.moveTo(x,z));s.closePath();return s;});
 const floor=new T.Mesh(new T.ShapeGeometry(shapes),m.floor);floor.rotation.x=Math.PI/2;floor.position.y=-.042;floor.material.side=T.DoubleSide;floors.add(floor);
 const subtle=new T.MeshBasicMaterial({color:0xa7c8c0,side:T.DoubleSide,transparent:true,opacity:.10,depthWrite:false});originMaterials.push(subtle);
 for(const r of data.rooms.filter(r=>r.status==='included')){const mesh=polygonMesh(r.polygon,subtle,-.029);floors.add(mesh);}
 const grid=new T.GridHelper(120,120,0x91b5b1,0x91b5b1);grid.position.y=-.037;grid.material.opacity=.14;grid.material.transparent=true;scene.add(grid);
 const wallGeo=new T.BoxGeometry(1,1,1);
 const walls=data.walls.filter(w=>Math.hypot(w.b[0]-w.a[0],w.b[1]-w.a[1])>.02);
 for(const type of ['wall','glass']){
  const source=walls.filter(w=>(w.surfaceType==='glazed'||w.surfaceType==='window')===(type==='glass'));
  const mesh=new T.InstancedMesh(wallGeo,m[type],source.length);
  const dummy=new T.Object3D();source.forEach((w,i)=>{const dx=w.b[0]-w.a[0],dz=w.b[1]-w.a[1];
    dummy.position.set((w.a[0]+w.b[0])/2,.36,(w.a[1]+w.b[1])/2);
    dummy.rotation.set(0,-Math.atan2(dz,dx),0);dummy.scale.set(Math.hypot(dx,dz),.72,Math.max(.065,w.thickness||.09));dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
  });mesh.instanceMatrix.needsUpdate=true;mesh.name='static-'+type+'-outlines';scene.add(mesh);
 }
 // Door openings are visual markers only — no new physical barriers.
 const doorMat=new T.LineBasicMaterial({color:0x9a795e,transparent:true,opacity:.75});originMaterials.push(doorMat);
 const segments=[];for(const d of data.doors.filter(d=>!d.blocked)){segments.push(d.a[0],.022,d.a[1],d.b[0],.022,d.b[1]);}
 const lines=new T.BufferGeometry();lines.setAttribute('position',new T.Float32BufferAttribute(segments,3));scene.add(new T.LineSegments(lines,doorMat));
 // Fixed benches, kitchen counters and closets provide context and collision feedback.
 const staticObstacles=data.obstacles.filter(o=>!EDITABLE_KINDS[o.kind]&&o.kind!=='uncertain-area');
 const fixed=new T.InstancedMesh(boxGeometry,m.fixed,staticObstacles.length);const dummy=new T.Object3D();
 staticObstacles.forEach((o,i)=>{const [x0,z0,x1,z1]=bounds(o.polygon),h=Math.min(.96,Math.max(.13,o.height||.75));dummy.position.set((x0+x1)/2,h/2,(z0+z1)/2);dummy.rotation.set(0,0,0);dummy.scale.set(x1-x0,h,z1-z0);dummy.updateMatrix();fixed.setMatrixAt(i,dummy.matrix);});fixed.instanceMatrix.needsUpdate=true;fixed.name='existing-fixed-fixtures';scene.add(fixed);
 // Existing autogenerated non-editable items remain as pale scenery markers.
 const visibleGeneratedIds=new Set(baseline.filter(o=>o.source==='generated-group').map(o=>o.id));
 const extra=furnishings.boxes.filter(b=>b.asset!=='chairDesk'&&!visibleGeneratedIds.has(b.furnishingId)&&!b.id.startsWith('fps-I12-sofa-'));
 const generated=new T.InstancedMesh(boxGeometry,m.fixed,extra.length);
 extra.forEach((b,i)=>{dummy.position.set(b.x,b.y,b.z);dummy.rotation.set(0,b.angle||0,0);dummy.scale.set(b.w,b.h,b.d);dummy.updateMatrix();generated.setMatrixAt(i,dummy.matrix);});generated.instanceMatrix.needsUpdate=true;generated.name='non-editable-furniture';scene.add(generated);
 const light=new T.HemisphereLight(0xffffff,0x9cbbaf,2.4);scene.add(light);const fill=new T.DirectionalLight(0xffffff,1.5);fill.position.set(-6,28,12);scene.add(fill);
}
function makeModel(item){
 const group=new T.Group();group.name='möbel-'+item.id;group.userData.editId=item.id;
 const put=(x,y,z,w,h,d,material)=>addBox(group,x,y,z,w,h,d,material,true);
 const w=item.w,d=item.d,chairOrange=['I09','I10','I19'].includes(item.roomId);const cloth=chairOrange?m.orange:m.blue;
 if(item.kind==='chair'){
  const seatH=.47;put(0,seatH,0,w*.91,.11,d*.86,cloth);
  put(0,.74,d*.39,w*.91,.46,.072,cloth);
  for(const x of [-w*.34,w*.34])for(const z of[-d*.30,d*.30])put(x,.22,z,.025,.43,.025,m.metal);
  put(0,.056,0,w*.90,.045,.06,m.dark);
  // Turquoise marker is at the front of the chair (opposite its back).
  put(0,.50,-d*.47,w*.28,.015,.035,m.teal);
 }else if(item.kind==='sofa'){
  put(0,.27,0,w,.45,d,m.blue);put(0,.66,d*.41,w,.44,d*.18,m.blue);
  for(const x of[-w*.43,w*.43])put(x,.49,0,w*.14,.34,d,m.blue);
  put(0,.52,-d*.07,w*.86,.14,d*.75,m.orange);
 }else if(item.kind==='table'||item.kind==='coffee-table'||item.kind==='desk'){
  const height=item.kind==='coffee-table'?.46:.75;
  put(0,height,0,w,.065,d,m.wood);
  for(const x of[-w*.43,w*.43])for(const z of[-d*.38,d*.38])put(x,height/2,z,.052,height-.03,.052,m.metal);
 }else{
  put(0,item.height/2,0,w,item.height,d,m.white);put(0,item.height-.06,d*.51,w*.83,.07,.018,m.dark);
 }
 group.position.set(item.x,0,item.z);group.rotation.y=item.yaw;
 group.traverse(c=>{if(c.isMesh)c.userData.editId=item.id});
 return group;
}
function syncModels(){
 dynamicGroup.clear();pickMeshes.length=0;furnitureGroups.clear();for(const o of items){if(o.deleted)continue;const group=makeModel(o);dynamicGroup.add(group);furnitureGroups.set(o.id,group);}
 updateHighlight();scheduleRender();
}
let boxHelper=null,selectionMarker=null;
function updateHighlight(){
 if(boxHelper){scene.remove(boxHelper);boxHelper.geometry.dispose();boxHelper=null;}
 if(selectionMarker){scene.remove(selectionMarker);selectionMarker.geometry.dispose();selectionMarker=null;}
 const item=items.find(o=>o.id===chosen&&!o.deleted),group=item&&furnitureGroups.get(item.id);
 if(!group)return;
 boxHelper=new T.BoxHelper(group,0x0d8f91);boxHelper.material.depthTest=false;boxHelper.renderOrder=7;scene.add(boxHelper);
 selectionMarker=new T.Mesh(new T.RingGeometry(Math.max(item.w,item.d)*.64,Math.max(item.w,item.d)*.64+.045,32),new T.MeshBasicMaterial({color:0x0d9995,side:T.DoubleSide,depthTest:false}));
 selectionMarker.rotation.x=-Math.PI/2;selectionMarker.position.set(item.x,.036,item.z);selectionMarker.renderOrder=6;scene.add(selectionMarker);
}
function updatePose(item){const g=furnitureGroups.get(item.id);if(g){g.position.set(item.x,0,item.z);g.rotation.y=item.yaw;g.updateMatrixWorld(true);}if(boxHelper)boxHelper.update();if(selectionMarker&&chosen===item.id)selectionMarker.position.set(item.x,.036,item.z);scheduleRender();}
let scheduled=false;
function scheduleRender(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;resize();renderer.render(scene,camera);});}
function resize(){const rect=$canvas.getBoundingClientRect();const w=Math.max(1,Math.floor(rect.width)),h=Math.max(1,Math.floor(rect.height));if(w!==renderer.domElement.width/renderer.getPixelRatio()||h!==renderer.domElement.height/renderer.getPixelRatio())renderer.setSize(w,h,false);
 const a=w/h;camera.left=-zoom*a/2;camera.right=zoom*a/2;camera.top=zoom/2;camera.bottom=-zoom/2;camera.updateProjectionMatrix();updateCamera();}
function updateCamera(){
 const span=Math.max(zoom,5),dist=span*1.8;
 if(cameraMode==='top'){camera.position.set(target.x,dist,target.z);camera.up.set(0,0,-1);}else{camera.position.set(target.x+Math.sin(polar)*Math.sin(azimuth)*dist,Math.cos(polar)*dist,target.z+Math.sin(polar)*Math.cos(azimuth)*dist);camera.up.set(0,1,0);}
 camera.lookAt(target);camera.updateMatrixWorld();
}
function view(mode){cameraMode=mode;$('#topView').classList.toggle('active',mode==='top');$('#threeView').classList.toggle('active',mode==='3d');$('#topView').setAttribute('aria-pressed',mode==='top');$('#threeView').setAttribute('aria-pressed',mode==='3d');scheduleRender();}
function goToRoom(id=room){const r=data.rooms.find(r=>r.id===id);if(!r)return;const [x0,z0,x1,z1]=bounds(r.polygon);target.set((x0+x1)/2,0,(z0+z1)/2);zoom=Math.max(4,Math.min(42,Math.max(z1-z0+3,(x1-x0+3)*.80)));scheduleRender();}
function whole(){const coords=data.floorPolygons.flat(),[x0,z0,x1,z1]=bounds(coords);target.set((x0+x1)/2,0,(z0+z1)/2);zoom=Math.max(z1-z0+7,(x1-x0+7)*.70);scheduleRender();}
function select(id,focus=false){const item=items.find(o=>o.id===id&&!o.deleted);chosen=item?.id||null;
 if(item){room=item.roomId;$('#room').value=room;if(focus){target.set(item.x,0,item.z);zoom=Math.min(zoom,6);}}
 renderList();renderProperties();updateHighlight();scheduleRender();
}
function snapshot(){return items.map(({original,...o})=>({...o,original:original?{...original}:undefined}));}
function checkpoint(before){const a=JSON.stringify(before),b=JSON.stringify(items);if(a===b)return false;
 undoStack.push(before);if(undoStack.length>60)undoStack.shift();redoStack=[];store();renderProperties();renderList();return true;
}
function restore(snap){items=snap.map(o=>({...o,original:o.original?{...o.original}:undefined}));if(!items.some(o=>o.id===chosen&&!o.deleted))chosen=null;syncModels();renderList();renderProperties();}
function store(){try{const doc=exportPatch(items,baseline);localStorage.setItem(STORAGE,JSON.stringify(doc));$('#autosave').textContent='Ändringar sparade lokalt. Ladda ned JSON för att kunna skicka dem.';}catch{$('#autosave').textContent='Lokal lagring fungerar inte — ladda ned JSON-filen direkt.';}}
function notify(message){$('#notice').textContent=message;$('#notice').hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>{$('#notice').hidden=true;},4600);}
function nameFor(o){return labels[o.kind]||'Möbel';}
function renderRooms(){const rooms=[...new Set(items.map(o=>o.roomId))].sort((a,b)=>DEFAULT_ROOMS.indexOf(a)===-1?1:DEFAULT_ROOMS.indexOf(b)===-1?-1:DEFAULT_ROOMS.indexOf(a)-DEFAULT_ROOMS.indexOf(b));const el=$('#room');el.replaceChildren();for(const id of rooms){const r=data.rooms.find(r=>r.id===id),opt=document.createElement('option');opt.value=id;opt.textContent=(ROOM_LABELS[id]||r?.name||id)+' · '+id;el.append(opt);}if(!rooms.includes(room))room=rooms[0];el.value=room;}
function renderList(){const el=$('#furnitureList');el.replaceChildren();const search=$('#search').value.trim().toLowerCase(),chairsOnly=$('#chairsOnly').checked;
 const visible=items.filter(o=>!o.deleted&&o.roomId===room&&(!chairsOnly||o.kind==='chair')&&(o.id.toLowerCase().includes(search)||nameFor(o).toLowerCase().includes(search)||o.roomId.toLowerCase().includes(search)));
 $('#listCount').textContent=visible.length+' objekt';
 if(!visible.length){const empty=document.createElement('p');empty.className='helper';empty.textContent='Inga möbler matchar filtret.';el.append(empty);}
 visible.forEach((o,i)=>{const b=document.createElement('button');b.type='button';b.setAttribute('role','option');b.setAttribute('aria-selected',o.id===chosen?'true':'false');b.classList.toggle('active',o.id===chosen);
  const n=document.createElement('span');n.textContent=nameFor(o)+' '+(i+1);const id=document.createElement('small');id.textContent=o.id.slice(-20);b.append(n,id);b.onclick=()=>select(o.id,true);el.append(b);
 });
 const patch=exportPatch(items,baseline),count=patch.placements.length+patch.added.length+patch.removed.length;$('#changeCount').textContent=count+' ändringar';$('#undo').disabled=!undoStack.length;$('#redo').disabled=!redoStack.length;
 $('#viewportStatus').textContent=(chosen?`Markerad: ${chosen} · `:'')+visible.length+' synliga objekt i listan · '+baseline.length+' redigerbara möbler totalt';
}
function renderProperties(){const o=items.find(x=>x.id===chosen&&!x.deleted);$('#emptySelection').hidden=!!o;$('#selectionPanel').hidden=!o;$('#selectionTag').textContent=o?o.roomId:'Ingen vald';
 if(!o)return;
 $('#selectedName').textContent=nameFor(o)+' · '+o.roomId;$('#selectedId').textContent=o.id;$('#x').value=round(o.x,2);$('#z').value=round(o.z,2);
 $('#degrees').textContent=Math.round(normalizeAngle(o.yaw)*180/Math.PI)+'°';$('#duplicate').disabled=!['chair','table','sofa'].includes(o.kind);
}
function positionIssue(candidate){const list=items.filter(o=>!o.deleted);return validate(candidate,list,data,baseMap.get(candidate.id));}
function changePose(id,delta,{quiet=false}={}){const o=items.find(o=>o.id===id&&!o.deleted);if(!o)return false;const next={...o,...delta};next.yaw=normalizeAngle(next.yaw);
 const problem=positionIssue(next);if(problem){$('#validation').textContent=problem;$('#validation').hidden=false;if(!quiet)notify(problem);return false;}
 $('#validation').hidden=true;Object.assign(o,{x:next.x,z:next.z,yaw:next.yaw});updatePose(o);renderProperties();return true;
}
function mutate(id,delta){const prev=snapshot();const ok=changePose(id,delta);if(ok)checkpoint(prev);return ok;}
function createDuplicate(){const source=items.find(x=>x.id===chosen&&!x.deleted);if(!source)return;
 const tag=source.kind==='chair'?'STOL':source.kind==='sofa'?'SOFFA':'BORD';let i=1,id;
 do{id=`NY-${tag}-${String(i++).padStart(3,'0')}`;}while(items.some(o=>o.id===id));
 const offsets=[[.7,0],[-.7,0],[0,.7],[0,-.7],[1.2,0],[-1.2,0],[0,1.2],[0,-1.2]];
 for(const [dx,dz]of offsets){const candidate={...source,id,source:'added',x:round(source.x+dx),z:round(source.z+dz),original:undefined};
  if(!validate(candidate,items.filter(o=>!o.deleted),data)){const before=snapshot();items.push(candidate);checkpoint(before);syncModels();renderRooms();select(id,true);notify('Kopia skapad. Dra den till önskad plats.');return;}
 }
 notify('Det finns ingen säker ledig plats intill möbeln.');
}
function removeSelection(){const o=items.find(x=>x.id===chosen&&!x.deleted);if(!o)return;const before=snapshot();o.deleted=true;chosen=null;checkpoint(before);syncModels();renderList();renderProperties();notify('Möbeln är borttagen i redigeraren. Spelet är orört.');}
function undo(){if(!undoStack.length)return;redoStack.push(snapshot());restore(undoStack.pop());store();notify('Ångrat.');}
function redo(){if(!redoStack.length)return;undoStack.push(snapshot());restore(redoStack.pop());store();notify('Gjort om.');}
function download(){const patch=exportPatch(items,baseline),blob=new Blob([JSON.stringify(patch,null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='CartridgeStrike-moblering-0.17.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);
 notify('Sparat! Skicka den nedladdade JSON-filen till mig här i chatten. Spelet har inte ändrats.');}
async function importFile(file){if(!file)return;if(file.size>300000)throw Error('JSON-filen är för stor.');const text=await file.text(),doc=JSON.parse(text),parsed=parsePatch(doc,baseline);
 const before=snapshot();items=parsed;chosen=null;checkpoint(before);syncModels();renderRooms();renderList();renderProperties();goToRoom(room);notify('Filen inläst. Du kan fortsätta möblera eller spara en ny JSON.');}
function readAutosave(){try{const saved=localStorage.getItem(STORAGE);if(!saved)return;items=parsePatch(JSON.parse(saved),baseline);$('#autosave').textContent='Dina tidigare ändringar har återställts från den här webbläsaren.';}catch{localStorage.removeItem(STORAGE);}}
function rayAt(event){const r=$canvas.getBoundingClientRect(),p=new T.Vector2((event.clientX-r.left)/r.width*2-1,-((event.clientY-r.top)/r.height*2-1));raycaster.setFromCamera(p,camera);return raycaster;}
function planePoint(ev){const pt=new T.Vector3();return rayAt(ev).ray.intersectPlane(floorPlane,pt)?pt:null;}
function lookupHit(ev){const intersections=rayAt(ev).intersectObjects(pickMeshes,false);for(const i of intersections){const id=i.object.userData.editId;if(items.some(o=>o.id===id&&!o.deleted))return id;}return null;}
function pan(dx,dy){const h=Math.max(1,$canvas.getBoundingClientRect().height),scale=zoom/h;if(cameraMode==='top'){target.x-=dx*scale;target.z-=dy*scale;}
 else{const right=new T.Vector3(1,0,0).applyQuaternion(camera.quaternion),up=new T.Vector3(0,1,0).applyQuaternion(camera.quaternion);target.x+=(-dx*right.x+dy*up.x)*scale;target.z+=(-dx*right.z+dy*up.z)*scale;}
 scheduleRender();}
function setUpEvents(){
 $('#room').onchange=e=>{room=e.target.value;renderList();goToRoom(room);select(null);};
 $('#search').oninput=renderList;$('#chairsOnly').onchange=renderList;
 $('#topView').onclick=()=>view('top');$('#threeView').onclick=()=>view('3d');$('#focus').onclick=()=>goToRoom(room);$('#whole').onclick=whole;
 $('#rotateLeft').onclick=()=>{const o=items.find(x=>x.id===chosen);if(o)mutate(o.id,{yaw:o.yaw-Math.PI/12});};
 $('#rotateRight').onclick=()=>{const o=items.find(x=>x.id===chosen);if(o)mutate(o.id,{yaw:o.yaw+Math.PI/12});};
 for(const k of ['x','z'])$('#'+k).onchange=e=>{const o=items.find(x=>x.id===chosen);if(!o)return;const value=Number(e.target.value);if(Number.isFinite(value))mutate(o.id,{[k]:value});renderProperties();};
 $('#duplicate').onclick=createDuplicate;$('#remove').onclick=removeSelection;$('#download').onclick=download;$('#undo').onclick=undo;$('#redo').onclick=redo;
 $('#reset').onclick=()=>{if(!window.confirm('Återställa ALLA dina ändringar i Möbelstudion? Spelet påverkas inte.'))return;
 const before=snapshot();items=baseline.map(o=>({...o,original:{...o}}));chosen=null;checkpoint(before);syncModels();renderRooms();renderList();renderProperties();notify('Möbleringen återställd till ursprungsläget.');};
 $('#importFile').onchange=async e=>{try{await importFile(e.target.files?.[0]);}catch(err){notify('Kunde inte öppna filen: '+err.message);}finally{e.target.value='';}};
 $canvas.oncontextmenu=e=>e.preventDefault();
 $canvas.addEventListener('pointerdown',e=>{
  if(!e.isPrimary&&e.pointerType!=='mouse')return;$canvas.focus();const hit=e.button===0?lookupHit(e):null;
  $canvas.setPointerCapture(e.pointerId);
  if(hit){select(hit);const o=items.find(o=>o.id===hit),pt=planePoint(e);
    gesture={type:'drag',id:hit,before:snapshot(),old:{x:o.x,z:o.z,yaw:o.yaw},offsetX:pt?o.x-pt.x:0,offsetZ:pt?o.z-pt.z:0,lastX:e.clientX,lastY:e.clientY};
  }else{gesture={type:e.button===2?'pan':cameraMode==='top'?'pan':'orbit',lastX:e.clientX,lastY:e.clientY};}
  e.preventDefault();
 });
 $canvas.addEventListener('pointermove',e=>{if(!gesture)return;const dx=e.clientX-gesture.lastX,dy=e.clientY-gesture.lastY;gesture.lastX=e.clientX;gesture.lastY=e.clientY;
  if(gesture.type==='drag'){
   const pt=planePoint(e);if(!pt)return;
   const snap=$('#snap').checked&&!e.altKey;const x=pt.x+gesture.offsetX,z=pt.z+gesture.offsetZ;
   changePose(gesture.id,{x:snap?round(Math.round(x*10)/10,3):round(x,3),z:snap?round(Math.round(z*10)/10,3):round(z,3)},{quiet:true});
  }else if(gesture.type==='pan')pan(dx,dy);
  else{azimuth-=dx*.008;polar=Math.max(.23,Math.min(1.42,polar+dy*.006));scheduleRender();}
 });
 const end=e=>{if(!gesture)return;const g=gesture;gesture=null;
  if(g.type==='drag'){checkpoint(g.before);}
 };
 $canvas.addEventListener('pointerup',end);$canvas.addEventListener('pointercancel',end);
 $canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(2.5,Math.min(124,zoom*Math.exp(e.deltaY*.0012)));scheduleRender();},{passive:false});
 document.addEventListener('keydown',e=>{if(e.target.closest('input,textarea,select'))return;
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();if(e.shiftKey)redo();else undo();return;}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();redo();return;}
  const o=items.find(x=>x.id===chosen&&!x.deleted);if(!o)return;
  const k=e.key.toLowerCase(),step=e.shiftKey?.5:.1;
  const change=k==='q'?{yaw:o.yaw-Math.PI/12}:k==='e'?{yaw:o.yaw+Math.PI/12}:
   k==='arrowleft'?{x:o.x-step}:k==='arrowright'?{x:o.x+step}:
   k==='arrowup'?{z:o.z-step}:k==='arrowdown'?{z:o.z+step}:null;
  if(change){e.preventDefault();mutate(o.id,change);return;}
  if(k==='delete'||k==='backspace'){e.preventDefault();removeSelection();}
  if(k==='escape'){select(null);}
 });
 new ResizeObserver(scheduleRender).observe($canvas.parentElement);
}
function bootstrap(){makeGround();readAutosave();renderRooms();syncModels();setUpEvents();goToRoom('I09');view('top');renderList();renderProperties();$('#loading').hidden=true;
 window.__furnitureEditor={getState:()=>({version:EDITOR_VERSION,sourceCommit:BASE_COMMIT,gameVersion:GAME_VERSION,objects:items.length,chairs:items.filter(o=>o.kind==='chair'&&!o.deleted).length,
   authored:originalCounts.chair||0,selected:chosen,changed:exportPatch(items,baseline).placements.length+exportPatch(items,baseline).added.length+exportPatch(items,baseline).removed.length,view:cameraMode,gameModuleLoaded:!!globalThis.__fps}),
  select:id=>select(id,true),getPatch:()=>exportPatch(items,baseline),getItem:id=>items.find(o=>o.id===id),
  screenPoint:id=>{const group=furnitureGroups.get(id);if(!group)return null;const r=$canvas.getBoundingClientRect();const p=group.position.clone().add(new T.Vector3(0,.5,0)).project(camera);return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};},
  move:(id,x,z)=>mutate(id,{x,z}),rotate:(id,degrees)=>{const o=items.find(o=>o.id===id);return o&&mutate(id,{yaw:o.yaw+degrees*Math.PI/180});}};
}
try{bootstrap();}catch(e){console.error(e);$('#loading').textContent='Möbelstudion kunde inte starta: '+e.message;}