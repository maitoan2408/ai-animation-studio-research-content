import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {makeContourBody} from '../src/art/paper-scene/contour-body.js';
const doc=JSON.parse(await readFile(new URL('../artifacts/quality/v2-f2/overlay-foreground-contours-4x.json',import.meta.url),'utf8'));
test('4x grid converts to the same native asset scale and pivot',()=>{
 assert.equal(doc.assets.length,79);
 for(const asset of doc.assets){
  assert.equal(asset.gridScale,4);
  const geometry=makeContourBody(asset.loops,asset,3);geometry.computeBoundingBox();
  const box=geometry.boundingBox!;
  assert.ok(box.min.x>=-asset.pivot[0]-1e-6 && box.max.x<=asset.dimensions[0]-asset.pivot[0]+1e-6,asset.id);
  assert.ok(box.min.y>=asset.pivot[1]-asset.dimensions[1]-1e-6 && box.max.y<=asset.pivot[1]+1e-6,asset.id);
  assert.equal(box.min.z,-3);assert.equal(box.max.z,0);geometry.dispose();
 }
});
test('invalid contour scale or metadata fails closed',()=>{
 const asset=doc.assets[0];
 assert.throws(()=>makeContourBody(asset.loops,{...asset,gridScale:0},3),/PAPER_CONTOUR_METADATA/);
 assert.throws(()=>makeContourBody(asset.loops,{...asset,pivot:[NaN,1]},3),/PAPER_CONTOUR_METADATA/);
});
