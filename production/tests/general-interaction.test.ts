import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sampleGeneralGrip,validateGeneralContact,type ContactProject} from '../src/motion/general-interaction.js';
import {anchorPoint} from '../src/scene/geometry.js';
import {auditFrame} from '../src/qa/general-scene-quality.js';
import type {ArtPack} from '../src/scene/types.js';
const pack=JSON.parse(readFileSync(new URL('../assets/lantern-v1/manifest.json',import.meta.url),'utf8')) as ArtPack;
const build=(model:string,hand:'left'|'right',prop='props/cup',facing:1|-1=1):ContactProject=>{
 const item=pack.assets.find(x=>x.id===prop)!;
 const direction=facing*(hand==='left'?-1:1);
 return {schemaVersion:'general-contact/1',
  actor:{id:'actor-x',model,rigId:'production-cutout-1',x:900,floor:860,facing,scale:1},
  object:{id:'item-x',asset:prop,sha256:item.sha256,x:900+direction*100,
    y:prop==='props/cup'?650:730,scale:prop==='props/cup'?.7:.65,anchor:'grip'},
  hand,camera:{x:960,y:540,zoom:1}};
};
test('G2 both hands, both prebuilt characters and multiple different props produce actual correct visual contacts',()=>{
 let count=0;
 for(const model of ['an','mai'])for(const hand of ['left','right'] as const)
 for(const prop of ['props/cup','props/lantern-dark']){
   const p=build(model,hand,prop);
   const s=sampleGeneralGrip(p,pack);
   assert.equal(s.pose.layeredGripSide,hand);
   const ids=s.frame.sprites.map(x=>x.id);
   assert.ok(ids.includes('actor-x.'+hand+'-grip-front'));
   assert.equal(auditFrame(s.frame,pack,{frame:0,contacts:[s.contact]}).length,0);
   const palm=s.frame.sprites.find(x=>x.id==='actor-x.'+hand+'-hand')!;
   const object=s.frame.sprites.find(x=>x.id==='item-x')!;
   const finger=s.frame.sprites.find(x=>x.id==='actor-x.'+hand+'-grip-front')!;
   assert.ok(palm.z<object.z&&object.z<finger.z);
   const p1=anchorPoint(pack,palm,'grip'),p2=anchorPoint(pack,object,'grip');
   assert.ok(Math.hypot(p1[0]-p2[0],p1[1]-p2[1])<.001);
   count++;
 }
 assert.equal(count,8);
});
test('G2 rejects wrong-hand staging, stale asset hash, missing anchor and invalid reach',()=>{
 const x=build('an','left');
 x.object.x=1050;
 assert.throws(()=>validateGeneralContact(x,pack),/GENERAL_CONTACT_WRONG_SIDE/);
 x.object.x=800;x.object.sha256='a'.repeat(64);
 assert.throws(()=>validateGeneralContact(x,pack),/GENERAL_PROP_ANCHOR_OR_HASH/);
 x.object.sha256=pack.assets.find(a=>a.id==='props/cup')!.sha256;
 x.object.anchor='invalid';
 assert.throws(()=>validateGeneralContact(x,pack),/GENERAL_PROP_ANCHOR_OR_HASH/);
 x.object.anchor='grip';x.object.y=120;
 assert.throws(()=>sampleGeneralGrip(x,pack),/GENERAL_CONTACT_UNREACHABLE/);
});
test('G2 accepts horizontally mirrored actors without silently reversing selected hand',()=>{
 for(const hand of ['left','right'] as const){
   const x=build('mai',hand,'props/cup',-1);
   const s=sampleGeneralGrip(x,pack);
   assert.equal(s.pose.facing,-1);assert.equal(s.pose.layeredGripSide,hand);
   assert.equal(auditFrame(s.frame,pack,{frame:0,contacts:[s.contact]}).length,0);
 }
});
test('G2 compatible new character kit can be registered through asset manifest without hardcoding name',()=>{
 const other=structuredClone(pack);
 other.assets.push(...pack.assets.filter(x=>x.id.startsWith('an/')).map(x=>({
   ...x,id:x.id.replace(/^an\//,'flora/'),file:x.file,
 })));
 const project=build('flora','right');
 const frame=sampleGeneralGrip(project,other);
 assert.ok(frame.frame.sprites.some(s=>s.asset==='flora/hand-grip-front'));
});
