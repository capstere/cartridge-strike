import test from 'node:test';
import assert from 'node:assert/strict';
import {exportProject,parseProject,migrateV1,exportProjectZip,parseProjectZip} from './level-project.mjs';
import {exportPatch,BASE_COMMIT} from '../core.mjs';
import {assetHash} from '../library/glb-utils.mjs';
import {makeZip,readZip} from '../library/zip.mjs';

const floor={id:'BYGG-G-0001',name:'Rum',role:'room',surface:'vinyl',x0:0,z0:0,x1:8,z1:8};
test('empty new level is independent of Floor 5 and serializes',()=>{
 const p=exportProject();assert.equal(p.mode,'new-level');assert.deepEqual(p.ground.floors,[]);
 assert.deepEqual(p.architecture.added,[]);assert.equal(p.schemaVersion,2);
 assert.deepEqual(parseProject(JSON.stringify(p)),p);
});
test('ground, game and width contracts reject malformed documents',()=>{
 const p=exportProject({ground:{bounds:{x0:0,z0:0,x1:10,z1:10},wallHeightDefault:2.85,floors:[floor]}});
 assert.equal(parseProject(p).ground.floors[0].surface,'vinyl');
 for(const edit of [q=>q.rules.minDoorWidth=.5,q=>q.game.baseCommit='main',q=>q.ground.floors.push({...floor}),
  q=>q.architecture.added.push({id:'BYGG-V-0001',kind:'wall',a:[0,0],b:[0,8],height:2.85,thickness:.1,sill:.9})]){
  const q=structuredClone(p);edit(q);if(q.architecture.added.length)q.architecture.added[0].a[0]=Infinity;
  assert.throws(()=>parseProject(q));
 }
});
test('schema 1 migration retains every original field, including decorations and mounts',()=>{
 const v1=exportPatch([],[],{createdAt:'2026-10-28T12:00:00.000Z'});
 v1.emptyFixed=true;v1.added=[{id:'NY-OBJ-0001',kind:'prop',roomId:'I09',x:1,z:2,yaw:0,w:.4,d:.5,height:.6,assetId:'local:'+'a'.repeat(64),mountId:'old-bench',elevation:.8}];
 v1.architecture={schemaVersion:1,edits:[],added:[],removed:[],floors:[],posters:[{id:'POSTER-1',image:'data:image/webp;base64,AA=='}],treatments:[{type:'blind',wallId:'WALL-1'}]};
 const migrated=migrateV1(v1);assert.equal(migrated.game.baseCommit,BASE_COMMIT);
 assert.deepEqual(migrated.legacyPatch,v1);assert.equal(migrated.mode,'edit-floor5');
 assert(migrated.migrationNotes.length>0);
});
test('new ZIP round trip verifies local binary hashes and blocks unsafe paths',async()=>{
 const bytes=new Uint8Array([0x67,0x6c,0x54,0x46,2,0,0,0]),hash=await assetHash(bytes),file=`assets/models/${hash}.glb`;
 const p=exportProject({assets:{library:[],local:[{assetId:'local:'+hash,file,bytes:bytes.length}],posters:[]}});
 const zip=await exportProjectZip(p,new Map([[file,bytes]]));
 const read=await parseProjectZip(zip);assert.deepEqual(read.project,p);assert.deepEqual(read.files.get(file),bytes);
 await assert.rejects(()=>parseProjectZip(makeZip([{name:'project.json',data:JSON.stringify(p)},{name:'AGENT_BRIEF.md',data:'x'}])));
 assert.throws(()=>makeZip([{name:'../evil',data:'x'}]));
});
test('legacy ZIP imports without losing binary model identity or editor-only metadata',async()=>{
 const bytes=new Uint8Array([0x67,0x6c,0x54,0x46,2,0,0,0]),hash=await assetHash(bytes),v1=exportPatch([],[]);
 v1.added=[{id:'NY-OBJ-0001',kind:'prop',roomId:'I09',x:1,z:2,yaw:0,w:.4,d:.5,height:.6,assetId:'local:'+hash,assetName:'Egen'}];
 v1.emptyFixed=true;v1.architecture={schemaVersion:1,edits:[],added:[],removed:[],floors:[],posters:[],treatments:[{type:'curtain'}]};
 const zip=makeZip([{name:'projekt.json',data:JSON.stringify(v1)},{name:`models/${hash}.glb`,data:bytes}]);
 const result=await parseProjectZip(zip);assert.deepEqual(result.project.legacyPatch,v1);assert.equal(result.project.assets.local[0].bytes,8);
 assert.deepEqual(result.files.get(`assets/models/${hash}.glb`),bytes);
});
test('ZIP rejects inconsistent central-directory filename even when local entry is safe',()=>{
 const zip=makeZip([{name:'project.json',data:'{}'}]);const changed=zip.slice();
 const central=changed.findIndex((_,i)=>i+4<changed.length&&changed[i]===0x50&&changed[i+1]===0x4b&&changed[i+2]===1&&changed[i+3]===2);
 changed[central+46]=46;assert.throws(()=>readZip(changed));
});
