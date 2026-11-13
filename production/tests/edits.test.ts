import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {benchmarkFrame,shotFrames,type ShotId,type Edit} from '../src/scene/benchmark.js';
import {voiceFixture} from '../src/audio/fixture.js';
import {phonemeCues} from '../src/audio/cues.js';
import {anchorPoint} from '../src/scene/geometry.js';
import {distance} from '../src/scene/math.js';
import type {ArtPack} from '../src/scene/types.js';
const pack=JSON.parse(await readFile(new URL('../assets/lantern-polish-1/manifest.json',import.meta.url),'utf8')) as ArtPack;
const readEdit=async(name:string)=>JSON.parse(await readFile(new URL(`../brief/${name}.json`,import.meta.url),'utf8')) as Edit;
const base:Edit={polish:true,cues:phonemeCues((await voiceFixture()).manifest.timings)};
const r1:Edit={...await readEdit('edit-R1'),cues:phonemeCues((await voiceFixture({voiceTake:'R1'})).manifest.timings)};
const r2=await readEdit('edit-R2');
test('R1 changes only S01/S03; longer voice hash and cue interval change together',async()=>{
 const old=await voiceFixture(),next=await voiceFixture(r1);
 assert.notEqual(next.sha256,old.sha256);assert.ok(next.manifest.speechSeconds>old.manifest.speechSeconds);
 assert.ok(next.manifest.speechSeconds<=4);assert.ok(r1.cues!.at(-1)!.end<=144);
 for(const shot of Object.keys(shotFrames) as ShotId[]){let changed=0;
  for(let f=0;f<shotFrames[shot];f++){
   const a=benchmarkFrame(pack,shot,f,base),b=benchmarkFrame(pack,shot,f,r1);
   if(JSON.stringify(a)!==JSON.stringify(b))changed++;
   if(shot==='S01'&&f>=12&&f<22){assert.ok(a.sprites.find(s=>s.id==='mai.head')!.asset.endsWith('-neutral'));assert.ok(b.sprites.find(s=>s.id==='mai.head')!.asset.endsWith('-worried'),'R1 must change the eyebrow drawing, not just tilt the head');}
   if(shot==='S03'&&f>=60&&f<180){const hand=b.sprites.find(s=>s.id==='mai.right-hand')!,cup=b.sprites.find(s=>s.id==='cup')!;assert.ok(distance(anchorPoint(pack,hand,'grip'),anchorPoint(pack,cup,'grip'))<=2);}
  }
  assert.equal(changed>0,['S01','S03'].includes(shot),`R1 scope ${shot}`);
 }
});
test('R2 changes only camera S04 and receiver reaction S05 exactly 12 frames later',()=>{
 for(const shot of Object.keys(shotFrames) as ShotId[]){let changed=0;
  for(let f=0;f<shotFrames[shot];f++){
   const a=benchmarkFrame(pack,shot,f,base),b=benchmarkFrame(pack,shot,f,{...base,...r2});
   if(JSON.stringify(a)!==JSON.stringify(b))changed++;
   if(shot==='S05'){
    for(const id of ['lamp','mai.right-hand','an.right-hand'])assert.deepEqual(b.sprites.find(s=>s.id===id),a.sprites.find(s=>s.id===id),'Reaction edit cannot break contact');
    const head=b.sprites.find(s=>s.id==='an.head')!;
    if(f>=156&&f<168)assert.ok(head.asset.endsWith('-neutral'));
    if(f>=168)assert.ok(head.asset.endsWith('-happy'));
   }
  }
  assert.equal(changed>0,['S04','S05'].includes(shot),`R2 scope ${shot}`);
 }
});
test('editorial reorder contains each independent fixture exactly once and preserves 1152 frames',async()=>{
 const order=JSON.parse(await readFile(new URL('../brief/edit-R2-order.json',import.meta.url),'utf8')) as ShotId[];
 assert.deepEqual([...order].sort(),Object.keys(shotFrames).sort());assert.equal(order.reduce((n,id)=>n+shotFrames[id],0),1152);
});
