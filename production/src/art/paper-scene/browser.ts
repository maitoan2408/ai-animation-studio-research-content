/** Bounded S05 still comparison. 22 parts are extruded; background remains flat. */
import * as THREE from 'three';
import {makeContourBody} from './contour-body.js';
import {shearDepth} from './depth.js';
import {requireForegroundContour} from './coverage.js';
import type {ArtPack,SceneFrame} from '../../scene/types.js';
type Info={pack:ArtPack;frame:SceneFrame;contours:{id:string;loops:unknown;dimensions:[number,number];pivot:[number,number];gridScale?:number}[];mode:'flat'|'volume';shadowMode:'combined'|'receiver-only'|'authored-only';coverage:'foreground'|'physical';look:'basic'|'standard'|'lambert'|'fold'|'depth'|'depth-lit'|'depth-soft';profile:'preview'|'1080';textureUrls:Record<string,string>};
declare global { interface Window { sceneInput:Info; sceneReady?:boolean;sceneError?:string;sceneStats?:unknown; } }
async function main(){
 const {pack,frame,contours,mode,shadowMode,coverage,look,profile,textureUrls}=window.sceneInput;
 const depthMode=mode==='volume'&&(look==='depth'||look==='depth-lit'||look==='depth-soft');
 const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
 renderer.setPixelRatio(1);renderer.setSize(profile==='preview'?640:1920,profile==='preview'?360:1080);renderer.setClearColor('#e8ddbe',1);
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.VSMShadowMap;
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
 document.body.appendChild(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-960,960,540,-540,.1,4000);
 camera.position.set(frame.camera.x-960,540-frame.camera.y,1000);camera.zoom=frame.camera.zoom;camera.updateProjectionMatrix();
 scene.add(new THREE.AmbientLight(0xffffff,1.1));const light=new THREE.DirectionalLight(0xffffff,1.2);light.position.set(-400,500,1000);
 light.castShadow=true;light.shadow.mapSize.set(2048,2048);light.shadow.radius=3;light.shadow.blurSamples=8;
 Object.assign(light.shadow.camera,{left:-1500,right:1500,top:1100,bottom:-1100,near:1,far:3000});
 light.shadow.bias=-0.0002;scene.add(light);
 const loader=new THREE.TextureLoader(),textures=new Map<string,THREE.Texture>();
 const ids=[...new Set(frame.sprites.map(s=>s.asset))];
 await Promise.all(ids.map(async id=>{const url=textureUrls[id];if(!url)throw Error(`SCENE_TEXTURE_MISSING ${id}`);
   let t:THREE.Texture;try {t=await loader.loadAsync(url);}catch {throw Error(`SCENE_TEXTURE_LOAD ${id} ${url}`);}t.colorSpace=THREE.SRGBColorSpace;t.minFilter=THREE.LinearFilter;t.magFilter=THREE.LinearFilter;t.generateMipmaps=false;textures.set(id,t);}));
 let plates=0,extruded=0,hiddenPaperShadows=0,requiredContours=0;
 const ordered=[...frame.sprites].sort((a,b)=>a.z-b.z);
 const firstForeground=ordered.findIndex(s=>s.z>=0);if(firstForeground<0)throw Error('SCENE_FOREGROUND');
 const receiver=new THREE.Mesh(new THREE.PlaneGeometry(3200,2000),new THREE.ShadowMaterial({opacity:.23,depthTest:false,depthWrite:false}));
 receiver.position.z=-5;receiver.receiveShadow=true;receiver.renderOrder=firstForeground*2;scene.add(receiver);
 for(const [order,s] of ordered.entries()){
  if(mode==='volume'&&shadowMode==='receiver-only'&&s.id.endsWith('.paper-shadow')){hiddenPaperShadows++;continue;}
  const asset=pack.assets.find(a=>a.id===s.asset);if(!asset)throw Error(`SCENE_ASSET ${s.asset}`);
  const folded=mode==='volume'&&look==='fold'&&s.asset==='mai/torso';
  const face=new THREE.PlaneGeometry(asset.width,asset.height,folded?32:1,1);
  if(folded){
   const normals=face.getAttribute('normal'),pos=face.getAttribute('position');
   for(let i=0;i<pos.count;i++){
    const x=pos.getX(i)/(asset.width/2),nx=.32*x,nz=Math.sqrt(1-nx*nx);
    normals.setXYZ(i,nx,0,nz);
   }
   normals.needsUpdate=true;
  }
  face.translate(asset.width/2-asset.pivot[0],asset.pivot[1]-asset.height/2,0);
  const group=new THREE.Group();group.position.set(s.x-960,540-s.y,depthMode?order*6-500:s.z);group.rotation.z=-s.rotation*Math.PI/180;group.scale.set(s.scaleX,s.scaleY,1);
  const contour=contours.find(c=>c.id===s.asset);
  if(['mai/','an/','mouth/','props/'].some(prefix=>s.asset.startsWith(prefix))||(coverage==='physical'&&s.asset.startsWith('background/')))requiredContours++;
  if(mode==='volume')requireForegroundContour(s.asset,!!contour,coverage==='physical');
  if(mode==='volume'&&contour){
   if(contour.dimensions[0]!==asset.width||contour.dimensions[1]!==asset.height||
     contour.pivot[0]!==asset.pivot[0]||contour.pivot[1]!==asset.pivot[1])throw Error(`SCENE_CONTOUR_METADATA ${s.asset}`);
   const body=makeContourBody(contour.loops,contour,3);
   shearDepth(body,.25);
   const background=s.asset.startsWith('background/');
   const mesh=new THREE.Mesh(body,new THREE.MeshStandardMaterial({color:background?'#ffffff':'#ad8d60',map:background?textures.get(s.asset):undefined,roughness:1,side:THREE.DoubleSide,transparent:!depthMode,depthTest:depthMode,depthWrite:depthMode}));
   mesh.renderOrder=order*2;mesh.castShadow=shadowMode!=='authored-only';group.add(mesh);extruded++;
  }
  const options={map:textures.get(s.asset)!,transparent:!depthMode||look==='depth-soft',depthTest:depthMode,depthWrite:depthMode&&look!=='depth-soft',alphaTest:depthMode&&look!=='depth-soft'?.5:0,side:THREE.DoubleSide,opacity:s.opacity};
  const material=mode==='volume'&&s.asset==='mai/torso'&&look!=='basic'&&look!=='depth'&&look!=='depth-lit'&&look!=='depth-soft'
   ?(look==='lambert'?new THREE.MeshLambertMaterial(options):new THREE.MeshStandardMaterial({...options,roughness:1,...(look==='fold'?{emissive:0xffffff,emissiveMap:options.map,emissiveIntensity:.25}:{})}))
   :new THREE.MeshBasicMaterial(options);
  const plate=new THREE.Mesh(face,look==='depth-lit'&&mode==='volume'?new THREE.MeshStandardMaterial({...options,roughness:1}):material);if(depthMode)plate.position.z=.05;
  if(look==='depth-lit'&&mode==='volume'){plate.receiveShadow=true;plate.castShadow=!!contour&&!s.asset.startsWith('background/');}
  plate.renderOrder=order*2+1;group.add(plate);scene.add(group);plates++;
 }
 await renderer.compileAsync(scene,camera);renderer.render(scene,camera);renderer.getContext().finish();
 window.sceneStats={mode,shadowMode,coverage,plates,extruded,requiredContours,hiddenPaperShadows,three:THREE.REVISION};window.sceneReady=true;
}
main().catch(e=>{window.sceneError=String(e);});
