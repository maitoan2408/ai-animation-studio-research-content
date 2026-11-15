import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {sourceFrameFor,remapSourceInterval,retimedHeroFrame} from '../src/motion/retime-hero.js';
import {heroFrame} from '../src/motion/hero.js';
import {validateBake} from '../src/physics/bake.js';
import type {ArtPack} from '../src/scene/types.js';
import type {HeroInput} from '../src/physics/hero.js';
const read=async(p:string)=>JSON.parse(await readFile(new URL(p,import.meta.url),'utf8'));
const pack=await read('../assets/lantern-polish-1/manifest.json') as ArtPack;
const input=await read('../artifacts/quality/contracts-20261114/input.json') as HeroInput;
const bake=validateBake(await read('../artifacts/quality/contracts-20261114/bake.json'));
test('retiming selects verified hero frames and maps both handoff contacts to matching intervals',()=>{
 for(const duration of [144,192,240,288]){
  const mapped=Array.from({length:duration},(_,f)=>sourceFrameFor(duration,f));
  assert.equal(mapped[0],0);assert.equal(mapped.at(-1),191);
  assert.ok(mapped.every((f,i)=>i===0||f>=mapped[i-1]!));
  for(const [start,end] of [[0,108],[72,192]]){
   const interval=remapSourceInterval(duration,start!,end!);
   for(let f=0;f<duration;f++)assert.equal(f>=interval.start&&f<interval.end,mapped[f]!>=start!&&mapped[f]!<end!);
  }
  for(const f of [duration-1,0,Math.floor(duration/2),1])assert.deepEqual(retimedHeroFrame(pack,input,bake,duration,f),heroFrame(pack,input,bake,mapped[f]!));
 }
 for(let f=0;f<192;f++)assert.equal(sourceFrameFor(192,f),f);
 assert.notEqual(sourceFrameFor(144,72),sourceFrameFor(240,72));
});
test('retiming rejects out-of-range parameters and impossible contacts',()=>{
 for(const n of [143,289,NaN,192.5])assert.throws(()=>sourceFrameFor(n,0),/RETIME_DURATION_INVALID/);
 for(const f of [-1,192,.5,NaN])assert.throws(()=>sourceFrameFor(192,f),/RETIME_FRAME_INVALID/);
 assert.throws(()=>remapSourceInterval(144,3,4),/RETIME_INTERVAL_DROPPED/);
 for(const [a,b] of [[0,0],[-1,1],[0,193],[1.5,10]])assert.throws(()=>remapSourceInterval(192,a!,b!),/RETIME_INTERVAL_INVALID/);
});
