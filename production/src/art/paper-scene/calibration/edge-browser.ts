import * as THREE from 'three';import {applyInwardEdge} from '../edge-alpha.js';
declare global {interface Window{edgeUrl:string;edgeDone?:unknown;edgeFailure?:string}}
async function main(){
 const width=164,height=220,r=new THREE.WebGLRenderer({antialias:false,preserveDrawingBuffer:true,alpha:true});r.setSize(width,height);r.setClearColor(0,0);
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-82,82,110,-110,.1,10);camera.position.z=1;
 const map=await new THREE.TextureLoader().loadAsync(window.edgeUrl);map.colorSpace=THREE.SRGBColorSpace;map.minFilter=THREE.LinearFilter;map.magFilter=THREE.LinearFilter;map.generateMipmaps=false;
 const basic=new THREE.MeshBasicMaterial({map,transparent:true,depthTest:false,depthWrite:false}),edge=new THREE.MeshBasicMaterial({map,transparent:true,depthTest:false,depthWrite:false});applyInwardEdge(edge,width,height);
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),basic);scene.add(mesh);const target=new THREE.WebGLRenderTarget(width,height);
 function capture(m:THREE.MeshBasicMaterial){mesh.material=m;r.setRenderTarget(target);r.clear();r.render(scene,camera);const b=new Uint8Array(width*height*4);r.readRenderTargetPixels(target,0,0,width,height,b);return b;}
 const a=capture(basic),b=capture(edge);let increased=0,reduced=0,thresholdAdded=0,maxIncrease=0;
 for(let i=3;i<a.length;i+=4){const before=a[i]!,after=b[i]!;if(after>before){increased++;maxIncrease=Math.max(maxIncrease,after-before);}if(after<before)reduced++;if(before<128&&after>=128)thresholdAdded++;}
 window.edgeDone={width,height,increased,reduced,thresholdAdded,maxIncrease,scope:'isolated hashed lantern texture, native-grid offscreen render; no claim about full S05 joint/animation quality'};
}
main().catch(e=>window.edgeFailure=String(e));
