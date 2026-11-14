/** Two-layer synthetic fixture to test alpha shadow containment. */
import * as THREE from 'three';
const r=new THREE.WebGLRenderer({antialias:false,preserveDrawingBuffer:true});r.setSize(400,200);
r.outputColorSpace=THREE.SRGBColorSpace;r.toneMapping=THREE.NoToneMapping;r.shadowMap.enabled=true;r.shadowMap.type=THREE.PCFSoftShadowMap;
document.body.appendChild(r.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#e8ddbe');
const camera=new THREE.OrthographicCamera(-200,200,100,-100,.1,500);camera.position.z=100;
scene.add(new THREE.AmbientLight(0xffffff,2.2));const light=new THREE.DirectionalLight(0xffffff,1.1);light.position.set(-120,100,200);light.castShadow=true;
light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-220,right:220,top:120,bottom:-120,near:1,far:500});light.shadow.bias=-0.0002;scene.add(light);
const receiver=new THREE.Mesh(new THREE.PlaneGeometry(300,140),new THREE.MeshLambertMaterial({color:'#79a5a0'}));receiver.receiveShadow=true;scene.add(receiver);
const n=64,rgba=new Uint8Array(n*n*4);for(let y=0;y<n;y++)for(let x=0;x<n;x++){
 const k=(y*n+x)*4;rgba[k]=245;rgba[k+1]=213;rgba[k+2]=143;rgba[k+3]=((x-31.5)**2+(y-31.5)**2<26**2&&(x-31.5)**2+(y-31.5)**2>9**2)?255:0;
}
const texture=new THREE.DataTexture(rgba,n,n);texture.needsUpdate=true;texture.colorSpace=THREE.SRGBColorSpace;
const caster=new THREE.Mesh(new THREE.PlaneGeometry(64,64),new THREE.MeshBasicMaterial({map:texture,alphaTest:.5,side:THREE.DoubleSide}));
caster.position.set(-40,0,20);caster.castShadow=true;caster.material.colorWrite=false;scene.add(caster);
(window as any).renderShadow=(enabled:boolean)=>{caster.castShadow=enabled;light.shadow.needsUpdate=true;r.render(scene,camera);r.getContext().finish();};
(window as any).renderShadow(false);(window as any).fixtureReady=true;
