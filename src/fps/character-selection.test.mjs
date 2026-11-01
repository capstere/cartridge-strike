import test from 'node:test';
import assert from 'node:assert/strict';
import {preferredCharacter,characterMenuURL} from './character-selection.mjs';
const id='00112233-4455-6677-8899-aabbccddeeff',base='https://example.test/game/fps/?level=synthetic-demo&test=1';
test('explicit original overrides remembered choice; storage failure leaves original available',()=>{
 assert.equal(preferredCharacter(base,{getItem:()=>id}),id);
 assert.equal(preferredCharacter(base+'&avatar=',{getItem:()=>id}),'');
 assert.equal(preferredCharacter(base,{getItem(){throw Error('blocked');}}),'');
 assert.equal(preferredCharacter(base+'&avatar=missing',{getItem:()=>id}),'missing','bad selection must be reported, not silently replaced');
});
test('menu navigation retains level and seed/team while leaving rehearsal',()=>{
 const u=new URL(characterMenuURL(base+'&character='+id,id,{team:'counterAnalysts',seed:123}));
 assert.equal(u.searchParams.get('avatar'),id);assert.equal(u.searchParams.get('level'),'synthetic-demo');assert.equal(u.searchParams.get('test'),'1');assert.equal(u.searchParams.get('team'),'counterAnalysts');assert.equal(u.searchParams.get('seed'),'123');assert(!u.searchParams.has('character'));
 assert.throws(()=>characterMenuURL(base,'https://remote/model.glb'),/Ogiltig/);
 assert.equal(new URL(characterMenuURL(base,'',{team:'bad',seed:-1})).searchParams.get('seed'),'1');
});
