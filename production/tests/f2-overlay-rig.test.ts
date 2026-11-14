import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {actorSprites} from '../src/scene/rig.js';
import {anchorPoint} from '../src/scene/geometry.js';
import type {ArtPack,ActorPose} from '../src/scene/types.js';
const read=async(p:string)=>JSON.parse(await readFile(new URL(p,import.meta.url),'utf8'));
const base=await read('../assets/lantern-polish-1/manifest.json') as ArtPack;
const heads=await read('../assets/lantern-expression-f2-draft-2/manifest.json');
const mouths=await read('../assets/lantern-mouth-f2-draft/manifest.json');
const pack:ArtPack={...base,version:'lantern-f2-development-1',assets:[...base.assets,...heads.assets,
 ...mouths.assets.map((a:object)=>({...a,anchors:{},category:'mouth',colorSpace:'srgb',alpha:'straight',source:'project-original-development'}))]};
test('separate development overlay assembles every draft pose using unchanged rig anchors',()=>{
 assert.equal(pack.assets.length,138);
 for(const character of ['mai','an'] as const) for(const view of ['front','quarter','profile'] as const)
 for(const mood of ['neutral','worried','happy','sad','surprised','angry'])
 for(const mouth of ['M','A','E','O','F','U','L','teeth']){
  const pose={id:character,character,x:character==='mai'?760:1140,floor:860,facing:character==='mai'?1:-1,view,mood,mouth} as ActorPose;
  const scene=actorSprites(pack,pose),head=scene.sprites.find(s=>s.id===`${character}.head`)!,lips=scene.sprites.find(s=>s.id===`${character}.mouth`)!;
  assert.equal(head.asset,`${character}/head-${view}-${mood}`);assert.equal(lips.asset,`mouth/${mouth}`);
  const point=anchorPoint(pack,head,'mouth');assert.ok(Math.hypot(lips.x-point[0],lips.y-point[1])<1e-8);
 }
});
test('old locked hero bake cannot silently consume the new art revision',async()=>{
 const {heroFrame}=await import('../src/motion/hero.js');
 const {validateBake}=await import('../src/physics/bake.js');
 const input=await read('../artifacts/quality/contracts-20261114/input.json');
 const bake=validateBake(await read('../artifacts/quality/contracts-20261114/bake.json'));
 assert.throws(()=>heroFrame(pack,input,bake,100),/HERO_ART_MISMATCH/);
});
