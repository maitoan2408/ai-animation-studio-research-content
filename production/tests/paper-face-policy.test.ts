import {test} from 'node:test';import assert from 'node:assert/strict';import {facePolicy} from '../src/art/paper-scene/face-policy.js';
test('depth mode preserves translucent contact without alpha cutoff',()=>{
 assert.deepEqual(facePolicy(true,false,.25),{transparent:true,depthTest:true,depthWrite:false,alphaTest:0});
 assert.deepEqual(facePolicy(true,false,1),{transparent:false,depthTest:true,depthWrite:true,alphaTest:.5});
 assert.deepEqual(facePolicy(true,true,1),{transparent:true,depthTest:true,depthWrite:false,alphaTest:0});
 assert.deepEqual(facePolicy(false,false,.25),{transparent:true,depthTest:false,depthWrite:false,alphaTest:0});
});
test('invalid opacity rejects instead of hiding a sprite',()=>{for(const x of [NaN,-.1,1.1])assert.throws(()=>facePolicy(true,false,x),/PAPER_FACE_OPACITY/);});
