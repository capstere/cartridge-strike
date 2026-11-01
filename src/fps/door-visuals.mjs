/** Panel/hinge/handle construction adapted from Riposte panelDoor, 02d-archi.js
 * (MIT, BenDBSS 2026). Instanced, fitted to existing source apertures.
 */
import * as T from '../../vendor/three/three.module.js';
import {RoundedBoxGeometry} from '../../vendor/three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries,mergeVertices} from '../../vendor/three/addons/utils/BufferGeometryUtils.js';
import {createPBRLibrary} from './riposte-pbr-materials.mjs';
export async function buildDoorVisuals(system){
 if(!system)return null;
 const pbr=createPBRLibrary({THREE:T}),handles=[];
 try{handles.push(...await Promise.all([pbr.load('paintwood'),pbr.load('steel')]));}catch(e){pbr.dispose();throw e;}
 const [paint,steel]=handles.map(h=>h.material);paint.color.setHex(0xd5dcd4);paint.normalScale.setScalar(.18);paint.roughness=.76;steel.metalness=.72;steel.normalScale.setScalar(.2);
 // Retain the licensed grain at low contrast under the painted finish.
 paint.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>', 'vec3 basePaint = diffuseColor.rgb;\n#include <map_fragment>\ndiffuseColor.rgb = mix(basePaint, diffuseColor.rgb, 0.22);');};
 paint.customProgramCacheKey=()=> 'riposte-painted-door-v1';
 const rubber=new T.MeshStandardMaterial({color:0x243137,roughness:.9});
 const root=new T.Group();root.name='source-aperture-doors';
 const body=[],metal=[],seals=[];
 const box=(parts,x,y,z,w,h,d,bevel=0)=>{const g=bevel?new RoundedBoxGeometry(w,h,d,2,bevel):new T.BoxGeometry(w,h,d);g.translate(x,y,z);parts.push(g);};
 box(body,.5,1.15,0,1,2.23,.058,.009);
 for(const sign of [-1,1]){
  // Recessed panel, robust kick plate, rose and lever on both sides.
  box(body,.5,1.48,sign*.031,.77,.98,.009,.005);
  box(metal,.5,.27,sign*.035,.91,.36,.008,.004);
  box(metal,.84,1.04,sign*.04,.065,.13,.015,.008);
  box(metal,.78,1.05,sign*.065,.17,.025,.025,.006);
  box(seals,.5,2.26,sign*.02,1,.018,.018);
 }
 for(const y of [.28,1.14,2.05]){const g=new T.CylinderGeometry(.022,.022,.12,10);g.translate(.012,y,0);metal.push(g);}
 const leaves=system.doors.flatMap(d=>d.leaves),batches=[];
 for(const [name,parts,material] of [['panel',body,paint],['hardware',metal,steel],['seal',seals,rubber]]){
  const non=parts.map(g=>g.index?g.toNonIndexed():g),merged=mergeGeometries(non),geometry=mergeVertices(merged,1e-8);merged.dispose();parts.forEach(g=>g.dispose());non.forEach(g=>g.dispose());
  const mesh=new T.InstancedMesh(geometry,material,leaves.length);mesh.name='doors-'+name;mesh.frustumCulled=false;mesh.receiveShadow=true;mesh.castShadow=true;
  mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);root.add(mesh);batches.push(mesh);
  if(name==='panel')for(let i=0;i<leaves.length;i++)mesh.setColorAt(i,new T.Color(leaves[i].door.studioColor||(leaves[i].door.accessCard?0x527b80:0xc4c3af)));
 }
 const transform=new T.Object3D(),frustum=new T.Frustum(),projection=new T.Matrix4(),sphere=new T.Sphere();
 const colors=leaves.map(l=>new T.Color(l.door.studioColor||(l.door.accessCard?0x527b80:0xc4c3af)));let lastSignature='',visibleCount=leaves.length;
 function update(camera=null,lights=[]){
  if(camera){camera.updateMatrixWorld();frustum.setFromProjectionMatrix(projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));}
  const shadows=[];
  for(const light of lights)if(light.visible&&light.castShadow){light.updateMatrixWorld();light.target.updateMatrixWorld();light.shadow.updateMatrices(light);shadows.push(light.shadow.getFrustum());}
  const visible=[];
  for(let i=0;i<leaves.length;i++){
   const b=leaves[i].box;sphere.center.set(b.x,b.y,b.z);sphere.radius=Math.hypot(b.w/2+.04,1.15,.1);
   // Include every potentially visible leaf AND every active shadow caster.
   // Conservative bounds retain the original bevels, handles and full geometry.
   if(!camera||frustum.intersectsSphere(sphere)||shadows.some(f=>f.intersectsSphere(sphere)))visible.push(i);
  }
  visibleCount=visible.length;
  const signature=visible.map(i=>i+':'+leaves[i].box.angle).join('|');if(signature===lastSignature)return false;lastSignature=signature;
  for(let slot=0;slot<visible.length;slot++){const i=visible[slot],leaf=leaves[i];transform.position.set(leaf.x,0,leaf.z);transform.rotation.y=leaf.box.angle;transform.scale.set(leaf.w,1,1);transform.updateMatrix();for(const batch of batches)batch.setMatrixAt(slot,transform.matrix);batches[0].setColorAt(slot,colors[i]);}
  for(const batch of batches){batch.count=visible.length;batch.instanceMatrix.needsUpdate=true;}
  batches[0].instanceColor.needsUpdate=true;return true;
 }
 update();return {root,update,get visibleCount(){return visibleCount;},report:system.report,dispose(){root.removeFromParent();for(const b of batches){b.geometry.dispose();b.dispose();}for(const h of handles)h.release();rubber.dispose();pbr.dispose();}};
}
