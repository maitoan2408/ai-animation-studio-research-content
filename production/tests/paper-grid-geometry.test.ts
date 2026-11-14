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
 assert.throws(()=>makeContourBody(asset.loops,{...asset,gridScale:1},3),/PAPER_CONTOUR_BOUNDS/);
});
test('contour UVs address the original asset under 1x and 4x grids',()=>{
 for(const scale of [1,4]){
  const base=doc.assets[0],meta={...base,gridScale:scale,dimensions:[180,190],pivot:[90,170]};
  const loops=[{signedArea:180*190*scale*scale,points:[[0,0],[180*scale,0],[180*scale,190*scale],[0,190*scale]]}];
  const body=makeContourBody(loops,meta,3),position=body.getAttribute('position'),uv=body.getAttribute('uv');
  assert.equal(uv.count,position.count);
  for(let i=0;i<position.count;i++){
   const expectedU=(position.getX(i)+90)/180,expectedV=1-(170-position.getY(i))/190;
   assert.ok(Math.abs(uv.getX(i)-expectedU)<1e-6,`u:${scale}:${i}`);
   assert.ok(Math.abs(uv.getY(i)-expectedV)<1e-6,`v:${scale}:${i}`);
  }
  body.dispose();
 }
});
