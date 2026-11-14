import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {actorSprites} from '../src/scene/rig.js';
import {polishFrame} from '../src/scene/polish.js';
import type {ArtPack,ActorPose} from '../src/scene/types.js';
const pack=JSON.parse(await readFile(new URL('../artifacts/quality/v2-f2/draft-sheets/overlay-v2-manifest.json',import.meta.url),'utf8')) as ArtPack;
test('draft heads have correctly bound paper shadows without moving rig sprites',()=>{
 assert.equal(pack.assets.length,156);
 for(const character of ['mai','an'] as const)for(const view of ['front','quarter','profile'] as const)
 for(const mood of ['sad','surprised','angry']){
  const pose={id:character,character,x:760,floor:860,facing:1,view,mood} as ActorPose;
  const actor=actorSprites(pack,pose),frame={sprites:actor.sprites,markers:actor.markers,camera:{x:960,y:540,zoom:1}};
  const polished=polishFrame(pack,frame),id=`${character}/head-${view}-${mood}`;
  const asset=pack.assets.find(a=>a.id===id)!;
  const shadow=pack.assets.find(a=>a.id===`shadow/${id}`) as (typeof asset & {dependsOn:string})|undefined;
  assert.ok(shadow);assert.equal(shadow.dependsOn,asset.sha256);
  assert.ok(polished.sprites.some(s=>s.asset===shadow.id));
  for(const sprite of actor.sprites)assert.deepEqual(polished.sprites.find(x=>x.id===sprite.id),sprite);
 }
});
