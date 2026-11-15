import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {heroFrame} from '../src/motion/hero.js';
import {heroPhysics} from '../src/physics/recipe.js';
import {validateBake} from '../src/physics/bake.js';
import {anchorPoint} from '../src/scene/geometry.js';
import type {ArtPack} from '../src/scene/types.js';
import type {HeroInput} from '../src/physics/hero.js';
const read=async(p:string)=>JSON.parse(await readFile(new URL(p,import.meta.url),'utf8'));
const pack=await read('../assets/lantern-polish-1/manifest.json') as ArtPack;
const input=await read('../artifacts/quality/contracts-20261114/input.json') as HeroInput;
const bake=validateBake(await read('../artifacts/quality/contracts-20261114/bake.json'));
test('bounded life variant changes Mai while preserving actual feet, grip, prop, camera and An',()=>{
 let changed=0,blinks=0;
 for(let frame=0;frame<192;frame++){
  const baseline=heroFrame(pack,input,bake,frame), variant=heroFrame(pack,input,bake,frame,heroPhysics,0,{seed:42,intensity:1});
  assert.deepEqual(heroFrame(pack,input,bake,frame,heroPhysics,0,{seed:42,intensity:0}),baseline);
  assert.deepEqual(variant.camera,baseline.camera);
  assert.deepEqual(variant.sprites.filter(s=>s.id==='lamp'||s.id.startsWith('an.')),baseline.sprites.filter(s=>s.id==='lamp'||s.id.startsWith('an.')));
  for(const id of ['mai.left-boot','mai.right-boot','mai.right-hand']) {
   const a=variant.sprites.find(s=>s.id===id)!,b=baseline.sprites.find(s=>s.id===id)!;
   assert.deepEqual(anchorPoint(pack,a,id.endsWith('boot')?'sole':'grip'),anchorPoint(pack,b,id.endsWith('boot')?'sole':'grip'));
  }
  if(variant.sprites.find(s=>s.id==='mai.head')!.asset.endsWith('-blink'))blinks++;
  if(JSON.stringify(variant)!==JSON.stringify(baseline))changed++;
 }
 assert.ok(changed>180);assert.ok(blinks>0);
});
test('life variant seeks independently and refuses unsupported inputs',()=>{
 const opts={seed:42,intensity:1};const a=heroFrame(pack,input,bake,70,heroPhysics,0,opts);
 for(const frame of [191,0,108,70])heroFrame(pack,input,bake,frame,heroPhysics,0,opts);
 assert.deepEqual(heroFrame(pack,input,bake,70,heroPhysics,0,opts),a);
 for(const bad of [{seed:-1,intensity:1},{seed:0,intensity:2},{seed:NaN,intensity:1},{seed:0,intensity:NaN},{seed:0,intensity:1,extra:1}])
  assert.throws(()=>heroFrame(pack,input,bake,70,heroPhysics,0,bad),/HERO_LIFE_INVALID/);
});
test('seed and compatible head emphasis both affect evaluated frames without moving lamp',()=>{
 let different=0;
 for(let f=0;f<192;f++){
  const a=heroFrame(pack,input,bake,f,heroPhysics,1,{seed:42,intensity:1});
  const b=heroFrame(pack,input,bake,f,heroPhysics,1,{seed:43,intensity:1});
  if(a.sprites.find(s=>s.id==='mai.head')!.asset!==b.sprites.find(s=>s.id==='mai.head')!.asset)different++;
  assert.deepEqual(a.sprites.find(s=>s.id==='lamp'),b.sprites.find(s=>s.id==='lamp'));
 }
 assert.ok(different>0);
});
