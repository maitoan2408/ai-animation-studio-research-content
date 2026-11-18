import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {bakeGeneralDrop,validateGeneralDrop,verifyGeneralDropBake,type GeneralDrop} from '../src/physics/general-drop.js';
import type {ArtPack} from '../src/scene/types.js';
const pack=JSON.parse(readFileSync(new URL('../assets/lantern-v1/manifest.json',import.meta.url),'utf8')) as ArtPack;
const example=(asset='props/cup',kind:'ball'|'box'='box'):GeneralDrop=>({
 schemaVersion:'general-physics/1',asset,
 assetSha256:pack.assets.find(a=>a.id===asset)!.sha256,
 initial:{centerX:960,centerY:530,angleDeg:0},
 collider:kind==='box'?{kind:'box',halfWidthPx:16,halfHeightPx:17}:
   {kind:'ball',radiusPx:19},
 platform:{left:600,right:1300,top:650},
 initialVelocity:{xPxPerSecond:30,yPxPerSecond:0,angularDegPerSecond:10},
 physics:{massKg:.6,restitution:.2,friction:.6,gravityMps2:9.81},
 frames:96,pixelsPerMeter:200,
});
test('G3 dynamic native Rapier bake is immutable per-frame, deterministic for two arbitrary prop shapes',async()=>{
 for(const [asset,kind] of [['props/cup','box'],['props/lantern-dark','ball']] as const){
   const p=example(asset,kind),a=await bakeGeneralDrop(p,pack),b=await bakeGeneralDrop(p,pack);
   assert.deepEqual(a,b,'bake nondeterminism '+asset);
   assert.equal(a.frames.length,96);
   assert.equal(a.frames[0]!.centerY,530);
   assert.ok(a.frames.some(f=>f.centerY>580),'prop never falls');
   assert.ok(a.contacts.length>=1,'no real solver platform contact');
   assert.equal(verifyGeneralDropBake(a,p).sha256,a.sha256);
 }
});
test('G3 physics fails closed on stale art, unsupported shape, impossible platform and tampered SHA',async()=>{
 const p=example();
 p.assetSha256='0'.repeat(64);
 assert.throws(()=>validateGeneralDrop(p,pack),/GENERAL_PHYSICS_ASSET_STALE/);
 p.assetSha256=pack.assets.find(a=>a.id===p.asset)!.sha256;
 p.platform.top=480;
 assert.throws(()=>validateGeneralDrop(p,pack),/GENERAL_PHYSICS_PLATFORM_BOUNDS/);
 p.platform.top=650;p.collider={kind:'ball',radiusPx:300};
 assert.throws(()=>validateGeneralDrop(p,pack),/GENERAL_PHYSICS_SHAPE/);
 p.collider={kind:'box',halfWidthPx:16,halfHeightPx:17};
 const bake=await bakeGeneralDrop(p,pack);
 const bad=structuredClone(bake);bad.frames[5]!.centerY+=1;
 assert.throws(()=>verifyGeneralDropBake(bad,p),/GENERAL_PHYSICS_BAKE_HASH/);
});

// A digest is public integrity data, not authentication. Recomputing it
// after editing the baked frames must not authorize fabricated physics.
test('G3 rejects rehashed forged bake at the trusted physics boundary',async()=>{
 const p=example(),bake=await bakeGeneralDrop(p,pack);
 const forged=structuredClone(bake);
 forged.frames[8]!.centerY+=1000;
 const {sha256:ignored,...payload}=forged;
 forged.sha256=createHash('sha256').update(JSON.stringify(payload)).digest('hex');
 assert.equal(typeof ignored,'string');
 // A newly calculated digest cannot substitute for a deterministic solver result.
 await assert.rejects(async()=>{
   verifyGeneralDropBake(forged,p);
 },/GENERAL_PHYSICS_(?:BAKE_FORGED|FRAME_INVALID)/);
});
