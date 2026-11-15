import * as THREE from 'three';
/** Deterministic back-surface edge irregularity; front/pivot stay fixed. */
export function roughenBack(geometry:THREE.BufferGeometry,assetId:string,amplitude:number):void {
 if(!assetId||!Number.isFinite(amplitude)||amplitude<0||amplitude>1.5)throw Error('PAPER_EDGE_INPUT');
 const pos=geometry.getAttribute('position');if(!pos||pos.itemSize!==3)throw Error('PAPER_EDGE_GEOMETRY');
 let seed=2166136261;for(const c of assetId)seed=Math.imul(seed^c.charCodeAt(0),16777619)>>>0;
 const phase=(seed%6283)/1000;
 for(let i=0;i<pos.count;i++){
  const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);if(z>=-1e-6)continue;
  const weight=Math.min(1,-z/3),offset=amplitude*weight;
  pos.setXY(i,x+offset*Math.sin(y*.052+phase),y+offset*Math.sin(x*.039+phase*1.37));
 }
 pos.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingBox();
}
