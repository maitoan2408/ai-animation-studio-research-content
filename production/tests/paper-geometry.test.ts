import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {makePaperGeometry} from '../src/art/paper-spike/geometry.js';
test('paper plate and extruded shape share the authored native pivot',()=>{
 const shape=new THREE.Shape();shape.moveTo(0,0);shape.lineTo(180,0);shape.lineTo(180,190);shape.lineTo(0,190);shape.closePath();
 const {face,body}=makePaperGeometry(shape,{width:180,height:190,pivot:[90,170]},3);
 face.computeBoundingBox();body.computeBoundingBox();
 for(const bounds of [face.boundingBox!,body.boundingBox!]){
  assert.equal(bounds.min.x,-90);assert.equal(bounds.max.x,90);
  assert.equal(bounds.min.y,-20);assert.equal(bounds.max.y,170);
 }
 assert.equal(body.boundingBox!.min.z,0);assert.equal(body.boundingBox!.max.z,3);
 face.dispose();body.dispose();
});
test('paper geometry rejects missing pivot, nonfinite dimensions and depth',()=>{
 const shape=new THREE.Shape();
 assert.throws(()=>makePaperGeometry(shape,{width:0,height:10,pivot:[0,0]},3),/PAPER_GEOMETRY/);
 assert.throws(()=>makePaperGeometry(shape,{width:10,height:10,pivot:[NaN,0]},3),/PAPER_GEOMETRY/);
 assert.throws(()=>makePaperGeometry(shape,{width:10,height:10,pivot:[0,0]},0),/PAPER_GEOMETRY/);
});
test('Three geometry convention matches scene anchor transforms under rotation and mirrored scale', async()=>{
 const {assetPoint}=await import('../src/scene/geometry.js');
 const {readFile}=await import('node:fs/promises');
 const pack=JSON.parse(await readFile(new URL('../assets/lantern-polish-1/manifest.json',import.meta.url),'utf8'));
 const asset=pack.assets.find((x:{id:string})=>x.id==='mai/torso');
 const sprite={id:'mai.torso',asset:asset.id,x:770,y:602,z:3,rotation:17,scaleX:-.8,scaleY:.9,opacity:1};
 const group=new THREE.Object3D();group.position.set(sprite.x,-sprite.y,0);
 group.rotation.z=-sprite.rotation*Math.PI/180;group.scale.set(sprite.scaleX,sprite.scaleY,1);group.updateMatrixWorld(true);
 for(const native of [asset.pivot,asset.anchors.neck,asset.anchors.leftShoulder]){
  const expected=assetPoint(pack,sprite,native);
  const actual=group.localToWorld(new THREE.Vector3(native[0]-asset.pivot[0],asset.pivot[1]-native[1],0));
  assert.ok(Math.abs(actual.x-expected[0])<1e-9);
  assert.ok(Math.abs(-actual.y-expected[1])<1e-9);
 }
});
