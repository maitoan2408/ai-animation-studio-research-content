import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {actorSprites} from '../src/scene/rig.js';
import {deriveG3JointCaps,auditG3JointCaps} from '../src/scene/g3-joint-caps.js';
import type {ArtPack,SceneFrame} from '../src/scene/types.js';
const pack=JSON.parse(readFileSync(new URL('../assets/lantern-v1/manifest.json',import.meta.url),'utf8')) as ArtPack;
for(const model of ['an','mai'])for(const hand of ['left','right'] as const){
 test('G3 generic cutout joint caps follow actual SVG elbow and knee on '+model+' '+hand,()=>{
  const a=actorSprites(pack,{id:'subject',character:model,x:800,floor:860,facing:1,
    ...(hand==='left'?{leftWrist:[-110,-220]}:{rightWrist:[110,-220]})});
  const frame:SceneFrame={sprites:a.sprites,markers:a.markers,camera:{x:960,y:540,zoom:1}};
  frame.jointCaps=deriveG3JointCaps(frame,pack,['subject']);
  assert.equal(frame.jointCaps.length,4);
  assert.deepEqual(auditG3JointCaps(frame,pack,['subject']),[]);
  const broken=structuredClone(frame);
  broken.jointCaps![0]!.x+=6;
  assert.ok(auditG3JointCaps(broken,pack,['subject']).some(x=>x.code==='G3_JOINT_CAP_MISALIGNED'));
  const absent=structuredClone(frame);absent.jointCaps!.pop();
  assert.ok(auditG3JointCaps(absent,pack,['subject']).some(x=>x.code==='G3_JOINT_CAP_MISSING'));
  const disconnected=structuredClone(frame);
  disconnected.sprites.find(s=>s.id==='subject.left-forearm')!.x+=8;
  assert.throws(()=>deriveG3JointCaps(disconnected,pack,['subject']),/G3_JOINT_SEAM_DISCONNECTED/);
 });
}

test('G3 paper-cut silhouette must not receive opaque disk joint overlays',()=>{
 const renderer=readFileSync(new URL('../src/render/browser.ts',import.meta.url),'utf8');
 assert.doesNotMatch(renderer,/CircleGeometry\\s*\\(/,
  'Opaque circular caps conceal the native garment and create dark elbow/knee disks');
 assert.doesNotMatch(renderer,/for\\s*\\(const cap of state\\.jointCaps/,
  'Joint metadata must not be drawn as an unvalidated opaque overlay');
});
