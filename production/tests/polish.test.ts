import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {benchmarkFrame,shotFrames,type ShotId} from '../src/scene/benchmark.js';
import type {ArtPack} from '../src/scene/types.js';
const base=JSON.parse(await readFile(new URL('../assets/lantern-v1/manifest.json',import.meta.url),'utf8')) as ArtPack;
const root=new URL('../assets/lantern-polish-1/',import.meta.url);
const pack=JSON.parse(await readFile(new URL('manifest.json',root),'utf8')) as ArtPack;
test('polish keeps the 64 original drawings/pivots intact; new files have exact hashes',async()=>{
 for(const old of base.assets)assert.deepEqual(pack.assets.find(a=>a.id===old.id),old);
 for(const a of pack.assets){const bytes=await readFile(new URL(a.file,root));assert.equal(createHash('sha256').update(bytes).digest('hex'),a.sha256);}
 assert.notEqual(pack.assets.find(a=>a.id==='props/cup-accent')!.sha256,pack.assets.find(a=>a.id==='props/cup')!.sha256);
});
test('shadow polish does not move original acting, camera or contact geometry in any frame',()=>{
 for(const [shot,count] of Object.entries(shotFrames))for(let f=0;f<count;f++){
  const a=benchmarkFrame(base,shot as ShotId,f),b=benchmarkFrame(pack,shot as ShotId,f,{polish:true});
  assert.deepEqual(b.markers,a.markers);assert.deepEqual(b.camera,a.camera);
  assert.deepEqual(b.sprites.filter(s=>!s.id.endsWith('-shadow')),a.sprites);
  for(const s of b.sprites){assert.ok(pack.assets.some(a=>a.id===s.asset));assert.ok(Number.isFinite(s.opacity)&&s.opacity>=0&&s.opacity<=1);}
 }
});
