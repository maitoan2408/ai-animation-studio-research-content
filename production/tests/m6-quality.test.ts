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
      if(!s.id.startsWith(project.character.id+'.')){
        assert.deepEqual(s,old,'M6 A/B must use identical M3-owned prop and art depth');
      }
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
test('M6 visible hand and mug are composited in physically meaningful gripping order',()=>{
  let checked=0;
  for(let f=0;f<m3TotalFrames(project);f++){
    const s=after(f);
    if(!s.contact.grip)continue;
    const cup=s.frame.sprites.find(x=>x.id===project.prop?.id)!;
    const palm=s.frame.sprites.find(x=>x.id===project.character.id+'.right-hand')!;
    const arm=s.frame.sprites.find(x=>x.id===project.character.id+'.right-forearm')!;
    const front=s.frame.sprites.find(x=>x.id===project.character.id+'.right-grip-front')!;
    assert.ok(front,'separate curved-finger SVG missing at '+f);
    assert.ok(arm.z<palm.z&&palm.z<cup.z&&cup.z<front.z,
      'rear palm < mug handle < foreground fingers at '+f);
    assert.ok(s.contact.gripError!==null&&s.contact.gripError<.001);
    checked++;
  }
  assert.ok(checked>=40);
});
test('M6 semantic staging check rejects the actual visually wrong cross-body prop position',()=>{
  const wrong=structuredClone(project);
  wrong.character.xStart=900;wrong.prop!.x=928;
  assert.throws(()=>validateM3(wrong,pack),/M3_RIGHT_HAND_PROP_STAGING/);
  assert.throws(()=>evaluateM6(wrong,pack,'enhanced'),/M3_RIGHT_HAND_PROP_STAGING/);
  const fixed=structuredClone(wrong);fixed.prop!.x=1195;
  validateM3(fixed,pack);
  const corrected=evaluateM6(fixed,pack,'enhanced');
  assert.ok(!corrected.issues.some(x=>x.code==='M6_CROSS_BODY_PROP_STAGING'));
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
  edge.prop!.x=1195;
  assert.doesNotThrow(()=>validateM3(edge,pack),'valid right-hand edge scenario');
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

test('retimed M6 native action sources stay random-access and preserve all annotated contacts',()=>{
  for(const model of ['an','mai'] as const){
    const retimed=makeM3Showcase(pack,'guest-retime-'+model,model);
    retimed.clips[0]!.frames=97;
    retimed.clips[1]!.frames=73;
    retimed.clips[2]!.frames=73;
    validateM3(retimed,pack);
    const high={...m6DefaultQuality,leanDegrees:5,bouncePixels:6,
      armFollowPixels:24,headFollowDegrees:8,settleDegrees:4};
    const count=m3TotalFrames(retimed);
    for(let frame=0;frame<count;frame++){
      const expected=sampleM3(retimed,frame,pack);
      const actual=sampleM6(retimed,frame,pack,high);
      assert.deepEqual(actual.frame.camera,expected.frame.camera,'camera '+model+':'+frame);
      for(const side of expected.contact.planted){
        const id=retimed.character.id+'.'+side+'-sole';
        assert.deepEqual(actual.frame.markers.find(m=>m.id===id)?.point,
          expected.frame.markers.find(m=>m.id===id)?.point,'stance '+model+':'+frame);
      }
      if(expected.contact.grip){
        assert.equal(actual.contact.grip,true);
        assert.ok(actual.contact.gripError!==null&&actual.contact.gripError<.001,
          'held hand '+model+':'+frame);
      }
    }
    assert.deepEqual(sampleM6(retimed,count-1,pack,high),
      sampleM6(retimed,count-1,pack,high));
  }
});

test('near-reach M6 head motion stays temporally continuous despite arm gain backoff',()=>{
 const edge=structuredClone(project);
 edge.character.xStart=900;edge.prop!.x=1195;
 edge.clips=[{action:'walk-stop',frames:49},{action:'pick-place',frames:73}];
 edge.character.capabilities=['walk-stop','pick-place'];
 validateM3(edge,pack);
 const quality=evaluateM6(edge,pack,'enhanced');
 assert.deepEqual(quality.issues,[]);
 assert.ok(quality.metrics.maxHeadAngularAccelerationDegPerSecondSquared<250,
   'head snaps because the IK solver incorrectly suppresses independent acting');
});
