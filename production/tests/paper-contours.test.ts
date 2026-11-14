import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {contourShapes} from '../src/art/paper-silhouette/shapes.js';
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
