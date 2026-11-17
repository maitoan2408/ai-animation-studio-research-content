import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sampleM3,makeM3Showcase,m3TotalFrames,validateM3} from '../src/motion/character-library.js';
import {sampleM6,parseM6Quality,m6DefaultQuality} from '../src/motion/m6-quality.js';
import {evaluateM6} from '../src/motion/m6-critic.js';
import type {ArtPack} from '../src/scene/types.js';

const pack=JSON.parse(readFileSync(new URL('../assets/lantern-v1/manifest.json',import.meta.url),'utf8')) as ArtPack;
const project=makeM3Showcase(pack,'guest-m6','an');
const before=(f:number)=>sampleM3(project,f,pack);
const after=(f:number)=>sampleM6(project,f,pack);
test('M6 bounded quality schema rejects malformed controls, injection, NaN and unsupported clip',()=>{
  assert.deepEqual(parseM6Quality(m6DefaultQuality),m6DefaultQuality);
  for(const bad of [
    null,{},[],{...m6DefaultQuality,script:'<script>alert(1)</script>'},
    {...m6DefaultQuality,leanDegrees:NaN},
    {...m6DefaultQuality,leanDegrees:6},
    {...m6DefaultQuality,bouncePixels:-1},
    {...m6DefaultQuality,schemaVersion:'quality-motion/2'},
    {...m6DefaultQuality,armFollowPixels:Infinity},
  ])assert.throws(()=>parseM6Quality(bad),/M6_QUALITY_/);
  assert.throws(()=>sampleM6(project,-1,pack),/M3_FRAME_OUT_OF_RANGE/);
  assert.throws(()=>sampleM6(project,268,pack),/M3_FRAME_OUT_OF_RANGE/);
  const bad=structuredClone(project);
  bad.clips[1]!.action='fly' as 'turn-head';
  assert.throws(()=>sampleM6(bad,0,pack),/M3_ACTION_UNSUPPORTED/);
});
test('M6 A/B has same project, camera, art, timebase, all foot targets and held contacts',()=>{
  let changed=0,contact=0;
  for(let f=0;f<m3TotalFrames(project);f++){
    const a=before(f),b=after(f);
    assert.deepEqual(b.frame.camera,a.frame.camera);
    assert.deepEqual(b.contact.planted,a.contact.planted);
    assert.equal(b.action,a.action);
    const aById=new Map(a.frame.sprites.map(s=>[s.id,s]));
    for(const s of b.frame.sprites){
      const old=aById.get(s.id);
      assert.ok(old,'missing sprite '+s.id);
      assert.equal(s.asset,old.asset);
      if(!s.id.startsWith(project.character.id+'.'))assert.deepEqual(s,old);
    }
    for(const side of ['left','right']){
      const id=project.character.id+'.'+side+'-sole';
      assert.deepEqual(b.frame.markers.find(x=>x.id===id)?.point,
        a.frame.markers.find(x=>x.id===id)?.point,'foot moved at '+f);
    }
    if(b.contact.grip){
      contact++;
      assert.ok(b.contact.gripError!==null&&b.contact.gripError<.00001);
      assert.equal(b.contact.grip,before(f).contact.grip);
    }
    if(Math.abs((b.pose.headAngle??0)-(a.pose.headAngle??0))>.01||
       Math.abs((b.pose.torsoAngle??0)-(a.pose.torsoAngle??0))>.01)
      changed++;
  }
  assert.ok(changed>60,'quality pass not producing visible pose differences');
  assert.ok(contact>=40);
});
test('M6 timeline boundaries match accepted M3 pose at every supported clip boundary',()=>{
  const boundaries=[0,72,73,121,122,170,171,267];
  for(const f of boundaries){
    const a=before(f),b=after(f);
    const original=new Map(a.frame.sprites.map(s=>[s.id,s]));
    for(const actual of b.frame.sprites){
      const expected=original.get(actual.id)!;
      assert.ok(Math.hypot(actual.x-expected.x,actual.y-expected.y)<1e-7,'boundary translation '+f);
      assert.ok(Math.abs(actual.rotation-expected.rotation)<1e-7,'boundary rotation '+f);
    }
  }
});
test('M6 random-access quality sampling independent of visit order',()=>{
  const frames=[267,0,174,48,121,7,266,73,36,205,122,0,267];
  const stored=frames.map(f=>JSON.stringify(after(f)));
  for(const [i,f]of frames.entries())assert.equal(JSON.stringify(after(f)),stored[i]);
});
test('M6 critic measures complete timeline; no arbitrary artistic rating',()=>{
  const a=evaluateM6(project,pack,'baseline');
  const b=evaluateM6(project,pack,'enhanced');
  assert.equal(a.projectFrames,268);
  assert.equal(b.projectFrames,268);
  assert.equal(a.metrics.heldGripSamples,b.metrics.heldGripSamples);
  assert.equal(a.metrics.plantedSamples,b.metrics.plantedSamples);
  assert.ok(b.metrics.maxPlantedDriftPixels<.001);
  assert.ok(b.metrics.maxGripErrorPixels<.001);
  assert.equal(b.metrics.cameraChanges,0);
  assert.deepEqual(b.issues,[]);
  assert.ok(b.metrics.maxHeadAngularSpeedDegPerSecond>0);
  assert.ok(!('artisticScore' in b));
  assert.throws(()=>evaluateM6(project,pack,'bad' as 'baseline'),/M6_CRITIC_MODE/);
});

test('M6 must not break an M3-valid pick/place near the two-link IK reach limit',()=>{
  const edge=structuredClone(project);
  edge.character.xStart=900;
  edge.prop!.x=928;
  assert.doesNotThrow(()=>validateM3(edge,pack),'validated source scenario');
  const frame=73+49+49+25;
  assert.doesNotThrow(()=>sampleM3(edge,frame,pack),'accepted M3 baseline reach');
  assert.doesNotThrow(()=>sampleM6(edge,frame,pack),'M6 acting must preserve valid IK reach');
});
test('every allowed M6 quality control remains safe across accepted walk-stop frames',()=>{
  const high={...m6DefaultQuality,leanDegrees:5,bouncePixels:6,
    armFollowPixels:24,headFollowDegrees:8,settleDegrees:4};
  const walk=structuredClone(project);
  walk.clips=[{action:'walk-stop' as const,frames:73}];
  delete walk.prop;
  walk.character.capabilities=['walk-stop'];
  assert.doesNotThrow(()=>validateM3(walk,pack));
  for(let f=0;f<73;f++){
    assert.doesNotThrow(()=>sampleM6(walk,f,pack,high),'high-quality bounded controls at frame '+f);
  }
});
