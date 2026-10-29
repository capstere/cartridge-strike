/** Live visual preview of the original game skeleton and authored static parts. */
import * as T from '../vendor/three/three.module.js';
import {loadCharacterLibrary,createAuthoredAvatar,disposeAvatar} from '../src/fps/character-library.mjs';
import {REQUIRED_CLIPS} from './project-schema.mjs';
import {FashionPreview} from './fashion-preview.mjs';
const RAD=Math.PI/180,SW=480,SH=680,PW=720,PH=660;
function characterId(gender){
 for(let i=0;i<200;i++){
  const id='design-'+i;
  const seed=[...id].reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))>>>0,7);
  if((seed%3===0)===(gender==='female'))return id;
 }
 throw Error('Kunde inte välja grundrigg.');
}
export class DesignWorkbench{
 constructor(preview,bases){
  this.preview=preview;this.bases=bases;
  this.renderer=null;this.scene=null;this.avatar=null;this.project=null;
  this.objectRoot=null;this.partMeshes=new Map();
  this.fashion=new FashionPreview(()=>this.renderSheet());this.focus='body';this.faceView='front';this.faceCanvas=null;this.animationSpeed=1;
  this.yaw=.44;this.pitch=.13;this.zoom=1;this.flipped=false;this.playing=false;
  this.currentAction=null;this.initialized=false;this.lastFrame=0;this.frame=0;
 }
 async initialize(){
  this.renderer=new T.WebGLRenderer({canvas:this.preview,antialias:true,preserveDrawingBuffer:true});
  this.renderer.setPixelRatio(1);this.renderer.setSize(PW,PH,false);
  this.renderer.outputColorSpace=T.SRGBColorSpace;
  this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.3;
  this.scene=new T.Scene();this.scene.background=new T.Color(0xf1f7f5);
  this.scene.add(new T.HemisphereLight(0xffffff,0x83979e,2.25));
  const key=new T.DirectionalLight(0xffffff,2.2);key.position.set(-3,6,5);this.scene.add(key);
  const fill=new T.DirectionalLight(0xe5edff,1.2);fill.position.set(3,4,-4);this.scene.add(fill);
  this.grid=new T.GridHelper(5,25,0xa3bdbc,0xd7e5e1);this.grid.position.y=-.013;this.scene.add(this.grid);
  this.objectRoot=new T.Group();this.objectRoot.name='object-workshop';this.scene.add(this.objectRoot);
  this.camera=new T.OrthographicCamera(-1.6,1.6,1.47,-1.47,.01,100);
  this.sheetCamera=new T.OrthographicCamera(-1.17*SW/SH,1.17*SW/SH,1.17,-1.17,.01,100);
  this.faceCamera=new T.OrthographicCamera(-.38,.38,.38,-.38,.01,100);
  await loadCharacterLibrary();
  this.initialized=true;
 }
 update(project,{recreate=false,rebuild=false}={}){
  if(!this.initialized)return;
  const old=this.project;this.project=project;
  if(project.kind==='character'&&(!this.avatar||recreate||old?.base.gender!==project.base.gender||old?.base.team!==project.base.team)){
   this.clearParts();this.fashion.dispose();
   if(this.avatar){this.avatar.holder.removeFromParent();disposeAvatar(this.avatar);}
   this.avatar=createAuthoredAvatar(project.base.team==='hostage'?'analysts':project.base.team,characterId(project.base.gender),project.base.team==='hostage');
   this.scene.add(this.avatar.holder);
   rebuild=true;
  }
  if(this.avatar)this.avatar.holder.visible=project.kind==='character';
  this.objectRoot.visible=project.kind==='object';
  // All fashion overlays attach in the same canonical idle rest pose.
  // This avoids misaligned decals after a user previously previewed crouching or death.
  if(project.kind==='character'&&this.avatar)this.pose('Idle_Loop',false);
  this.updateAppearance();
  if(rebuild||old?.kind!==project.kind)this.rebuildParts();
  else if(project.kind==='character'&&this.avatar)this.pose(project.pose,false);
  this.renderSheet();
 }
 updateAppearance(){
  if(!this.avatar||!this.project)return;
  const {palette:p,body,base}=this.project;
  const customClothes=this.project.creative?.outfit&&this.project.creative.outfit!=='original';
  const customHair=this.project.creative?.hair&&this.project.creative.hair!=='original';
  const hideTactical=base.template==='blank'||base.template==='civilian'||customClothes;
  const seen=new Set();
  for(const mesh of this.avatar.meshes){
   const m=mesh.material,name=m?.name||'',objectName=mesh.name||'';
   mesh.visible=!(hideTactical&&/^(continuous-(chest|back)-rig|vest-pocket|pocket-flap|shoulder-webbing|radio|radio-aerial|headset|chest-role-patch|back-role-patch)$/.test(objectName))&&!(customHair&&name==='hair');
   if(!m?.color||seen.has(m))continue;
   seen.add(m);
   if(name==='jacket-fabric')m.color.set(p.jacket);
   if(name==='trousers-fabric')m.color.set(p.pants);
   if(name==='vest-shell')m.color.set(p.vest);
   if(name==='hair')m.color.set(p.hair);
   if(name==='face-skin')m.color.set(p.skin);
  }
  for(const mesh of this.avatar.meshes){
   const n=mesh.name||'',m=mesh.material;
   if(!m?.color)continue;
   if(/^(boot-shell|boot-shaft)/.test(n))m.color.set(p.boots);
   else if(n.startsWith('continuous-')||n==='vest-pocket'||n==='shoulder-webbing')m.color.set(p.vest);
   else if(n==='pocket-flap')m.color.set(p.accent);
  }
  const scale=this.avatar.scale;
  this.avatar.holder.scale.set(scale*body.width/100,scale*body.height/100,scale*body.width/100);
  if(this.project.kind==='character')this.fashion.create(this.project,this.avatar);
  else this.fashion.dispose();
 }
 createPartMesh(part){
  let g;
  switch(part.shape){
   case 'sphere':g=new T.SphereGeometry(.5,18,12);break;
   case 'cylinder':g=new T.CylinderGeometry(.5,.5,1,18);break;
   case 'cone':g=new T.ConeGeometry(.5,1,18);break;
   case 'torus':g=new T.TorusGeometry(.42,.12,10,24);break;
   default:g=new T.BoxGeometry(1,1,1);
  }
  const material=new T.MeshStandardMaterial({color:part.color,roughness:.76,metalness:.035,side:T.DoubleSide});
  const mesh=new T.Mesh(g,material);mesh.name=part.name;mesh.userData.designId=part.id;
  mesh.castShadow=false;mesh.receiveShadow=true;
  mesh.position.fromArray(part.position);
  mesh.rotation.set(...part.rotation.map(x=>x*RAD));
  mesh.scale.fromArray(part.dimensions);
  mesh.visible=part.visible;
  return mesh;
 }
 clearParts(){
  for(const mesh of this.partMeshes.values()){
   mesh.removeFromParent();mesh.geometry.dispose();mesh.material.dispose();
  }
  this.partMeshes.clear();
 }
 rebuildParts(){
  this.clearParts();
  const p=this.project;if(!p)return;
  if(p.kind==='character'&&this.avatar){
   // Define attachments in the neutral character space, then parent to a named bone.
   // This preserves their rest placement while following existing motion clips.
   this.avatar.holder.scale.setScalar(this.avatar.scale);
   this.pose('Idle_Loop',false);
  }
  for(const part of p.parts){
   const mesh=this.createPartMesh(part);
   this.partMeshes.set(part.id,mesh);
   if(p.kind==='object'){this.objectRoot.add(mesh);continue;}
   if(!this.avatar)continue;
   this.avatar.root.add(mesh);
   if(part.anchor!=='root'){
    const bone=this.avatar.bones.get(part.anchor);
    if(!bone)throw Error('Skelettet saknar fästpunkt: '+part.anchor);
    this.avatar.root.updateWorldMatrix(true,true);
    bone.attach(mesh);
   }
  }
  this.updateAppearance();
  if(p.kind==='character')this.pose(p.pose,false);
  this.playing=false;
 }
 updatePartTransforms(){
  // Reparent whenever a neutral-space position changes: bone-local space is
  // not equal to the character coordinates displayed on the sliders.
  this.rebuildParts();
 }
 pose(name,play=false){
  if(!this.avatar||!this.avatar.clips.has(name))return false;
  this.playing=play;
  const mixer=this.avatar.mixer;
  mixer.stopAllAction();
  this.currentAction=mixer.clipAction(this.avatar.clips.get(name));
  this.currentAction.reset().setEffectiveWeight(1);
  if(name==='Death01'){this.currentAction.setLoop(T.LoopOnce,1);this.currentAction.clampWhenFinished=true;}
  else this.currentAction.setLoop(T.LoopRepeat,Infinity);
  this.currentAction.play();
  mixer.setTime(.23);
  this.avatar.root.updateWorldMatrix(true);
  this.avatar.root.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});
  return true;
 }
 playToggle(){
  if(!this.avatar||this.project?.kind!=='character')return false;
  this.playing=!this.playing;
  if(this.playing&&!this.currentAction?.isRunning())this.pose(this.project.pose,true);
  this.lastFrame=0;return this.playing;
 }
 tick(time){
  if(!this.initialized||!this.playing||this.project?.kind!=='character')return;
  const delta=this.lastFrame?Math.max(0,Math.min(.06,(time-this.lastFrame)/1000)):0;
  this.lastFrame=time;
  this.avatar.mixer.update(delta*this.animationSpeed);
  this.avatar.root.updateMatrixWorld(true);
  this.renderPreview();
  if(++this.frame%12===0)this.renderSheet();
 }
 getFraming(){
  if(this.project?.kind==='character'){
   if(this.focus==='head'&&this.avatar){const v=this.avatar.bones.get('Head')?.getWorldPosition(new T.Vector3());if(v)return {center:v,span:.74};}
   return {center:new T.Vector3(0,.90,0),span:2.43};
  }
  const box=new T.Box3();
  for(const mesh of this.partMeshes.values())if(mesh.visible)box.expandByObject(mesh);
  if(box.isEmpty())return {center:new T.Vector3(0,.4,0),span:2.4};
  const size=new T.Vector3(),center=new T.Vector3();box.getSize(size);box.getCenter(center);
  return {center,span:Math.max(1.5,size.y*1.35,size.x*1.8,size.z*1.8)};
 }
 renderPreview(){
  if(!this.initialized||!this.project)return;
  const {center,span}=this.getFraming();
  this.grid.visible=true;
  this.renderer.setSize(PW,PH,false);
  const aspect=PW/PH;
  this.camera.left=-span*aspect/2;this.camera.right=span*aspect/2;
  this.camera.top=span/2;this.camera.bottom=-span/2;
  this.camera.zoom=this.zoom;
  const dist=4;
  this.camera.position.set(center.x+Math.sin(this.yaw)*dist*Math.cos(this.pitch),center.y+Math.sin(this.pitch)*dist,center.z+Math.cos(this.yaw)*dist*Math.cos(this.pitch));
  this.camera.lookAt(center);this.camera.updateProjectionMatrix();
  this.renderer.render(this.scene,this.camera);
 }
 renderSheet(){
  if(!this.initialized||!this.project)return;
  const {center,span}=this.getFraming(),s=span/2,ratio=SW/SH,flip=this.flipped?-1:1;
  const positions={front:[0,0,4*flip],back:[0,0,-4*flip],left:[-4*flip,0,0],right:[4*flip,0,0]};
  this.grid.visible=false;
  this.renderer.setSize(SW,SH,false);
  this.sheetCamera.left=-s*ratio;this.sheetCamera.right=s*ratio;
  this.sheetCamera.top=s;this.sheetCamera.bottom=-s;this.sheetCamera.zoom=1;
  for(const [name,canvas]of this.bases){
   const p=positions[name];
   this.sheetCamera.position.set(center.x+p[0],center.y+p[1],center.z+p[2]);
   this.sheetCamera.lookAt(center);this.sheetCamera.updateProjectionMatrix();
   this.renderer.render(this.scene,this.sheetCamera);
   const ctx=canvas.getContext('2d');
   ctx.clearRect(0,0,SW,SH);
   ctx.drawImage(this.renderer.domElement,0,0,SW,SH);
  }
  this.renderFace();
  this.renderPreview();
 }
 renderFace(view=this.faceView){
  if(!this.initialized||!this.avatar||this.project?.kind!=='character'||!this.faceCanvas)return;
  const origin=this.avatar.bones.get('Head')?.getWorldPosition(new T.Vector3());if(!origin)return;
  const size=1024,zoom=.40;
  this.faceCamera.left=-zoom;this.faceCamera.right=zoom;this.faceCamera.top=zoom;this.faceCamera.bottom=-zoom;
  const side=this.flipped?-1:1;
  const positions={front:[0,0,3.2*side],left:[-3.2*side,0,0],right:[3.2*side,0,0]};
  const p=positions[view]||positions.front;
  this.faceCamera.position.copy(origin).add(new T.Vector3(...p));
  this.faceCamera.lookAt(origin);this.faceCamera.updateProjectionMatrix();
  this.renderer.setSize(size,size,false);this.grid.visible=false;
  this.renderer.render(this.scene,this.faceCamera);
  const ctx=this.faceCanvas.getContext('2d');ctx.clearRect(0,0,size,size);
  ctx.drawImage(this.renderer.domElement,0,0,size,size);
 }
 scrub(fraction){
  if(!this.avatar||!this.currentAction)return;
  this.playing=false;
  const clip=this.currentAction.getClip();
  this.avatar.mixer.setTime(Math.min(clip.duration-.001,Math.max(0,fraction)*clip.duration));
  this.avatar.root.updateMatrixWorld(true);this.renderSheet();
 }
 getPartInstances(){
  this.scene?.updateMatrixWorld(true);
  return (this.project?.parts||[]).filter(part=>part.visible&&this.partMeshes.has(part.id)).map(part=>({
   id:part.id,name:part.name,anchor:part.anchor,mesh:this.partMeshes.get(part.id)
  }));
 }
 getClips(){return this.avatar?[...this.avatar.clips.keys()]:[];}
 getBones(){return this.avatar?[...this.avatar.bones.keys()]:[];}
 dispose(){
  this.clearParts();this.fashion.dispose();
  if(this.avatar){this.avatar.holder.removeFromParent();disposeAvatar(this.avatar);}
  this.renderer?.dispose();
 }
}
