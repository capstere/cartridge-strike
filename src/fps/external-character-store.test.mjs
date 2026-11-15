import test from 'node:test';
import assert from 'node:assert/strict';
import {EXTERNAL_CHARACTER_ID,EXTERNAL_CHARACTER_SHA256,EXTERNAL_CHARACTER_CLIPS,inspectExternalCharacterGLB} from './external-character-store.mjs';

function fixture(overrides={}){
 const nodeNames=['root','pelvis','spine_01','spine_02','spine_03','neck_01','Head','clavicle_l','upperarm_l','lowerarm_l','hand_l','clavicle_r','upperarm_r','lowerarm_r','hand_r','thigh_l','calf_l','foot_l','ball_l','thigh_r','calf_r','foot_r','ball_r'];
 const doc={asset:{version:'2.0'},buffers:[{byteLength:4}],nodes:nodeNames.map(name=>({name})),
  skins:[{joints:nodeNames.map((_,i)=>i)}],materials:[{name:'armor'}],
  accessors:[{count:3},{count:3},{count:3},{count:3}],
  meshes:[{primitives:[{mode:4,attributes:{POSITION:0,WEIGHTS_0:1,JOINTS_0:2},indices:3}]}],
  animations:EXTERNAL_CHARACTER_CLIPS.map(name=>({name,channels:[{target:{node:1,path:'rotation'}}]})),...overrides};
 const json=Buffer.from(JSON.stringify(doc),'utf8'),jsonLength=Math.ceil(json.length/4)*4,bin=Buffer.alloc(4);
 const out=Buffer.alloc(12+8+jsonLength+8+bin.length,0x20);
 out.writeUInt32LE(0x46546c67,0);out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);
 out.writeUInt32LE(jsonLength,12);out.writeUInt32LE(0x4e4f534a,16);json.copy(out,20);
 const offset=20+jsonLength;out.writeUInt32LE(bin.length,offset);out.writeUInt32LE(0x004e4942,offset+4);bin.copy(out,offset+8);
 return out.buffer.slice(out.byteOffset,out.byteOffset+out.byteLength);
}
test('Vader import has a stable, content-locked identity',()=>{
 assert.equal(EXTERNAL_CHARACTER_ID,'darth-vader-glb');
 assert.match(EXTERNAL_CHARACTER_SHA256,/^[a-f0-9]{64}$/);
 assert.equal(EXTERNAL_CHARACTER_CLIPS.length,13);
});
test('accepts a structurally compatible animated 23-bone GLB',()=>{
 const result=inspectExternalCharacterGLB(fixture());
 assert.equal(result.bones,23);assert.equal(result.clips.length,13);assert.equal(result.triangles,1);
});
test('rejects missing animation, external data, and incompatible skeleton',()=>{
 assert.throws(()=>inspectExternalCharacterGLB(fixture({animations:[]})),/13 FPS-animationer/);
 assert.throws(()=>inspectExternalCharacterGLB(fixture({buffers:[{uri:'https://example.com/glb.bin',byteLength:4}]})),/formatet/);
 assert.throws(()=>inspectExternalCharacterGLB(fixture({skins:[{joints:[0]}]})),/23 animerade ben/);
});
test('rejects truncated and invalid GLB headers',()=>{
 const bytes=fixture();assert.throws(()=>inspectExternalCharacterGLB(bytes.slice(0,bytes.byteLength-1)),/GLB-huvudet/);
 const raw=new Uint8Array(bytes.slice(0));raw[0]=0;assert.throws(()=>inspectExternalCharacterGLB(raw.buffer),/GLB-huvudet/);
});
