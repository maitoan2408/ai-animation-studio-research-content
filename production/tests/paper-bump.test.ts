import {test} from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {makePaperBump} from '../src/art/paper-scene/paper-bump.js';
test('paper bump bytes are deterministic, repeatable and nonconstant',()=>{
 const a=makePaperBump(),b=makePaperBump();assert.deepEqual(a.image.data,b.image.data);assert.equal(a.wrapS,THREE.RepeatWrapping);assert.equal(a.wrapT,THREE.RepeatWrapping);
 const bytes=a.image.data as Uint8Array,values=new Set<number>();for(let i=0;i<bytes.length;i+=4)values.add(bytes[i]!);assert.ok(values.size>20);
 a.dispose();b.dispose();
});
