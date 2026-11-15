import test from 'node:test';
import assert from 'node:assert/strict';
import { toProductionFrame, type StageShotTimeline } from '../src/scene/animation-ir-adapter.js';
const value:StageShotTimeline={
  schemaVersion:'animation-ir/1',
  stage:{width:1920,height:1080,yAxis:'down',units:'stage-px'},
  timeline:{fps:24,totalFrames:192},
  shots:[
    {id:'s001',interval:{startFrame:0,endFrame:96},camera:{kind:'static'}},
    {id:'s002',interval:{startFrame:96,endFrame:192},camera:{kind:'pan'}},
  ],
};
test('IR camera bridge preserves half-open boundaries and 3x stage pan',()=>{
  assert.equal(toProductionFrame(value,95).shotId,'s001');
  assert.equal(toProductionFrame(value,96).localFrame,0);
  assert.equal(toProductionFrame(value,96).frame.camera.x,0);
  assert.equal(toProductionFrame(value,191).frame.camera.x,105);
  assert.deepEqual(toProductionFrame(value,191).frame.sprites,[]);
  assert.deepEqual(toProductionFrame(value,191).frame.markers,[]);
  assert.throws(()=>toProductionFrame(value,192),/IR_FRAME_OUT_OF_RANGE/);
});
test('IR camera bridge rejects incoherent stage and intervals',()=>{
  assert.throws(()=>toProductionFrame({...value,timeline:{fps:24,totalFrames:193}},0),/IR_TOTAL_FRAMES_MISMATCH/);
  const invalid:StageShotTimeline=JSON.parse(JSON.stringify(value));
  invalid.shots[1]!.interval.startFrame=97;
  assert.throws(()=>toProductionFrame(invalid,5),/IR_INVALID_SHOT_INTERVAL/);
});
