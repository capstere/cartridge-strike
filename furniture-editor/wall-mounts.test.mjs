import test from 'node:test';
import assert from 'node:assert/strict';
import {validWallMount,poseOnWall,findWallMount,syncWallMounts} from './wall-mounts.mjs';
const fixture={id:'NY-OBJ-0001',kind:'prop',assetId:'kenney:furniture-kit:bathroommirror',
 assetName:'Badrumsspegel',x:3.7,z:1,yaw:0,w:.52,d:.12,height:.65};
const wall={id:'BYGG-V-0002',kind:'wall',a:[4,0],b:[4,8],thickness:.11,height:2.85};
const walls=[wall,{id:'BYGG-D-0003',kind:'door',a:[3,0],b:[3,1],height:2.4}];
const near=(a,b)=>Math.abs(a-b)<.003;
test('wall mirror sits against the wall, centered at eye height and faces outward',()=>{
 const p=findWallMount(fixture,{x:3.8,z:4},walls);
 assert(p&&p.wallMount);
 assert(near(p.x,4-(.11/2+.12/2+.012)));
 assert(near(p.z,4));
 assert(near(p.elevation+fixture.height/2,1.55));
 assert(near(p.yaw,-Math.PI/2));
 assert.equal(p.wallMount.wallId,wall.id);
 assert.equal(p.collision,'none','A wall mirror must not create an invisible player obstacle');
 assert.equal(p.mountId,null);
 assert.equal(validWallMount(p.wallMount),true);
});
test('wall mount follows the wall when a room is resized without changing height or width',()=>{
 const pose=findWallMount(fixture,{x:3.8,z:4},walls);
 const item={...fixture,...pose};
 const moved={...wall,a:[5,0],b:[5,10]};
 const result=syncWallMounts([item],[moved]);
 assert.equal(result.updated,1);
 assert(near(item.x,5-(.11/2+.12/2+.012)));
 assert(near(item.z,5));
 assert(near(item.wallMount.y,1.55));
 assert(near(item.wallMount.t,.5));
});
test('endpoints are clamped to keep the entire asset on the wall',()=>{
 const p=findWallMount(fixture,{x:3.85,z:.01},walls);
 assert(p);
 assert(p.wallMount.t>0&&p.wallMount.t<1);
 assert(p.z>=fixture.w/2);
});
test('invalid wall candidates never teleport an item across a room, nor attach to doors',()=>{
 assert.equal(findWallMount(fixture,{x:-9,z:-8},walls),null);
 assert.equal(findWallMount(fixture,{x:3,z:.5},walls.filter(w=>w.kind==='door')),null);
 assert.equal(poseOnWall(fixture,{wallId:wall.id,t:.5,side:1,y:1.6},[]),null);
 assert.equal(validWallMount({wallId:wall.id,t:22,side:1,y:1.6}),false);
 assert.equal(validWallMount({wallId:wall.id,t:.5,side:0,y:1.6}),false);
});
test('a missing wall cannot silently create an invisible wall or erase the authored model',()=>{
 const mount=findWallMount(fixture,{x:3.8,z:4},walls);
 const item={...fixture,...mount},before=structuredClone(item);
 const result=syncWallMounts([item],[]);
 assert.equal(result.missing,1);
 assert.deepEqual(item,before);
});
test('a tall wall object that cannot fit is not forced onto a window or short wall',()=>{
 const tiny={id:'tiny',kind:'wall',a:[4,0],b:[4,.3],height:2.85};
 assert.equal(findWallMount(fixture,{x:4,z:.1},[tiny]),null);
 assert.equal(findWallMount({...fixture,height:3.1},{x:4,z:4},walls),null);
});
test('the opposite wall face is selectable and rotates the asset with the wall',()=>{
 const p=findWallMount(fixture,{x:4.2,z:4},walls);
 assert(p);
 assert.equal(p.wallMount.side,-1);
 assert(p.x>4);
 assert(near(Math.abs(p.yaw),Math.PI/2));
});
