import test from 'node:test';
import assert from 'node:assert/strict';
import {auditFrame,auditSequence,type FrameContract} from '../src/qa/general-scene-quality.js';
import {sprite,type ArtPack,type SceneFrame} from '../src/scene/types.js';
const pack:ArtPack={version:'generic-fixture',assets:[
 {id:'person/palm',file:'p.svg',width:20,height:20,pivot:[0,0],anchors:{grip:[5,0]},category:'hand',sha256:'a'.repeat(64),colorSpace:'srgb',alpha:'straight',source:'test'},
 {id:'object/book',file:'b.svg',width:20,height:20,pivot:[0,0],anchors:{handle:[0,0]},category:'prop',sha256:'b'.repeat(64),colorSpace:'srgb',alpha:'straight',source:'test'},
 {id:'person/fingers',file:'f.svg',width:20,height:20,pivot:[0,0],anchors:{grip:[5,0]},category:'hand',sha256:'c'.repeat(64),colorSpace:'srgb',alpha:'straight',source:'test'},
]};
const frame=(x=0):SceneFrame=>({camera:{x:0,y:0,zoom:1},markers:[],sprites:[
 sprite('left-palm','person/palm',x,0,1),
 sprite('book','object/book',x+5,0,2),
 sprite('left-fingers','person/fingers',x,0,3),
]});
const contact={id:'book-left-grip',holderId:'left-palm',propId:'book',
 holderAnchor:'grip',propAnchor:'handle',rearId:'left-palm',frontId:'left-fingers'};
test('general QA passes left hand/book with no M3 cup or right-hand assumptions',()=>{
 const out=auditSequence([frame(),frame(2)],pack,[{frame:0,contacts:[contact]},{frame:1,contacts:[contact]}],
  {maxSpriteJumpPx:4,maxRotationDeltaDegrees:30,maxCameraDeltaPx:4,maxCameraZoomRatio:1.1});
 assert.equal(out.status,'PASS');assert.equal(out.frames,2);
});
test('general QA catches wrong layer despite matching anchor markers',()=>{
 const s=frame();s.sprites[2]!.z=0;
 assert.ok(auditFrame(s,pack,{frame:0,contacts:[contact]}).some(x=>x.code==='QA_OCCLUSION_ORDER'));
});
test('general QA catches missing art, nonfinite, duplicate ID, bad camera and anchor',()=>{
 const s=frame();s.sprites.push({...s.sprites[0]!,asset:'unknown'});
 s.sprites[0]!.x=NaN;s.camera.zoom=0;
 const codes=auditFrame(s,pack,{frame:0,contacts:[contact]}).map(x=>x.code);
 for(const c of ['QA_DUPLICATE_SPRITE','QA_UNKNOWN_ART','QA_NONFINITE_SPRITE','QA_CAMERA_INVALID'])
   assert.ok(codes.includes(c),c);
 const broken={...contact,propAnchor:'not-a-handle'};
 assert.ok(auditFrame(frame(),pack,{frame:0,contacts:[broken]}).some(x=>x.code==='QA_CONTACT_ANCHOR_MISSING'));
});
test('general QA catches prop detach and missing finger overlay',()=>{
 const s=frame();s.sprites[1]!.x+=10;s.sprites.pop();
 const codes=auditFrame(s,pack,{frame:0,contacts:[contact]}).map(x=>x.code);
 assert.ok(codes.includes('QA_CONTACT_MISALIGNED'));
 assert.ok(codes.includes('QA_OCCLUSION_PART_MISSING'));
});
test('general QA catches teleport, camera jump, rotation snap and zoom snap',()=>{
 const a=frame(),b=frame(100);b.camera.x=100;b.camera.zoom=3;b.sprites[0]!.rotation=150;
 const codes=auditFrame(b,pack,{frame:1},a,{
  maxSpriteJumpPx:10,maxRotationDeltaDegrees:50,maxCameraDeltaPx:10,maxCameraZoomRatio:1.2,
 }).map(x=>x.code);
 for(const c of ['QA_SPRITE_TELEPORT','QA_CAMERA_JUMP','QA_ROTATION_SNAP','QA_CAMERA_ZOOM_SNAP'])
  assert.ok(codes.includes(c),c);
});
test('general QA is deterministic across repeated evaluations',()=>{
 const frames=[frame(),frame(1),frame(2)];
 const a=auditSequence(frames,pack,[],{maxSpriteJumpPx:2});
 assert.deepEqual(a,auditSequence(frames,pack,[],{maxSpriteJumpPx:2}));
});

test('G1 detects actual displaced fingers and sole, missing sprite, wrong asset and stage overflow even with unchanged markers',()=>{
 const localPack=structuredClone(pack);
 localPack.assets.push({...localPack.assets[0]!,id:'person/boot',anchors:{sole:[5,0]}});
 const scene=frame();
 scene.sprites.push(sprite('boot','person/boot',0,5,0));
 scene.markers.push({id:'sole',point:[5,5],kind:'ground',z:0});
 const contract:FrameContract={frame:0,contacts:[{...contact,frontAnchor:'grip'}],
  requiredSprites:[{id:'boot',asset:'person/boot',sha256:localPack.assets.at(-1)!.sha256}],
  grounds:[{id:'sole',spriteId:'boot',anchor:'sole',point:[5,5],tolerancePx:.001}],
  bounds:[{id:'actor',spriteIds:['left-palm','left-fingers','boot'],minX:0,minY:0,maxX:80,maxY:80}]};
 assert.deepEqual(auditFrame(scene,localPack,contract),[]);
 const displaced=structuredClone(scene);displaced.sprites[2]!.x+=100;
 let issues=auditFrame(displaced,localPack,contract).map(x=>x.code);
 assert.ok(issues.includes('QA_FRONT_CONTACT_MISALIGNED'));
 assert.ok(issues.includes('QA_SPRITE_OUT_OF_BOUNDS'));
 const sole=structuredClone(scene);sole.sprites[3]!.y+=10;
 assert.ok(auditFrame(sole,localPack,contract).some(x=>x.code==='QA_GROUND_CONTACT'));
 const absent=structuredClone(scene);absent.sprites.pop();
 assert.ok(auditFrame(absent,localPack,contract).some(x=>x.code==='QA_REQUIRED_SPRITE_MISSING'));
 const forged=structuredClone(localPack);forged.assets.at(-1)!.sha256='d'.repeat(64);
 assert.ok(auditFrame(scene,forged,contract).some(x=>x.code==='QA_ASSET_BINDING_MISMATCH'));
 const duplicate=structuredClone(localPack);duplicate.assets.push(duplicate.assets[0]!);
 assert.ok(auditFrame(scene,duplicate,contract).some(x=>x.code==='QA_DUPLICATE_ART'));
});
