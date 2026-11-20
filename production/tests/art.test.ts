import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { anchorPoint } from '../src/scene/geometry.js';
import { actorSprites } from '../src/scene/rig.js';
import { distance, elbow } from '../src/scene/math.js';
import type { ArtPack } from '../src/scene/types.js';
const packRoot=new URL('../assets/lantern-v1/',import.meta.url);
const pack=JSON.parse(await readFile(new URL('manifest.json',packRoot),'utf8')) as ArtPack;

test('art source hashes, explicit pivots, views and local references remain intact',async()=>{
  // Preserve the original 64-painting art vocabulary verbatim. Two newly
  // authored, SHA-bound fingertip pieces are an additive M3 correction.
  assert.equal(new Set(pack.assets.map(a=>a.id)).size,66);
  assert.equal(pack.assets.filter(a=>!a.id.endsWith('/hand-grip-front')).length,64);
  for(const model of ['mai','an']){
    const fingers=pack.assets.find(a=>a.id===model+'/hand-grip-front');
    assert.ok(fingers,'missing independent visible gripping fingers '+model);
    assert.deepEqual(fingers.anchors.grip,[43,28]);
  }
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

test('bone lengths come from each character\'s own art, so a new proportion needs no code',()=>{
  // A data-only character "tall": An's art with a 20-unit longer forearm and shin.
  const tall=pack.assets.filter(a=>a.id.startsWith('an/')).map(a=>{
    const copy=structuredClone(a);copy.id=a.id.replace(/^an\//,'tall/');
    if(/\/(forearm|shin)$/.test(copy.id))copy.anchors.end=[copy.anchors.end![0],copy.anchors.end![1]+20];
    return copy;
  });
  const big:ArtPack={...pack,assets:[...pack.assets,...tall]};
  const rest={x:700,floor:850,facing:1 as const,rightWrist:[120,-250] as [number,number]};
  const a=actorSprites(big,{id:'a',character:'an',...rest});
  const t=actorSprites(big,{id:'t',character:'tall',...rest});
  const reach=(r:typeof a,id:string)=>{
    const upper=r.sprites.find(s=>s.id===id+'.right-upper')!,fore=r.sprites.find(s=>s.id===id+'.right-forearm')!;
    return distance([upper.x,upper.y],[fore.x,fore.y])+distance([fore.x,fore.y],r.markers.find(m=>m.id===id+'.right-wrist')!.point);
  };
  assert.ok(Math.abs(reach(t,'t')-reach(a,'a')-20)<1e-6);
  for(const r of [a,t])for(const side of ['left','right'])
    assert.ok(Math.abs(r.markers.find(m=>m.id.endsWith(side+'-sole'))!.point[1]-850)<1e-6);
});

test('lantern-v2: arms and hands at 85% of v1, legs unchanged, round joints, relaxed hand',async()=>{
  const root2=new URL('../assets/lantern-v2/',import.meta.url);
  const v2=JSON.parse(await readFile(new URL('manifest.json',root2),'utf8')) as ArtPack;
  assert.notEqual(v2.version,pack.version);
  for(const a of v2.assets){
    const bytes=await readFile(new URL(a.file,root2));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),a.sha256,a.id);
  }
  for(const model of ['mai','an'])for(const part of ['upper-arm','forearm','thigh','shin']){
    const id=model+'/'+part,old=pack.assets.find(a=>a.id===id)!,next=v2.assets.find(a=>a.id===id)!;
    const len=(a:typeof old)=>distance(a.pivot,a.anchors.end!);
    const expected=/arm/.test(part)?Math.round(len(old)*.85):len(old);
    assert.equal(len(next),expected,id+' bone length');
    // A round joint: the art extends beyond the pivot and the end by at least
    // 40% of its width, so rotating at either joint never exposes a cut edge.
    assert.ok(next.pivot[1]>=next.width*.4&&next.height-next.anchors.end![1]>=next.width*.35,id);
  }
  const v2grip=(model:string)=>v2.assets.find(a=>a.id===model+'/hand-grip')!;
  for(const model of ['mai','an']){
    const half=v2.assets.find(a=>a.id===model+'/hand-half')!,open=v2.assets.find(a=>a.id===model+'/hand-open')!;
    assert.deepEqual([half.pivot,half.anchors.grip],[open.pivot,open.anchors.grip]);
    const g1=pack.assets.find(a=>a.id===model+'/hand-grip')!,g2=v2grip(model);
    for(const k of [0,1] as const)assert.ok(Math.abs((g2.anchors.grip![k]-g2.pivot[k])-(g1.anchors.grip![k]-g1.pivot[k])*.85)<.01,'hand scaled 85%');
  }
});

test('oriented coverage follows rotation: a box beside a slanted limb is not counted as on it',async()=>{
  const {orientedCoverage}=await import('../src/scene/geometry.js');
  const thigh={id:'t',asset:'an/thigh',x:500,y:500,z:0,rotation:-20,scaleX:1,scaleY:1,opacity:1};
  const onTop={...thigh,id:'h',asset:'an/hand-open',rotation:0};
  assert.ok(orientedCoverage(pack,onTop,thigh)>.5);
  const beside={...onTop,x:500+80};
  assert.equal(orientedCoverage(pack,beside,thigh),0);
});
