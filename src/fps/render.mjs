import {VisualDepth} from './visual-depth.mjs';
import {inspectPose} from './view-surface.mjs';
import {CombatVisuals} from './combat-visuals.mjs';
/** Presentation-quality entrypoint. The engine, game state and geometry remain separate.
 * The engine imports the public model API. Arcade visual effects remain separate
 * from authoritative movement, combat, death and respawn state.
 */
import * as THREE from '../../vendor/three/three.module.js';
import { Renderer as EngineRenderer } from './render-engine.mjs';
import {loadCharacterLibrary,disposeCharacterLibrary} from './character-library.mjs';
import { bakeLightfield } from './presentation-lightfield.mjs';
import {ActionVisuals} from './action-visuals.mjs';
import { buildLivingScene } from './living-floor-scene.mjs';
import { freezeStaticTransforms } from './render-engine.mjs';
export { freezeStaticTransforms } from './render-engine.mjs';

function installField(material, texture, bounds) {
  if(!material?.isMeshStandardMaterial || material.transparent || material.emissiveIntensity>1)return null;
  const previous=material.onBeforeCompile,previousKey=material.customProgramCacheKey;
  const key=previousKey.call(material);
  material.onBeforeCompile=function(shader,renderer){
    previous.call(this,shader,renderer);
    shader.uniforms.uPresentationField={value:texture};
    shader.uniforms.uPresentationBounds={value:new THREE.Vector4(bounds[0],bounds[1],bounds[2]-bounds[0],bounds[3]-bounds[1])};
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vPresentationWorld;');
    shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
      vec4 presentationPosition = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        presentationPosition = instanceMatrix * presentationPosition;
      #endif
      vPresentationWorld = (modelMatrix * presentationPosition).xyz;`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      uniform sampler2D uPresentationField;
      uniform vec4 uPresentationBounds;
      varying vec3 vPresentationWorld;`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
      vec2 presentationUV = (vPresentationWorld.xz - uPresentationBounds.xy) / uPresentationBounds.zw;
      vec3 presentationIndirect = texture2D(uPresentationField, clamp(presentationUV, 0.0, 1.0)).rgb * 1.3;
      float presentationHeight = clamp(1.08 - vPresentationWorld.y * .15, .55, 1.0);
      reflectedLight.indirectDiffuse *= mix(vec3(.98), presentationIndirect, presentationHeight);`);
  };
  material.customProgramCacheKey=()=>key+'|presentation-indirect-v1';material.needsUpdate=true;
  return ()=>{material.onBeforeCompile=previous;material.customProgramCacheKey=previousKey;material.needsUpdate=true;};
}

export class Renderer extends EngineRenderer {
  constructor(canvas,world,settings){
    const visualWorld={...world,description:{...world.description,boxes:world.description.boxes.filter(b=>!b.livingVisual)}};
    super(canvas,visualWorld,settings);
    this.visualDepth=new VisualDepth(this.renderer);this.inspectAt=-Infinity;this.inspectActor=null;
    this.onInspectKey=e=>{if(e.code==='KeyV'&&!e.repeat&&document.pointerLockElement===canvas&&this.presentationGame)this.requestInspect(this.presentationGame);};
    window.addEventListener('keydown',this.onInspectKey);
    // Intercept only the engine's world draw; recursive offscreen/composite draws
    // use the unmodified native renderer. Restore this hook at final teardown.
    this.nativeRender=this.renderer.render.bind(this.renderer);this.inDepthPass=false;
    this.renderer.render=(scene,camera)=>{
      if(scene===this.scene&&!this.inDepthPass&&this.settings.graphics!=='low'){
        this.inDepthPass=true;try{this.visualDepth.render(scene,camera);}finally{this.inDepthPass=false;}return;
      }
      if(scene===this.viewScene)this.applyInspection();
      return this.nativeRender(scene,camera);
    };
    this.viewFill=new THREE.DirectionalLight(0xb5d8ee,.75);this.viewFill.position.set(2,.5,-1);this.viewScene.add(this.viewFill);
    this.scene.environmentIntensity=.72;
    this.combatVisuals=new CombatVisuals(this.scene,world,settings);
    this.presentationDisposed=false;this.presentationRestores=[];this.presentationField=null;
    // Stage the field before the existing app declares its assets ready. Never bake in render().
    this.assetsReady=this.assetsReady.then(async()=>{
      if(this.presentationDisposed)return;
      this.actionVisuals=new ActionVisuals(this.scene,world);
      await loadCharacterLibrary();
      if(this.presentationDisposed)return;
      this.livingScene=buildLivingScene(world,this.registry);
      this.scene.add(this.livingScene.root);this.livingScene.decorateCeilings(this.scene);
      freezeStaticTransforms(this.livingScene.root);
      const started=performance.now(),field=await bakeLightfield(world,this.fixtures,{maxSize:96});
      if(this.presentationDisposed)return;
      const texture=new THREE.DataTexture(field.data,field.width,field.height,THREE.RGBAFormat);
      texture.minFilter=texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=false;
      texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping;texture.needsUpdate=true;texture.name='presentation-indirect';
      this.presentationField=texture;
      const patched=new Set();
      this.scene.traverse(object=>{
        for(const material of Array.isArray(object.material)?object.material:[object.material]){
          if(!material||patched.has(material))continue;patched.add(material);
          const restore=installField(material,texture,field.bounds);if(restore)this.presentationRestores.push(restore);
        }
      });
      // Preserve the existing two shadow lights and quality-specific shadow budgets.
      this.presentationReport={kind:'approximate-startup-indirect-field',width:field.width,height:field.height,
        sources:field.sources,visibilityChecks:field.checks,materials:this.presentationRestores.length,
        milliseconds:performance.now()-started,geometryChanged:false,photometricValidation:false};
      const visibility=this.lights.map(light=>light.visible),shadows=this.renderer.shadowMap.enabled;
      try {
        for(const shadowed of [false,true])for(let count=0;count<=this.lights.length;count++){
          this.renderer.shadowMap.enabled=shadowed;this.lights.forEach((light,i)=>light.visible=i<count);
          await this.renderer.compileAsync(this.scene,this.camera);
        }
      } finally { this.renderer.shadowMap.enabled=shadows;this.lights.forEach((light,i)=>light.visible=visibility[i]); }
    });
  }
  requestInspect(game){
    const p=game.player;if(!p?.alive||game.state.paused||game.phase!=='active'||p.reloadUntil>game.state.time)return false;
    this.inspectAt=game.state.time;this.inspectActor=p.id;this.inspectWeapon=p.weapon;return true;
  }
  updateLights(p,t){
    super.updateLights(p,t);
    for(const light of this.lights){if(!light.visible)continue;const room=this.world.roomAt(light.position.x,light.position.z);light.color.setHex(['I01','I02','I03'].includes(room?.id)?0xeaf4ff:room?.name?.includes('PENTRY')?0xffdfad:0xffefd9);}
  }
  applyInspection(){
    const game=this.presentationGame,p=game?.player,t=game?.state.time??0;
    if(this.weaponModel&&p){
      if(p.id!==this.inspectActor||p.weapon!==this.inspectWeapon||!p.alive||p.reloadUntil>t||(this.shotAt??-Infinity)>=this.inspectAt)this.inspectAt=-Infinity;
      const pose=inspectPose(t-this.inspectAt,{reducedMotion:this.settings.reducedMotion});
      this.weaponModel.position.x+=pose.position[0];this.weaponModel.position.y+=pose.position[1];this.weaponModel.position.z+=pose.position[2];this.weaponModel.rotation.x+=pose.rotation[0];this.weaponModel.rotation.y+=pose.rotation[1];this.weaponModel.rotation.z+=pose.rotation[2];
      this.weaponModel.updateMatrixWorld(true);
    }
  }
  materialFor(b){
    if(['finish-I12','finish-I13','finish-I21','finish-I38'].includes(b.id))return this.registry.get('vinyl',{color:b.id==='finish-I12'?0x777f7d:0x8d9998,roughness:.86});
    return super.materialFor(b);
  }
  render(game,viewActor,dt){
    this.presentationGame=game;this.combatVisuals?.update(game);this.livingScene?.update(game.state.time);this.actionVisuals?.update(game,this.camera);super.render(game,viewActor,dt);
  }
  events(events,game){this.combatVisuals?.events(events,game);super.events(events.filter(e=>e.type!=='hit'||(e.sourceId===game.player?.id&&game.actors.some(a=>a.id===e.actorId&&a.team!==game.player.team))),game);this.actionVisuals?.events(events,game);}
  resetTransient(){
    super.resetTransient();this.inspectAt=-Infinity;this.combatVisuals?.clear();this.actionVisuals?.clear();
    // New rounds must not inherit recoil springs or footsteps from the previous life.
    for(const model of this.weaponCache?.values()||[])if(model.userData.presentationMotion)model.userData.presentationMotion.time=null;
    for(const model of this.actors?.values()||[]){if(model.userData.presentationGait)model.userData.presentationGait.time=null;if(model.userData.avatar){model.userData.avatar.time=-1;model.userData.avatar.death=null;}}
  }
  dispose(){
    if(this.presentationDisposed)return;this.presentationDisposed=true;
    for(const restore of this.presentationRestores||[])restore();
    window.removeEventListener('keydown',this.onInspectKey);this.renderer.render=this.nativeRender;this.visualDepth?.dispose();this.combatVisuals?.dispose();this.actionVisuals?.dispose();disposeCharacterLibrary();this.presentationRestores=[];this.presentationField?.dispose();this.livingScene?.dispose();super.dispose();
  }
}
