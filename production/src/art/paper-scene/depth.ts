/** Oblique 2.5D depth projection: face z=0 stays fixed, only back is offset. */
import * as THREE from 'three';
export function shearDepth(geometry:THREE.BufferGeometry, factor:number):void {
 if(!geometry || !Number.isFinite(factor) || Math.abs(factor)>1)throw Error('PAPER_DEPTH_SHEAR');
 const position=geometry.getAttribute('position');
 if(!position || position.itemSize!==3)throw Error('PAPER_DEPTH_GEOMETRY');
 for(let i=0;i<position.count;i++) position.setX(i,position.getX(i)+factor*position.getZ(i));
 position.needsUpdate=true; geometry.computeVertexNormals(); geometry.computeBoundingBox();
}
