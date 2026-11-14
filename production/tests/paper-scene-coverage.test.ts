import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {heroFrame} from '../src/motion/hero.js';
import {validateBake} from '../src/physics/bake.js';
import {requireForegroundContour} from '../src/art/paper-scene/coverage.js';
import {assetPoint} from '../src/scene/geometry.js';
import type {ArtPack} from '../src/scene/types.js';
import type {HeroInput} from '../src/physics/hero.js';
const read=async(p:string)=>JSON.parse(await readFile(new URL(p,import.meta.url),'utf8'));
const pack=await read('../assets/lantern-polish-1/manifest.json') as ArtPack;
const input=await read('../artifacts/quality/contracts-20261114/input.json') as HeroInput;
const bake=validateBake(await read('../artifacts/quality/contracts-20261114/bake.json'));
const contours=await read('../artifacts/quality/v2-f2/s05-binary-contours.json') as {assets:{id:string;sourceSha256:string}[]};
test('S05 paper faces cover all actor/prop sprites and preserve rig anchors across every frame',()=>{
 let samples=0;
 for(let f=0;f<192;f++){
  const scene=heroFrame(pack,input,bake,f);
  for(const s of scene.sprites.filter(s=>['mai/','an/','mouth/','props/'].some(p=>s.asset.startsWith(p)))){
   const asset=pack.assets.find(a=>a.id===s.asset)!;const contour=contours.assets.find(a=>a.id===s.asset);
   assert.ok(contour,`${f}:${s.id} missing contour`);assert.equal(contour.sourceSha256,asset.sha256);
   const object=new THREE.Object3D();object.position.set(s.x-960,540-s.y,s.z);object.rotation.z=-s.rotation*Math.PI/180;
   object.scale.set(s.scaleX,s.scaleY,1);object.updateMatrixWorld(true);
   for(const point of [asset.pivot,...Object.values(asset.anchors)]){
    const expected=assetPoint(pack,s,point);
    const actual=object.localToWorld(new THREE.Vector3(point[0]-asset.pivot[0],asset.pivot[1]-point[1],0));
    assert.ok(Math.abs(actual.x+960-expected[0])<1e-8,`${f}:${s.id}:x`);
    assert.ok(Math.abs(540-actual.y-expected[1])<1e-8,`${f}:${s.id}:y`);samples++;
   }
  }
 }
 assert.ok(samples>6000);
});

test('missing foreground silhouettes reject while explicit background plates remain allowed',()=>{
 assert.throws(()=>requireForegroundContour('mai/torso',false),/SCENE_CONTOUR_REQUIRED/);
 assert.doesNotThrow(()=>requireForegroundContour('mai/torso',true));
 assert.doesNotThrow(()=>requireForegroundContour('background/sky',false));
});
