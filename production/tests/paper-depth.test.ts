import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {shearDepth} from '../src/art/paper-scene/depth.js';
test('oblique depth moves the back while preserving the actual face and pivots',()=>{
 const shape=new THREE.Shape();shape.moveTo(0,0);shape.lineTo(10,0);shape.lineTo(10,10);shape.lineTo(0,10);shape.closePath();
 const body=new THREE.ExtrudeGeometry(shape,{depth:3,bevelEnabled:false});body.translate(0,0,-3);
 const attr=body.getAttribute('position');const before=Array.from({length:attr.count},(_,i)=>[attr.getX(i),attr.getZ(i)]);
 shearDepth(body,.25);
 for(let i=0;i<attr.count;i++){
  const [x,z]=before[i]!;assert.ok(Math.abs(attr.getX(i)-(x!+.25*z!))<1e-6);
  if(z===0)assert.equal(attr.getX(i),x);
 }
 assert.throws(()=>shearDepth(body,NaN),/PAPER_DEPTH_SHEAR/);body.dispose();
});
