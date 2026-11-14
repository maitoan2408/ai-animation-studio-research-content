import * as THREE from 'three';
/** UV-anchored inward-only alpha edge. Source texture and geometry stay unchanged. */
export function applyInwardEdge(material:THREE.Material,width:number,height:number):void {
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw Error('PAPER_EDGE_ALPHA_INPUT');
 const ux=(.9/width).toFixed(9),uy=(.9/height).toFixed(9);
 material.onBeforeCompile=shader=>{
  const marker='#include <map_fragment>';if(!shader.fragmentShader.includes(marker))throw Error('PAPER_EDGE_ALPHA_SHADER');
  shader.fragmentShader=shader.fragmentShader.replace(marker,`
   vec4 baseTexel = texture2D(map,vMapUv);
   vec2 edgeShift = vec2(sin(vMapUv.y*67.0)*${ux},sin(vMapUv.x*57.0+0.6)*${uy});
   float shiftedAlpha = texture2D(map,vMapUv+edgeShift).a;
   diffuseColor *= vec4(baseTexel.rgb,min(baseTexel.a,shiftedAlpha));
  `);
 };
 material.customProgramCacheKey=()=>`f2-edge-alpha:${ux}:${uy}`;
}
