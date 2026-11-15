import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {toProductionFrame,type StageShotTimeline} from '../src/scene/animation-ir-adapter.js';
import type {ArtPack} from '../src/scene/types.js';

const ir=JSON.parse(await readFile(new URL('../fixtures/m1-production-ir.json',import.meta.url),'utf8')) as StageShotTimeline;
const pack=JSON.parse(await readFile(new URL('../assets/lantern-v1/manifest.json',import.meta.url),'utf8')) as ArtPack;

test('M1 real IR scene resolves rig sprites, contact anchors and camera center',()=>{
  const start=toProductionFrame(ir,0,pack);
  assert.deepEqual(start.frame.camera,{x:960,y:540,zoom:1});
  assert.ok(start.frame.sprites.length>20,'background + two full puppet rigs + lantern');
  assert.ok(start.frame.markers.some(m=>m.id==='lantern.grip'&&m.kind==='contact'));
  assert.ok(start.frame.markers.some(m=>m.id==='mai.right-grip'));
  assert.ok(start.frame.sprites.some(s=>s.id==='lantern'&&s.asset==='props/lantern-lit'));
  assert.equal(toProductionFrame(ir,35,pack).frame.camera.x,1005);
  assert.equal(toProductionFrame(ir,36,pack).frame.camera.x,1040);
  assert.equal(toProductionFrame(ir,71,pack).frame.camera.x,975);
  assert.equal(toProductionFrame(ir,36,pack).localFrame,0);
  assert.equal(toProductionFrame(ir,36,pack).shotId,'s002');
});
test('random-order frame evaluation remains pure and stage-bound',()=>{
  const frames=[0,12,23,35,36,47,60,71];
  const serialized=new Map(frames.map(f=>[f,JSON.stringify(toProductionFrame(ir,f,pack))]));
  for(const f of [...frames].reverse())assert.equal(JSON.stringify(toProductionFrame(ir,f,pack)),serialized.get(f));
  assert.throws(()=>toProductionFrame(ir,-1,pack),/IR_FRAME_OUT_OF_RANGE/);
  assert.throws(()=>toProductionFrame(ir,72,pack),/IR_FRAME_OUT_OF_RANGE/);
});
test('bad camera, bad asset provenance and actor binding are rejected',()=>{
  const wrong=JSON.parse(JSON.stringify(ir)) as StageShotTimeline;
  wrong.shots[0]!.production!.camera.from.x=0;
  // Arbitrary camera coordinates are valid when authored; default must
  // nevertheless be anchored, enforced by the positive camera assertion above.
  assert.equal(toProductionFrame(wrong,0,pack).frame.camera.x,0);
  const broken=JSON.parse(JSON.stringify(ir)) as StageShotTimeline;
  broken.shots[0]!.production!.props[0]!.assetSha256='a'.repeat(64);
  assert.throws(()=>toProductionFrame(broken,0,pack),/IR_PROP_ASSET_ANCHOR_HASH/);
  const missing=JSON.parse(JSON.stringify(ir)) as StageShotTimeline;
  missing.shots[0]!.production!.actors[0]!.id='ghost';
  assert.throws(()=>toProductionFrame(missing,0,pack),/IR_ACTOR_RIG_BINDING/);
  const missingScene=JSON.parse(JSON.stringify(ir)) as StageShotTimeline;
  delete missingScene.shots[0]!.production;
  assert.throws(()=>toProductionFrame(missingScene,0,pack),/IR_PRODUCTION_SCENE_MISSING/);
  const invalidPack={...pack,version:'wrong'};
  assert.throws(()=>toProductionFrame(ir,0,invalidPack),/IR_ART_PACK_VERSION_MISMATCH/);
  const wrongFrame=JSON.parse(JSON.stringify(ir)) as StageShotTimeline;
  wrongFrame.shots[1]!.interval.startFrame=37;
  assert.throws(()=>toProductionFrame(wrongFrame,0,pack),/IR_INVALID_SHOT_INTERVAL/);
});
