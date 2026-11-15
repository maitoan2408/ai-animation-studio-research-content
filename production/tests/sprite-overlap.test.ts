import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {heroFrame} from '../src/motion/hero.js';
import {validateBake} from '../src/physics/bake.js';
import {inspectSpriteBounds} from '../src/continuity/sprite-overlap.js';
import type {ArtPack} from '../src/scene/types.js';
import type {HeroInput} from '../src/physics/hero.js';
const read=async(p:string)=>JSON.parse(await readFile(new URL(p,import.meta.url),'utf8'));
const pack=await read('../assets/lantern-polish-1/manifest.json') as ArtPack;
const input=await read('../artifacts/quality/contracts-20261114/input.json') as HeroInput;
const bake=validateBake(await read('../artifacts/quality/contracts-20261114/bake.json'));
test('actual S05 transforms produce finite bounded observations for both torsos',()=>{
  for(let f=0;f<192;f++){
    const scene=heroFrame(pack,input,bake,f),lamp=scene.sprites.find(s=>s.id==='lamp')!;
    for(const id of ['mai.torso','an.torso']){
      const torso=scene.sprites.find(s=>s.id===id)!;
      const result=inspectSpriteBounds(pack,lamp,torso);
      assert.ok(['BOUNDS_DISJOINT','BOUNDS_OVERLAP'].includes(result.status));
    }
  }
});
test('injected lamp inside real torso bounds is flagged and invalid transforms reject',()=>{
  const scene=heroFrame(pack,input,bake,100),lamp=scene.sprites.find(s=>s.id==='lamp')!,torso=scene.sprites.find(s=>s.id==='mai.torso')!;
  const injected={...lamp,x:torso.x,y:torso.y};
  assert.equal(inspectSpriteBounds(pack,injected,torso).status,'BOUNDS_OVERLAP');
  assert.equal(inspectSpriteBounds(pack,{...lamp,x:torso.x+3000},torso).status,'BOUNDS_DISJOINT');
  assert.throws(()=>inspectSpriteBounds(pack,{...lamp,scaleX:0},torso),/OVERLAP_TRANSFORM/);
  assert.throws(()=>inspectSpriteBounds(pack,{...lamp,x:1e308},torso),/OVERLAP_TRANSFORM/);
});
