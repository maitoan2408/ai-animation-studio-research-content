import {test} from 'node:test';
import assert from 'node:assert/strict';
import {contactPoints} from '../src/art/paper-scene/contact.js';
import type {ArtPack,SceneFrame} from '../src/scene/types.js';
const pack={assets:[{id:'boot',pivot:[0,0],anchors:{sole:[0,0]}}]} as unknown as ArtPack;
const ids=['mai.left-boot','mai.right-boot','an.left-boot','an.right-boot'];
const frame={sprites:ids.map((id,i)=>({id,asset:'boot',x:i*10,y:860,rotation:0,scaleX:1,scaleY:1}))} as SceneFrame;
test('contact blobs use declared ground and actual sole anchors',()=>{const p=contactPoints(pack,frame,860);assert.deepEqual(p.get(ids[2]!),[20,860]);assert.equal(p.size,4);});
test('missing foot, nonfinite and foot above ground reject',()=>{
 assert.throws(()=>contactPoints(pack,{...frame,sprites:frame.sprites.slice(1)},860),/PAPER_CONTACT_SPRITE/);
 assert.throws(()=>contactPoints(pack,frame,NaN),/PAPER_CONTACT_GROUND/);
 assert.throws(()=>contactPoints(pack,{...frame,sprites:frame.sprites.map((s,i)=>i===0?{...s,y:850}:s)},860),/PAPER_CONTACT_GAP/);
});
