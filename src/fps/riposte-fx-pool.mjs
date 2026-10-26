/** Bounded instanced FX adapted from Riposte 5.6.0 src/04-fx.js Decals.
 * Copyright (c) 2026 BenDBSS, MIT; see licenses/riposte-MIT.txt.
 * Three 0.180: shared stock materials retain lighting, depth and color semantics.
 * Slot transforms are detached Object3Ds. They never become separate draw calls.
 */
import * as T from '../../vendor/three/three.module.js';
export class EffectBatch{
 constructor(scene,geometry,material,capacity,name){
  this.capacity=capacity;this.mesh=new T.InstancedMesh(geometry,material,capacity);
  this.mesh.name='riposte-fx-'+name;this.mesh.count=0;this.mesh.frustumCulled=false;
  this.mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);this.mesh.castShadow=false;
  material.forceSinglePass=true;scene.add(this.mesh);this.free=[];this.transforms=0;this.count=0;this.active=0;
 }
 acquire(){this.active++;if(this.free.length)return this.free.pop();this.transforms++;return new T.Object3D();}
 release(transform){this.active--;transform.visible=false;this.free.push(transform);}
 begin(){this.count=0;}
 write(transform){if(this.count>=this.capacity)return;transform.updateMatrix();this.mesh.setMatrixAt(this.count++,transform.matrix);}
 flush(){this.mesh.count=this.count;this.mesh.visible=this.count>0;if(this.count){const attribute=this.mesh.instanceMatrix;attribute.clearUpdateRanges();attribute.addUpdateRange(0,this.count*16);attribute.needsUpdate=true;}}
 dispose(){this.mesh.removeFromParent();this.mesh.dispose();this.free=[];}
}
