/** Convert traced binary masks to Three shapes. Holes must belong to an outer. */
import * as THREE from 'three';
type Loop={points:[number,number][];signedArea:number};
function inside(loop:Loop,x:number,y:number):boolean {
 let result=false;
 for(let i=0;i<loop.points.length;i++){
  const [x1,y1]=loop.points[i]!,[x2,y2]=loop.points[(i+1)%loop.points.length]!;
  if((y1>y)!==(y2>y) && x<(x2-x1)*(y-y1)/(y2-y1)+x1)result=!result;
 }
 return result;
}
export function contourShapes(raw:unknown):THREE.Shape[] {
 if(!Array.isArray(raw)||!raw.length)throw Error('PAPER_CONTOUR_EMPTY');
 const loops:Loop[]=raw.map((value:unknown)=>{
  if(!value||typeof value!=='object')throw Error('PAPER_CONTOUR_LOOP');
  const x=value as Loop;
  if(!Array.isArray(x.points)||x.points.length<4||!Number.isFinite(x.signedArea)||x.signedArea===0||
   x.points.some(p=>!Array.isArray(p)||p.length!==2||p.some(v=>!Number.isSafeInteger(v)||v<0||v>100000)))throw Error('PAPER_CONTOUR_LOOP');
  let twice=0;
  for(let i=0;i<x.points.length;i++){
   const a=x.points[i]!,b=x.points[(i+1)%x.points.length]!;
   if((a[0]===b[0])===(a[1]===b[1]))throw Error('PAPER_CONTOUR_EDGE');
   twice+=a[0]*b[1]-b[0]*a[1];
  }
  if(twice!==x.signedArea*2)throw Error('PAPER_CONTOUR_AREA');
  return x;
 });
 const outers=loops.filter(x=>x.signedArea>0).map(loop=>{
  const shape=new THREE.Shape();loop.points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
  return {loop,shape};
 });
 if(!outers.length)throw Error('PAPER_CONTOUR_OUTER');
 for(const hole of loops.filter(x=>x.signedArea<0)){
  const [x,y]=hole.points[0]!;
  const parents=outers.filter(o=>inside(o.loop,x,y)).sort((a,b)=>a.loop.signedArea-b.loop.signedArea);
  if(!parents.length)throw Error('PAPER_CONTOUR_ORPHAN_HOLE');
  const path=new THREE.Path();hole.points.forEach(([px,py],i)=>i?path.lineTo(px,py):path.moveTo(px,py));path.closePath();
  parents[0]!.shape.holes.push(path);
 }
 return outers.map(x=>x.shape);
}
