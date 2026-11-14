import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateAlphaGate} from '../src/continuity/alpha-gate.js';
const sha='a'.repeat(64);
const good={status:'OBSERVATION_ONLY',frames:192,alphaThreshold:128,sourceSha256:sha,
  overlap:{'mai.torso':[],'an.torso':[]},maximumPixels:{'mai.torso':0,'an.torso':0}};
test('S05 projected-alpha gate accepts only a bound clear report',()=>{
 assert.doesNotThrow(()=>validateAlphaGate(good,sha));
 assert.throws(()=>validateAlphaGate({...good,sourceSha256:'b'.repeat(64)},sha),/ALPHA_GATE_REPORT/);
 assert.throws(()=>validateAlphaGate({...good,frames:191},sha),/ALPHA_GATE_REPORT/);
 assert.throws(()=>validateAlphaGate({...good,alphaThreshold:0},sha),/ALPHA_GATE_REPORT/);
 assert.throws(()=>validateAlphaGate({...good,overlap:{'mai.torso':[{frame:80,pixels:12}],'an.torso':[]}},sha),/ALPHA_GATE_OVERLAP/);
 assert.throws(()=>validateAlphaGate({...good,maximumPixels:{'mai.torso':1,'an.torso':0}},sha),/ALPHA_GATE_REPORT/);
});
