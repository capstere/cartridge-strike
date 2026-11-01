import test from 'node:test';import assert from 'node:assert/strict';
import {createCurtain,createBlind,parseTreatments,treatmentPosition} from './treatments.mjs?v=5.1.0';
import {exportArchitecture,parseArchitecture} from './architecture.mjs?v=5.1.0';
const wall={id:'WALL-0001',source:true,kind:'wall',a:[2,4],b:[8,4],height:2.85,thickness:.1,sill:.9,finish:'white'};
const win={...wall,id:'WALL-0002',kind:'window',a:[2,8],b:[4,8]};
test('dragging curtain line on an arbitrary wall creates ceiling-height attached decoration',()=>{
 const p=createCurtain([wall],[],wall.id,[2.8,4.02],[6.7,3.95]);
 assert.equal(p.type,'curtain');assert.equal(p.wallId,wall.id);
 const at=treatmentPosition(p,[wall]);
 assert(at.width>3.8&&at.width<4.1);
 assert.deepEqual(parseTreatments([p],[wall]),[p]);
});
test('blind attaches exactly to window width without manual sizing',()=>{
 const b=createBlind([win],[],win.id);
 const at=treatmentPosition(b,[win]);
 assert.equal(b.type,'blind');assert(at.width>1.9&&at.width<2.01);
 assert.throws(()=>createBlind([wall],[],wall.id),/FÖNSTER/);
});
test('existing architecture patch format remains version 1 with optional treatments',()=>{
 assert.deepEqual(parseTreatments(undefined,[wall]),[]);
 const baseline=[wall,win],serialized=exportArchitecture(baseline,baseline);
 const doc={...serialized,treatments:[createCurtain(baseline,[],wall.id,[3,4],[5,4])]};
 const read=parseArchitecture(doc,baseline);
 assert.equal(read.entries.length,2);
 assert.equal(parseTreatments(doc.treatments,read.entries).length,1);
});
test('invalid wall/short line/out-of-wall/harmful IDs and opaque formats rejected',()=>{
 assert.throws(()=>createCurtain([wall],[],wall.id,[2,4],[2.1,4]),/24 cm/);
 assert.throws(()=>createCurtain([wall],[],wall.id,[3,5],[4,5]),/samma vägg/);
 const p=createCurtain([wall],[],wall.id,[3,4],[5,4]);
 assert.throws(()=>parseTreatments([{...p,wallId:'MISSING'}],[wall]),/finns inte/);
 assert.throws(()=>parseTreatments([p,p],[wall]),/Dubbelt/);
 assert.throws(()=>parseTreatments([{...p,id:'../bad'}],[wall]),/Ogiltigt/);
});
