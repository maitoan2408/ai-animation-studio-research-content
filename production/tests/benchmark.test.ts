import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {benchmarkFrame,shotFrames,type ShotId,walkPose} from '../src/scene/benchmark.js';
import {anchorPoint} from '../src/scene/geometry.js';
import {distance} from '../src/scene/math.js';
import type {ArtPack,SceneFrame,Point} from '../src/scene/types.js';
const pack=JSON.parse(await readFile(new URL('../assets/lantern-v1/manifest.json',import.meta.url),'utf8')) as ArtPack;
const part=(s:SceneFrame,id:string)=>{const p=s.sprites.find(p=>p.id===id);assert.ok(p,`missing ${id}`);return p;};
test('all 1152 frames evaluate with reachable IK, known assets and finite transforms',()=>{
 for(const [shot,count] of Object.entries(shotFrames))for(let f=0;f<count;f++){
  let s:SceneFrame;try{s=benchmarkFrame(pack,shot as ShotId,f);}catch(e){throw Error(`${shot}:${f}: ${String(e)}`);}
  for(const p of s.sprites){assert.ok(pack.assets.some(a=>a.id===p.asset),p.asset);for(const k of ['x','y','z','rotation','scaleX','scaleY','opacity'] as const)assert.ok(Number.isFinite(p[k]),`${shot}:${f}:${p.id}:${k}`);}
 }
});
test('pickup/placement and both handoff owners match actual rendered anchors every grip frame',()=>{
 for(const shot of ['S03','S05'] as const)for(let f=0;f<shotFrames[shot];f++){
  const s=benchmarkFrame(pack,shot,f),prop=part(s,shot==='S03'?'cup':'lamp');
  const owners=shot==='S03'?(f>=60&&f<180?['mai']:[]):[...(f<=107?['mai']:[]),...(f>=72?['an']:[])];
  for(const owner of owners){const hand=part(s,`${owner}.right-hand`),gap=distance(anchorPoint(pack,hand,'grip'),anchorPoint(pack,prop,'grip'));
   assert.ok(gap<=2&&gap*s.camera.zoom<=2,`${shot}:${f}:${owner} gap=${gap}`);}
  if(shot==='S03'&&f>=179)assert.ok(Math.abs(anchorPoint(pack,prop,'support')[1]-anchorPoint(pack,part(s,'bench'),'support')[1])<=2);
 }
});
test('walking stance soles stay planted in world space, independent of root and camera',()=>{
 for(let step=0;step<5;step++){
  const side=step%2===0?'right':'left';let first:Point|undefined;
  for(let f=12+24*step;f<=36+24*step;f++){
   const s=benchmarkFrame(pack,'S02',f),foot=part(s,`mai.${side}-boot`),sole=anchorPoint(pack,foot,'sole');
   if(!first)first=sole;assert.ok(distance(first,sole)<=2,`${side}:${f} drift ${distance(first,sole)}`);assert.ok(Math.abs(sole[1]-860)<1e-7);
  }
 }
 assert.equal(walkPose(12).x,640);assert.equal(walkPose(132).x,980);
});
test('frame evaluation does not depend on seek order; bounds fail explicitly',()=>{
 for(const shot of Object.keys(shotFrames) as ShotId[]){const baseline=benchmarkFrame(pack,shot,48);
  for(const f of [0,71,24,47,96,48])benchmarkFrame(pack,shot,f);
  assert.deepEqual(benchmarkFrame(pack,shot,48),baseline);
  assert.throws(()=>benchmarkFrame(pack,shot,-1),/FRAME_OUT_OF_RANGE/);assert.throws(()=>benchmarkFrame(pack,shot,shotFrames[shot]),/FRAME_OUT_OF_RANGE/);
 }
});
