import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sampleGeneralFilm,type GeneralFilm} from '../src/motion/general-timeline.js';
import {centerOfSprite,sampleGeneralPlayback,type GeneralPlayback} from '../src/motion/general-playback.js';
import {bakeGeneralDrop,type GeneralDrop} from '../src/physics/general-drop.js';
import {auditG3VisualIntent} from '../src/qa/g3-visual-intent.js';
import type {ArtPack} from '../src/scene/types.js';

const pack=JSON.parse(readFileSync(new URL('../assets/lantern-v1/manifest.json',import.meta.url),'utf8')) as ArtPack;
const art=(id:string)=>pack.assets.find(x=>x.id===id)!;
async function fixture(hand:'left'|'right',prop:'props/cup'|'props/lantern-dark',frames=128,releaseFrame=64){
 const actorX=hand==='right'?800:1280,propX=hand==='right'?900:1180;
 const table=art('props/workbench'),benchX=hand==='right'?1060:1120;
 const film:GeneralFilm={schemaVersion:'general-film/1',frames,
  tracks:[{contact:{schemaVersion:'general-contact/1',
    actor:{id:'actor-test',model:hand==='right'?'an':'mai',rigId:'production-cutout-1',
      x:actorX,floor:860,facing:1,scale:1},
    object:{id:'prop-test',asset:prop,sha256:art(prop).sha256,
      x:propX,y:631,scale:prop==='props/cup'?.7:.65,anchor:'grip'},
    hand,camera:{x:960,y:540,zoom:1}},
    keys:[{frame:0,dx:0,dy:0,headAngle:0},
      {frame:24,dx:0,dy:-6,headAngle:0},
      {frame:48,dx:0,dy:-26,headAngle:3},
      {frame:frames-1,dx:0,dy:-26,headAngle:3}]}],
  stage:[{id:'bench-test',asset:table.id,sha256:table.sha256,x:benchX,y:860,z:-1,scale:1.2}],
  camera:[{frame:0,x:960,y:540,zoom:1},{frame:frames-1,x:960,y:540,zoom:1.05}]};
 const grip=sampleGeneralFilm(film,releaseFrame-1,pack);
 const p=grip.frame.sprites.find(s=>s.id==='prop-test')!,[x,y]=centerOfSprite(p,pack);
 const physics:GeneralDrop={schemaVersion:'general-physics/1',asset:prop,
  assetSha256:art(prop).sha256,initial:{centerX:x,centerY:y,angleDeg:0},
  collider:{kind:'box',halfWidthPx:prop==='props/cup'?22:32,
    halfHeightPx:prop==='props/cup'?26:55},
  platform:{left:benchX-table.pivot[0]*1.2,
    right:benchX+(table.width-table.pivot[0])*1.2,
    top:860+(table.anchors.support![1]-table.pivot[1])*1.2},
  initialVelocity:{xPxPerSecond:0,yPxPerSecond:0,angularDegPerSecond:0},
  physics:{massKg:.5,restitution:.04,friction:.8,gravityMps2:9.81},
  frames:frames-releaseFrame,pixelsPerMeter:200};
 const bake=await bakeGeneralDrop(physics,pack);
 const movie:GeneralPlayback={schemaVersion:'general-playback/1',film,
  releases:[{actorId:'actor-test',frame:releaseFrame,project:physics,bake,settleFrames:24}]};
 return movie;
}
for(const [hand,prop] of [['right','props/cup'],['left','props/lantern-dark']] as const){
 test('G3 visual owner contract: real '+hand+' '+prop+' held→fall→supported',async()=>{
  const movie=await fixture(hand,prop);
  const first=movie.releases[0]!.frame+movie.releases[0]!.bake.contacts[0]!;
  assert.ok(first>64,'physics should include a fall phase');
  const seen=new Set<string>();
  for(let i=0;i<movie.film.frames;i++){
   const s=sampleGeneralPlayback(movie,i,pack);
   const r=auditG3VisualIntent(movie,i,s.frame,pack);
   assert.deepEqual(r.issues,[],'frame '+i+': '+JSON.stringify(r.issues));
   assert.equal(r.states.length,1);
   seen.add(r.states[0]!.state);
   if(i<64)assert.equal(r.states[0]!.state,'held');
   if(i===64)assert.equal(r.states[0]!.state,'falling');
   if(i>=first+6)assert.equal(r.states[0]!.state,'resting');
  }
  assert.deepEqual([...seen].sort(),['falling','held','resting','settling']);
  const end=sampleGeneralPlayback(movie,127,pack);
  const displaced=structuredClone(end.frame);
  displaced.sprites.find(s=>s.id==='prop-test')!.y-=30;
  assert.ok(auditG3VisualIntent(movie,127,displaced,pack).issues
    .some(x=>x.code==='G3_VISUAL_RESTING_PROP_FLOAT_OR_SINK'));
  const outside=structuredClone(end.frame);
  outside.sprites.find(s=>s.id==='prop-test')!.x+=500;
  assert.ok(auditG3VisualIntent(movie,127,outside,pack).issues
    .some(x=>x.code==='G3_VISUAL_PROP_OUTSIDE_SUPPORT'));
  const held=sampleGeneralPlayback(movie,12,pack).frame;
  const badOpen=structuredClone(held);
  badOpen.sprites.find(s=>s.id==='actor-test.'+hand+'-hand')!.asset=
   (hand==='right'?'an':'mai')+'/hand-open';
  assert.ok(auditG3VisualIntent(movie,12,badOpen,pack).issues
    .some(x=>x.code==='G3_VISUAL_HELD_HAND_OPEN'));
  const detach=structuredClone(held);
  detach.sprites.find(s=>s.id==='prop-test')!.x+=20;
  assert.ok(auditG3VisualIntent(movie,12,detach,pack).issues
    .some(x=>x.code==='G3_VISUAL_HELD_GRIP_DETACHED'));
 });
}
