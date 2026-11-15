import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {roughenBack} from '../src/art/paper-scene/paper-edge.js';
const build=()=>{const g=new THREE.BoxGeometry(100,100,3);g.translate(0,0,-1.5);return g;};
test('edge variation preserves front coordinates and is deterministic',()=>{
 const a=build(),b=build(),original=Array.from(a.getAttribute('position').array);
 roughenBack(a,'mai/torso',1);roughenBack(b,'mai/torso',1);
 const p=a.getAttribute('position'),q=b.getAttribute('position');assert.deepEqual(Array.from(p.array),Array.from(q.array));
 let changed=0;for(let i=0;i<p.count;i++){
  const dx=Math.abs(p.getX(i)-original[i*3]!),dy=Math.abs(p.getY(i)-original[i*3+1]!);
  assert.ok(dx<=1.00001&&dy<=1.00001);
  if(original[i*3+2]===0){assert.equal(dx,0);assert.equal(dy,0);}else if(dx||dy)changed++;
 }assert.ok(changed>0);
});
test('edge inputs fail closed',()=>{assert.throws(()=>roughenBack(build(),'',1),/PAPER_EDGE_INPUT/);assert.throws(()=>roughenBack(build(),'x',2),/PAPER_EDGE_INPUT/);});
