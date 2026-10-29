/** Low-poly style mockups mounted to the actual original game bones.
 * This is a VISUAL CONCEPT, not a re-skinned final garment. No runtime files modified.
 */
import * as T from '../vendor/three/three.module.js';
import {RoundedBoxGeometry} from '../vendor/three/addons/geometries/RoundedBoxGeometry.js';
import {makeCreative} from './creative-schema.mjs';

const add=(root,bone,geometry,material,name,position,scale,rotation)=>{
 const mesh=new T.Mesh(geometry,material);mesh.name='creative-'+name;
 mesh.position.set(...position);
 if(rotation)mesh.rotation.set(...rotation);
 if(scale)mesh.scale.set(...scale);
 root.add(mesh);root.updateWorldMatrix(true,true);
 if(bone)bone.attach(mesh);
 return mesh;
};
export class FashionPreview{
 constructor(onRedraw=()=>{}){this.onRedraw=onRedraw;this.parts=[];this.textures=[];this.avatar=null;this.signature='';this.image=null;}
 clear(){
  for(const mesh of this.parts){
   mesh.removeFromParent();mesh.geometry.dispose();mesh.material.dispose();
  }
  for(const t of this.textures)t.dispose();
  this.parts=[];this.textures=[];this.signature='';this.image=null;
 }
 create(project,avatar){
  if(!avatar||project.kind!=='character'){this.clear();this.avatar=null;return;}
  const c=project.creative||makeCreative(),p=project.palette;
  const signature=JSON.stringify({c,p,gender:avatar.gender});
  if(this.avatar===avatar&&this.signature===signature)return;
  this.clear();this.avatar=avatar;this.signature=signature;this.lastPalette=p;
  avatar.root.updateWorldMatrix(true,true);
  const chest=avatar.bones.get('spine_03'),head=avatar.bones.get('Head'),pelvis=avatar.bones.get('pelvis');
  if(!chest||!head||!pelvis)return;
  const standard=(color,roughness=.88)=>new T.MeshStandardMaterial({color,roughness,side:T.DoubleSide});
  const solid=(g,m,name,pos,bone,scale=null,rot=null)=>{
   const mesh=add(avatar.root,bone,g,m,name,pos,scale,rot);
   this.parts.push(mesh);return mesh;
  };
  const shirt=standard(p.jacket),trim=standard(p.accent),hood=standard(p.vest);
  // All dimensions in unscaled character rest space. The existing full-body rig
  // remains underneath as a guide to the AI finishing the mesh.
  if(c.outfit!=='original'){
   solid(new RoundedBoxGeometry(.36,.42,.19,3,.043),shirt,'torso',[0,1.255,0],chest);
   if(c.outfit==='hoodie'){
    solid(new T.TorusGeometry(.155,.045,8,24),hood,'hood',[0,1.477,-.05],chest,[1,.7,1],[Math.PI/2,0,0]);
    for(const x of [-.055,.055])solid(new T.CylinderGeometry(.005,.005,.15,6),trim,'drawstring',[x,1.36,.12],chest);
    solid(new RoundedBoxGeometry(.21,.11,.016,2,.015),hood,'pocket',[0,1.15,.12],chest);
   }
   if(c.outfit==='jacket'){
    solid(new T.BoxGeometry(.016,.38,.012),trim,'zip',[0,1.26,.117],chest);
    solid(new T.BoxGeometry(.14,.055,.09),hood,'collar',[0,1.468,.058],chest);
   }
   if(c.outfit==='polo'){
    for(const x of [-.085,.085])solid(new T.BoxGeometry(.12,.045,.085),trim,'polo-collar',[x,1.478,.08],chest);
    solid(new T.BoxGeometry(.015,.10,.007),trim,'polo-placket',[0,1.406,.122],chest);
   }
   if(c.outfit==='labcoat'){
    for(const side of [-1,1]){
     solid(new RoundedBoxGeometry(.17,.56,.1,2,.018),shirt,'coat-panel',[side*.093,1.17,.12],chest);
     solid(new RoundedBoxGeometry(.14,.25,.1,2,.016),shirt,'coat-tail',[side*.086,.79,.07],pelvis);
    }
    solid(new T.BoxGeometry(.021,.43,.018),trim,'coat-placket',[0,1.17,.181],chest);
   }
   if(c.outfit==='vest'){
    solid(new RoundedBoxGeometry(.38,.36,.24,3,.03),hood,'vest',[0,1.29,.0],chest);
    for(const side of [-1,1])solid(new T.BoxGeometry(.11,.10,.023),trim,'vest-pouch',[side*.10,1.20,.17],chest);
   }
  }
  // Three-dimensional hair guide; keep original facial topology/eyes untouched.
  // Hair is attached to head bone. It is intentionally low-poly, never an implicit final sculpt.
  if(c.hair!=='original'){
   const point=head.getWorldPosition(new T.Vector3());
   const h=point.y;
   const hair=standard(p.hair,.92);
   if(c.hair!=='buzz'){
    solid(new T.SphereGeometry(1,18,12),hair,'hair-cap',[0,h+.11,-.008],head,[.14,.105,.125]);
   }
   if(c.hair==='curly'){
    for(const x of [-.11,-.055,0,.055,.11])
     for(const z of [-.07,.035])solid(new T.SphereGeometry(.048,10,8),hair,'curl',[x,h+.13,z],head);
   }
   if(['bob','long','ponytail'].includes(c.hair)){
    const length=c.hair==='long'?.29:.18;
    if(c.hair!=='ponytail')for(const x of [-.13,.13])
     solid(new T.SphereGeometry(1,12,10),hair,'side-hair',[x,h-.06,-.005],head,[.052,length,.075]);
    if(c.hair==='ponytail')solid(new T.SphereGeometry(1,12,10),hair,'ponytail',[0,h-.17,-.12],head,[.068,.21,.09]);
   }
   if(c.hair==='mohawk')solid(new T.ConeGeometry(.095,.28,9),hair,'mohawk',[0,h+.20,0],head);
   if(c.hair==='short')solid(new T.BoxGeometry(.18,.042,.18),hair,'short-top',[0,h+.155,0],head);
  }
  this.makePrint(c,avatar,chest);
 }
 makePrint(c,avatar,chest){
  const p=c.print;
  if(!p?.text&&!p?.imageData)return;
  // Independent canvas art instead of writing across the original skinned UVs.
  // The source PNG stays intact in PROJECT.json and SHIRT_ARTWORK.png for the AI.
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
  const ctx=canvas.getContext('2d');
  const draw=()=>{
   ctx.clearRect(0,0,512,512);
   if(this.image){
    if(p.imageMode==='pattern'){
     const tile=Math.max(32,Math.round(128*p.imageScale/100));
     for(let y=0;y<512;y+=tile)for(let x=0;x<512;x+=tile)ctx.drawImage(this.image,x,y,tile,tile);
    }else{
     const imageSize=340*p.imageScale/100;
     const ratio=this.image.naturalWidth/Math.max(1,this.image.naturalHeight);
     const dw=ratio>=1?imageSize:imageSize*ratio,dh=ratio>=1?imageSize/ratio:imageSize;
     ctx.drawImage(this.image,256-dw/2,252-dh/2,dw,dh);
    }
   }
   if(p.text){
    const family={sans:'Arial',serif:'Georgia',mono:'monospace'}[p.font]||'Arial';
    ctx.fillStyle=p.color;ctx.textAlign='center';ctx.textBaseline='middle';
    let size=p.size;ctx.font='bold '+size+'px '+family;
    // Keep lettering legible even if user enters a long label.
    while(ctx.measureText(p.text).width>475&&size>16){size-=2;ctx.font='bold '+size+'px '+family;}
    ctx.shadowColor='rgba(0,0,0,.22)';ctx.shadowBlur=3;
    ctx.fillText(p.text,256,256,474);ctx.shadowBlur=0;
   }
   if(this.avatar!==avatar)return;
   const texture=this.textures[0];if(texture){texture.needsUpdate=true;this.onRedraw();}
  };
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
  this.textures.push(texture);
  const material=new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2});
  const front=p.position==='front';
  const position=front?[0,1.27,.177]:[0,1.27,-.17];
  const mesh=add(avatar.root,chest,new T.PlaneGeometry(.29,.29),material,'shirt-art',position,null,front?null:[0,Math.PI,0]);
  mesh.renderOrder=2;
  this.parts.push(mesh);
  if(p.imageData){
   const img=new Image();
   img.onload=()=>{
    if(this.avatar!==avatar||this.signature!==JSON.stringify({c,p: this.lastPalette,gender:avatar.gender}))return;
    this.image=img;draw();
   };
   img.onerror=()=>{};img.src=p.imageData;
  }else draw();
 }
 dispose(){this.clear();this.avatar=null;}
}
