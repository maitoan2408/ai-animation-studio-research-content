import * as THREE from 'three';
/** Local periodic height field; no external asset and no frame-time input. */
export function makePaperBump():THREE.DataTexture {
 const n=64,bytes=new Uint8Array(n*n*4);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const value=Math.round(128+18*Math.sin(2*Math.PI*(4*x+y)/n)+10*Math.sin(2*Math.PI*(x+3*y)/n)),k=(y*n+x)*4;
  bytes[k]=bytes[k+1]=bytes[k+2]=value;bytes[k+3]=255;
 }
 const texture=new THREE.DataTexture(bytes,n,n);texture.colorSpace=THREE.NoColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
 texture.repeat.set(4,4);texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearFilter;texture.needsUpdate=true;return texture;
}
