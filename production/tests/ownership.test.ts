import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {performanceIR} from '../src/motion/hero.js';
import {validateOwnership,ownerAt} from '../src/continuity/ownership.js';
const raw=JSON.parse(await readFile(new URL('../brief/quality/s05-ownership.json',import.meta.url),'utf8'));
test('explicit owner covers the handoff and differs from shared contact',()=>{
 const ownership=validateOwnership(raw,performanceIR);
 assert.equal(ownerAt(ownership,71),'mai.rightHandGrip');
 assert.equal(ownerAt(ownership,72),'mai.rightHandGrip');
 assert.equal(ownerAt(ownership,107),'mai.rightHandGrip');
 assert.equal(ownerAt(ownership,108),'an.rightHandGrip');
 assert.equal(ownerAt(ownership,191),'an.rightHandGrip');
 assert.throws(()=>ownerAt(ownership,192),/OWNERSHIP_FRAME/);
});
test('ownership cannot claim a control without contact or have gaps',()=>{
 const changed=structuredClone(raw);changed.intervals[0].owner='an.rightHandGrip';
 assert.throws(()=>validateOwnership(changed,performanceIR),/OWNERSHIP_CONTACT_MISSING/);
 const gap=structuredClone(raw);gap.intervals[1].start=109;
 assert.throws(()=>validateOwnership(gap,performanceIR),/OWNERSHIP_INTERVAL/);
});
