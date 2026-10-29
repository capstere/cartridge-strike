/** Studio-only edits to cloned skinned geometry. Original assets/runtime stay untouched. */
import * as T from '../vendor/three/three.module.js';
import {makeCreative} from './creative-schema.mjs?v=4';
const clamp=T.MathUtils.clamp;
export class FashionPreview{
 constructor(onRedraw=()=>{}){this.onRedraw=onRedraw;this.parts=[];this.textures=[];this.avatar=null;this.signature='';this.generation=0;this.sources=new Map();this.pendingImages=[];}
 clear(){
  this.generation++;
  for(const mesh of this.parts){mesh.removeFromParent();mesh.geometry.dispose();mesh.material.dispose();}
  for(const t of this.textures)t.dispose();
  this.parts=[];this.textures=[];this.signature='';this.pendingImages=[];
 }
 source(mesh,avatar){
  if(!this.sources.has(mesh)){
   const geometry=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();avatar.ownedGeometry.push(geometry);
   mesh.geometry=geometry;
   this.sources.set(mesh,Float32Array.from(geometry.attributes.position.array));
  }
  return this.sources.get(mesh);
 }
 create(project,avatar){
  if(!avatar||project.kind!=='character'){this.dispose();return;}
  const c=project.creative||makeCreative(),p=project.palette;
  const signature=JSON.stringify({c,p});
  if(this.avatar===avatar&&this.signature===signature)return;
  this.clear();if(this.avatar!==avatar)this.sources.clear();
  this.avatar=avatar;this.signature=signature;
  const token=this.generation;
  const faceMesh=avatar.meshes.find(m=>m.material?.name==='face-skin');
  const faceSource=faceMesh?this.source(faceMesh,avatar):null;let top=-Infinity;
  if(faceSource)for(let i=1;i<faceSource.length;i+=3)top=Math.max(top,faceSource[i]);
  const headShift=Number.isFinite(top)?top-1.8100767135620117:0;this.headShift=headShift;
  const chest=avatar.bones.get('spine_03'),head=avatar.bones.get('Head');
  const standard=color=>new T.MeshStandardMaterial({color,roughness:(c.roughness??85)/100});
  const solid=(g,color,name,pos,scale,bone=head,rotation=null)=>{
   const m=new T.Mesh(g,standard(color));m.name='creative-'+name;m.position.fromArray(pos);m.position.y+=headShift;
   if(scale)m.scale.fromArray(scale);if(rotation)m.rotation.set(...rotation);
   avatar.root.add(m);avatar.root.updateWorldMatrix(true,true);bone?.attach(m);this.parts.push(m);return m;
  };
  const shirts=[];
  for(const mesh of avatar.meshes){
   const name=mesh.material?.name||'';
   if(!mesh.isSkinnedMesh)continue;
   const source=this.source(mesh,avatar),g=mesh.geometry,pos=g.attributes.position;
   pos.array.set(source);
   const custom=c.outfit!=='original',fit=(c.fit??100)/100;
   if(name==='jacket-fabric'||name==='vest-shell'){
    shirts.push(mesh);mesh.visible=true;
    for(let i=0;i<pos.count;i++){
     const x=source[i*3],y=source[i*3+1],z=source[i*3+2];
     // Torso fit changes silhouette without moving wrist or hand attachments.
     const torso=1-clamp((Math.abs(x)-.17)/.15,0,1);
     pos.setXYZ(i,x*(1+(fit-1)*torso),y,z*(1+(fit-1)*torso));
     if(c.outfit==='labcoat'&&y<1.18&&Math.abs(x)<.24)pos.setY(i,y-.25*clamp((1.18-y)/.26,0,1));
    }
    // Short sleeves reveal skin using vertex colour on the original weighted arms.
    const colors=new Float32Array(pos.count*3),skin=new T.Color(p.skin),baseColor=new T.Color(p.jacket),white=new T.Color(0xffffff);skin.setRGB(skin.r/Math.max(.001,baseColor.r),skin.g/Math.max(.001,baseColor.g),skin.b/Math.max(.001,baseColor.b));
    for(let i=0;i<pos.count;i++){
     const exposed=['tshirt','polo','vest'].includes(c.outfit)&&Math.abs(source[i*3])>.37;
     (exposed?skin:white).toArray(colors,i*3);
    }
    g.setAttribute('color',new T.BufferAttribute(colors,3));
    mesh.material.vertexColors=true;mesh.material.needsUpdate=true;
   }
   if(name==='trousers-fabric')for(let i=0;i<pos.count;i++)pos.setZ(i,source[i*3+2]*fit);
   if(name==='face-skin'){
    const f=c.face;
    for(let i=0;i<pos.count;i++){
     const x=source[i*3],y=source[i*3+1]-headShift,z=source[i*3+2];
     const jawWeight=clamp((y-1.54)/.04,0,1)*clamp((1.72-y)/.10,0,1);
     const widths={Naturlig:1,Rund:1.13,Kantig:1.20,Smal:.82,Bred:1.24};
     pos.setX(i,x*(1+((widths[f.jaw]||1)-1)*jawWeight));
     const nose=Math.exp(-((x/.034)**2+((y-1.673)/.035)**2))*clamp((z-.065)/.035,0,1);
     const n={Naturlig:0,Smal:-.013,Bred:.016,Uppåtvänd:.007,Rak:.011}[f.nose]||0;
     pos.setZ(i,z+n*nose);if(f.nose==='Bred'||f.nose==='Smal')pos.setX(i,pos.getX(i)*(1+(f.nose==='Bred'?.24:-.19)*nose));
     if(f.nose==='Uppåtvänd')pos.setY(i,source[i*3+1]+.012*nose);
     const lips=Math.exp(-((x/.053)**2+((y-1.619)/.024)**2))*clamp((z-.05)/.04,0,1);
     if(f.mouth==='Fylligare läppar')pos.setZ(i,pos.getZ(i)+.012*lips);
     if(f.mouth.includes('leende'))pos.setY(i,pos.getY(i)+(.014*Math.abs(x)/.05-.003)*lips*(f.mouth==='Brett leende'?1.7:1));
     if(f.mouth==='Allvarlig')pos.setY(i,pos.getY(i)-.008*lips);
    }
   }
   if(name==='eyes'){
    mesh.material.color.set(c.face.eyeColor);
    const scale={Naturliga:1,Stora:1.35,Smala:.62,Runda:1.2,Markerade:.8}[c.face.eyes]||1;
    for(let i=0;i<pos.count;i++)pos.setY(i,1.699+headShift+(source[i*3+1]-headShift-1.699)*scale);
   }
   if(name==='hair'&&/eyebrow/i.test(mesh.name)){
    mesh.visible=true;
    const scale={Naturliga:1,Tjocka:1.8,Tunna:.5,Bågformade:1.3,Raka:.65}[c.face.eyebrows]||1;
    for(let i=0;i<pos.count;i++)pos.setY(i,1.71+headShift+(source[i*3+1]-headShift-1.71)*scale);
   }
   if(name==='gloves-leather')mesh.material.color.set(c.gloves==='skin'?p.skin:p.accent);
   if(name==='boots-leather')mesh.material.color.set(p.boots);
   if(/fabric|vest/.test(name)){mesh.material.roughness=(c.roughness??85)/100;}
   if(name==='vest-shell'){mesh.visible=true;mesh.material.color.set(c.vest||c.outfit==='vest'?p.vest:p.jacket);}
   pos.needsUpdate=true;g.computeBoundingBox();g.computeBoundingSphere();
  }
  for(const m of avatar.meshes){
   if(m.name.startsWith('boot-shaft'))m.visible=c.shoes!=='sneakers';
   if(m.name.startsWith('boot-sole'))m.material.color.set(c.shoes==='sneakers'?p.accent:'#161e24');
  }
  if(c.hair!=='original'){
   const hair=p.hair;
   // Head geometry is in canonical +Z-forward root space.
   if(c.hair==='buzz')solid(new T.SphereGeometry(1,20,12),hair,'buzz',[0,1.786,-.026],[.091,.050,.10]);
   else solid(new T.SphereGeometry(1,20,12),hair,'hair-cap',[0,1.778,-.028],c.hair==='short'?[.096,.060,.099]:[.103,.075,.106]);
   if(c.hair==='curly')for(let x=-2;x<=2;x++)for(const z of [-.07,.015])solid(new T.SphereGeometry(.033,10,8),hair,'curl',[x*.041,1.84,z]);
   if(['bob','long'].includes(c.hair))for(const x of [-.096,.096])solid(new T.SphereGeometry(1,12,10),hair,'side-hair',[x,1.70,-.045],[.038,c.hair==='long'?.21:.11,.09]);
   if(c.hair==='ponytail')solid(new T.SphereGeometry(1,12,10),hair,'ponytail',[0,1.65,-.14],[.05,.18,.06]);
   if(c.hair==='mohawk')solid(new T.SphereGeometry(1,12,10),hair,'mohawk',[0,1.88,-.02],[.028,.13,.11]);
  }
  const beard=c.face.facialHair;
  if(beard!=='Ingen'){
   const mustache=beard==='Mustasch';
   solid(new T.SphereGeometry(1,16,10),p.hair,'beard',[0,mustache?1.635:1.59,mustache?.108:.077],mustache?[.049,.012,.012]:[.071,beard==='Helskägg'?.085:beard==='Stubb'?.035:.05,.045]);
  }
  if(c.face.freckles!=='Nej')for(const side of [-1,1])for(let i=0;i<(c.face.freckles==='Tydliga'?9:4);i++)solid(new T.SphereGeometry(.0019,5,4),'#86543d','freckle',[side*(.027+(i%3)*.013),1.653+Math.floor(i/3)*.008,.095-(i%3)*.004]);
  if(c.outfit==='hoodie'){
   solid(new T.TorusGeometry(.116,.032,8,24),p.jacket,'hood',[0,1.49,-.045],[1,.7,1],chest,[Math.PI/2,0,0]);
   for(const x of [-.036,.036])solid(new T.CylinderGeometry(.003,.003,.13,5),p.accent,'drawstring',[x,1.40,.134],null,chest);
  }
  if(['polo','jacket'].includes(c.outfit))for(const x of [-.055,.055])solid(new T.SphereGeometry(1,10,6),p.accent,'collar',[x,1.50,.066],[.06,.025,.065],chest);
  if(c.outfit==='jacket')solid(new T.CylinderGeometry(.004,.004,.44,5),p.accent,'zipper',[0,1.24,.135],null,chest);
  for(const shirt of shirts){if(shirt.material.name==='vest-shell'&&(c.vest||c.outfit==='vest')){shirt.material.map=null;shirt.material.color.set(p.vest);shirt.material.needsUpdate=true;}else this.makeArtwork(project,avatar,shirt,token);}
 }
 makeArtwork(project,avatar,shirt,token){
  const c=project.creative,p=c.print,t=c.printTransform||{x:0,y:0,rotation:0,scale:100};
  if(!p.text&&!p.imageData){shirt.material.map=null;shirt.material.color.set(project.palette.jacket);shirt.material.needsUpdate=true;return;}
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;const ctx=canvas.getContext('2d');
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;this.textures.push(texture);
  // Generated planar UVs in bind space, transported by the source skin weights.
  // Artwork is masked to the requested side and torso (never leaks onto sleeves).
  const g=shirt.geometry,source=this.sources.get(shirt),uv=new Float32Array(g.attributes.position.count*2);
  for(let i=0;i<uv.length/2;i++){
   const x=source[i*3],y=source[i*3+1],z=source[i*3+2];
   const side=p.position==='front'?z>.025:z<-.025;
   uv[i*2]=side&&Math.abs(x)<.25?(p.position==='front'?x:-x)/.52+.5:.005;
   uv[i*2+1]=side&&Math.abs(x)<.25?(y-this.headShift-.90)/.67:.005;
  }
  const ix=g.index;for(let n=0;n<(ix?ix.count:uv.length/2);n+=3){const ids=[0,1,2].map(k=>ix?ix.getX(n+k):n+k);const valid=ids.every(i=>{const x=source[i*3],z=source[i*3+2];return Math.abs(x)<.25&&(p.position==='front'?z>.025:z<-.025);});if(!valid)for(const i of ids){uv[i*2]=.005;uv[i*2+1]=.005;}}
  g.setAttribute('uv',new T.BufferAttribute(uv,2));
  shirt.material.map=texture;shirt.material.color.set('#ffffff');shirt.material.needsUpdate=true;
  const draw=img=>{
   if(token!==this.generation)return;
   ctx.fillStyle=project.palette.jacket;ctx.fillRect(0,0,1024,1024);
   if(img&&p.imageMode==='pattern'){
    const tile=Math.max(32,192*p.imageScale/100),ratio=img.width/img.height;
    for(let y=0;y<1024;y+=tile/ratio)for(let x=0;x<1024;x+=tile)ctx.drawImage(img,x,y,tile,tile/ratio);
   }
   ctx.save();ctx.translate(512+t.x/52*1024,470-t.y/67*1024);ctx.rotate(t.rotation*Math.PI/180);ctx.scale(t.scale/100,t.scale/100);
   if(img&&p.imageMode==='print'){
    const k=550*p.imageScale/100/Math.max(img.width,img.height);ctx.drawImage(img,-img.width*k/2,-img.height*k/2,img.width*k,img.height*k);
   }
   if(p.text){
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=p.color;
    ctx.font='bold '+(p.size*2)+'px '+({sans:'Arial',serif:'Georgia',mono:'monospace'}[p.font]);ctx.fillText(p.text,0,0,940);
   }
   ctx.restore();texture.needsUpdate=true;this.onRedraw();
  };
  draw(null);
  if(p.imageData){const loaded=new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{draw(img);resolve();};img.onerror=()=>reject(Error('PNG-trycket kunde inte avkodas.'));img.src=p.imageData;});loaded.catch(()=>{});this.pendingImages.push(loaded);}
 }
 dispose(){this.clear();this.sources.clear();this.avatar=null;}
}
