import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { contactLayout } from '../src/art/contact-layout.js';
import { anchorPoint } from '../src/scene/geometry.js';
import { actorSprites } from '../src/scene/rig.js';
import { distance, elbow } from '../src/scene/math.js';
import type { ArtPack } from '../src/scene/types.js';
const packRoot=new URL('../assets/lantern-v1/',import.meta.url);
const pack=JSON.parse(await readFile(new URL('manifest.json',packRoot),'utf8')) as ArtPack;

test('art source hashes, explicit pivots, views and local references remain intact',async()=>{
  assert.equal(new Set(pack.assets.map(a=>a.id)).size,64);
  for(const a of pack.assets){
    assert.ok(!a.file.includes('..')&&!a.file.startsWith('/'));
    const bytes=await readFile(new URL(a.file,packRoot));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),a.sha256,a.id);
    assert.ok(!/<script|https?:\/\/(?!www.w3.org)|onload=/i.test(bytes.toString()));
    for(const p of [a.pivot,...Object.values(a.anchors)])
      assert.ok(p[0]>=0&&p[0]<=a.width&&p[1]>=0&&p[1]<=a.height,`${a.id}: point out of bounds`);
  }
  for(const actor of ['mai','an'])for(const view of ['front','quarter','profile'])
    assert.ok(pack.assets.some(a=>a.id===`${actor}/head-${view}-neutral`));
  for(const actor of ['mai','an']){
    const front=pack.assets.find(a=>a.id===`${actor}/torso-front`)!,profile=pack.assets.find(a=>a.id===`${actor}/torso-profile`)!;
    assert.notEqual(front.sha256,profile.sha256);
    assert.ok(profile.width<front.width,'Profile has its own silhouette');
  }
});

test('contact styleframe: rendered hand anchor coincides with prop grip within 2 px',()=>{
  const frame=contactLayout(pack),hand=frame.sprites.find(s=>s.id==='mai.right-hand')!,cup=frame.sprites.find(s=>s.id==='cup')!;
  const gap=distance(anchorPoint(pack,hand,'grip'),anchorPoint(pack,cup,'grip'));
  assert.ok(gap<=2,`hand-prop gap ${gap.toFixed(4)} px exceeds 2 px`);
});

test('neutral and mirrored puppet soles remain on the ground; no limb stretching fallback',()=>{
  for(const facing of [1,-1] as const){
    const actor=actorSprites(pack,{id:'a',character:'mai',x:700,floor:850,facing});
    for(const side of ['left','right']){
      const foot=actor.sprites.find(s=>s.id===`a.${side}-boot`)!;
      assert.ok(Math.abs(anchorPoint(pack,foot,'sole')[1]-850)<1e-8);
      const hand=actor.sprites.find(s=>s.id===`a.${side}-hand`)!;
      assert.ok(anchorPoint(pack,hand,'tip')[1]>hand.y,'Resting fingers must point down');
    }
  }
  assert.throws(()=>elbow([0,0],[500,0],105,98,1),/IK_UNREACHABLE/);
});
