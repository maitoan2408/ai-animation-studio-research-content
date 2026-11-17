import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sampleGeneralFilm,validateGeneralFilm,type GeneralFilm} from '../src/motion/general-timeline.js';
import {auditFrame} from '../src/qa/general-scene-quality.js';
import type {ArtPack} from '../src/scene/types.js';
const pack=JSON.parse(readFileSync(new URL('../assets/lantern-v1/manifest.json',import.meta.url),'utf8')) as ArtPack;
const film=():GeneralFilm=>({
 schemaVersion:'general-film/1',frames:96,
 tracks:[{
  contact:{schemaVersion:'general-contact/1',
    actor:{id:'actor-one',model:'an',rigId:'production-cutout-1',
      x:800,floor:860,facing:1,scale:1},
    object:{id:'mug-one',asset:'props/cup',
      sha256:pack.assets.find(x=>x.id==='props/cup')!.sha256,
      x:900,y:650,scale:.7,anchor:'grip'},
    hand:'right',camera:{x:960,y:540,zoom:1}},
  keys:[{frame:0,dx:0,dy:0,headAngle:0},
    {frame:32,dx:0,dy:-32,headAngle:6},
    {frame:60,dx:4,dy:-44,headAngle:6},
    {frame:95,dx:0,dy:0,headAngle:0}],
 }],
 camera:[{frame:0,x:960,y:540,zoom:1},
  {frame:95,x:952,y:538,zoom:1.08}],
});
test('G3 deterministic arbitrary frame seek, continuous camera and planted feet',()=>{
 const f=film();
 validateGeneralFilm(f,pack);
 const all=Array.from({length:f.frames},(_,i)=>sampleGeneralFilm(f,i,pack));
 assert.deepEqual(sampleGeneralFilm(f,54,pack),all[54]);
 assert.deepEqual(sampleGeneralFilm(f,0,pack),all[0]);
 assert.deepEqual(sampleGeneralFilm(f,95,pack),all[95]);
 for(let i=0;i<f.frames;i++){
   const s=all[i]!;
   assert.equal(auditFrame(s.frame,pack,{frame:i,contacts:s.contacts}).length,0);
   if(i){
     const a=all[i-1]!,b=s;
     assert.ok(Math.abs(a.frame.camera.x-b.frame.camera.x)<2);
     const actor=(x:typeof a)=>x.frame.markers.find(y=>y.id==='actor-one.left-sole')!.point;
     assert.deepEqual(actor(a),actor(b),'standing character feet slipped');
     const before=a.frame.sprites.find(x=>x.id==='mug-one')!;
     const after=b.frame.sprites.find(x=>x.id==='mug-one')!;
     assert.ok(Math.hypot(before.x-after.x,before.y-after.y)<4,'prop jumped');
   }
 }
});
test('G3 two distinct characters, hands and props coexist with IDs and contacts',()=>{
 const f=film();const second=structuredClone(f.tracks[0]!);
 second.contact.actor={id:'actor-two',model:'mai',rigId:'production-cutout-1',
    x:1300,floor:860,facing:1,scale:1};
 second.contact.object={id:'lantern-two',asset:'props/lantern-dark',
    sha256:pack.assets.find(a=>a.id==='props/lantern-dark')!.sha256,
    x:1200,y:730,scale:.65,anchor:'grip'};
 second.contact.hand='left';
 f.tracks.push(second);
 const sample=sampleGeneralFilm(f,36,pack);
 assert.equal(sample.contacts.length,2);
 assert.ok(sample.frame.sprites.some(x=>x.id==='actor-two.left-grip-front'));
 assert.equal(new Set(sample.frame.sprites.map(x=>x.id)).size,sample.frame.sprites.length);
});
test('G3 rejects bad keys, duplicate IDs, unreachable motion and incomplete spans',()=>{
 const f=film();f.tracks[0]!.keys[2]!.dy=-200;
 assert.throws(()=>validateGeneralFilm(f,pack),/GENERAL_FILM_KEY_INVALID/);
 f.tracks[0]!.keys[2]!.dy=0;f.tracks[0]!.keys[0]!.frame=1;
 assert.throws(()=>validateGeneralFilm(f,pack),/GENERAL_FILM_KEY_BOUNDARY/);
 f.tracks[0]!.keys[0]!.frame=0;f.tracks[0]!.keys[1]!.dx=100;
 assert.throws(()=>validateGeneralFilm(f,pack),/GENERAL_CONTACT_UNREACHABLE|GENERAL_CONTACT_WRONG_SIDE/);
 f.tracks[0]!.keys[1]!.dx=0;f.tracks.push(structuredClone(f.tracks[0]!));
 assert.throws(()=>validateGeneralFilm(f,pack),/GENERAL_FILM_DUPLICATE_ACTOR_OR_PROP/);
 assert.throws(()=>sampleGeneralFilm(f,-1,pack),/GENERAL_FILM_DUPLICATE_ACTOR_OR_PROP/);
});
