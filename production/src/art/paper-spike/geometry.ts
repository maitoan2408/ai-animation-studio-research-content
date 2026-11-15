/** Three geometry in the scene rig's pivot convention; only known shapes allowed. */
import * as THREE from 'three';
export type PaperAsset = {width:number;height:number;pivot:[number,number]};
export function makePaperGeometry(shape:THREE.Shape,asset:PaperAsset,depth:number) {
 if (!shape || !asset || !Array.isArray(asset.pivot) || asset.pivot.length!==2 ||
    ![asset.width,asset.height,...asset.pivot,depth].every(v=>Number.isFinite(v) && Math.abs(v)<=1e6) ||
    asset.width<=0 || asset.height<=0 || depth<=0) throw Error('PAPER_GEOMETRY');
 const face=new THREE.PlaneGeometry(asset.width,asset.height);
 face.translate(asset.width/2-asset.pivot[0],asset.pivot[1]-asset.height/2,0);
 const body=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:16});
 body.scale(1,-1,1);body.translate(-asset.pivot[0],asset.pivot[1],0);
 return {face,body};
}
