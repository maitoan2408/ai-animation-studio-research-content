import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {contourShapes} from '../src/art/paper-silhouette/shapes.js';
const overlay=JSON.parse(await readFile(new URL('../artifacts/quality/v2-f2/overlay-foreground-contours.json',import.meta.url),'utf8'));
const all=JSON.parse(await readFile(new URL('../artifacts/quality/v2-f2/all-foreground-contours.json',import.meta.url),'utf8'));
const doc=JSON.parse(await readFile(new URL('../artifacts/quality/v2-f2/s05-binary-contours.json',import.meta.url),'utf8'));
function triangulatedArea(shape:THREE.Shape){
 const extracted=shape.extractPoints(1),points=[...extracted.shape,...extracted.holes.flat()];
 const triangles=THREE.ShapeUtils.triangulateShape(extracted.shape,extracted.holes);
 // triangulateShape removes a duplicate closing point in place.
 const actualPoints=[...extracted.shape,...extracted.holes.flat()];
 return triangles.reduce((sum,[a,b,c])=>{
  const p=actualPoints[a!]!,q=actualPoints[b!]!,r=actualPoints[c!]!;
  return sum+Math.abs((q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x))/2;
 },0);
}
test('all 22 S05 part masks triangulate to their exact binary pixel area',()=>{
 assert.equal(doc.assets.length,22);
 for(const asset of doc.assets){
  const shapes=contourShapes(asset.loops);
  assert.equal(shapes.reduce((sum:number,s:THREE.Shape)=>sum+triangulatedArea(s),0),asset.filledPixels,asset.id);
 }
});
test('malformed area, diagonal edges and orphan holes reject',()=>{
 assert.throws(()=>contourShapes([{signedArea:1,points:[[0,0],[1,0],[1,1],[0,2]]}]),/PAPER_CONTOUR_EDGE/);
 assert.throws(()=>contourShapes([{signedArea:2,points:[[0,0],[1,0],[1,1],[0,1]]}]),/PAPER_CONTOUR_AREA/);
 assert.throws(()=>contourShapes([{signedArea:-1,points:[[0,0],[0,1],[1,1],[1,0]]}]),/PAPER_CONTOUR_OUTER/);
});

test('all 58 development foreground masks triangulate to the exact binary pixel area',()=>{
 assert.equal(all.assets.length,58);
 for(const asset of all.assets){
  const shapes=contourShapes(asset.loops);
  assert.equal(shapes.reduce((sum:number,s:THREE.Shape)=>sum+triangulatedArea(s),0),asset.filledPixels,asset.id);
 }
});

test('all 79 overlay foreground masks triangulate to their binary pixel area',()=>{
 assert.equal(overlay.assets.length,79);
 for(const asset of overlay.assets){
  const shapes=contourShapes(asset.loops);
  assert.equal(shapes.reduce((sum:number,s:THREE.Shape)=>sum+triangulatedArea(s),0),asset.filledPixels,asset.id);
 }
});
