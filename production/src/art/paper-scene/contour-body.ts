/** Convert a verified pixel-grid contour into native-pivot geometry. */
import * as THREE from 'three';
import {contourShapes} from '../paper-silhouette/shapes.js';
type Metadata={gridScale?:number;dimensions:[number,number];pivot:[number,number]};
export function makeContourBody(loops:unknown,meta:Metadata,depth:number):THREE.ExtrudeGeometry {
 const scale=meta?.gridScale??1;
 if(![1,2,4].includes(scale)||!Array.isArray(meta?.dimensions)||meta.dimensions.length!==2||
   !Array.isArray(meta?.pivot)||meta.pivot.length!==2||
   ![...meta.dimensions,...meta.pivot,depth].every(n=>Number.isFinite(n)&&Math.abs(n)<=1e6)||
   meta.dimensions.some(n=>n<=0)||depth<=0)throw Error('PAPER_CONTOUR_METADATA');
 const shape=contourShapes(loops);
 for(const item of shape){
   const extracted=item.extractPoints(1);
   for(const point of [...extracted.shape,...extracted.holes.flat()])
     if(point.x<0||point.y<0||point.x>meta.dimensions[0]*scale||point.y>meta.dimensions[1]*scale)
       throw Error('PAPER_CONTOUR_BOUNDS');
 }
 const uv=(vertices:number[],index:number)=>new THREE.Vector2(
   vertices[index*3]!/(meta.dimensions[0]*scale),1-vertices[index*3+1]!/(meta.dimensions[1]*scale));
 const UVGenerator={
   generateTopUV:(_g:THREE.ExtrudeGeometry,v:number[],a:number,b:number,c:number)=>[uv(v,a),uv(v,b),uv(v,c)],
   generateSideWallUV:(_g:THREE.ExtrudeGeometry,v:number[],a:number,b:number,c:number,d:number)=>[uv(v,a),uv(v,b),uv(v,c),uv(v,d)],
 };
 const body=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:1,UVGenerator});
 body.scale(1/scale,-1/scale,1);body.translate(-meta.pivot[0],meta.pivot[1],-depth);
 return body;
}
