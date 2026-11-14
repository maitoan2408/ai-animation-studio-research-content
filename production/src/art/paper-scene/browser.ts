/** Bounded S05 still comparison. 22 parts are extruded; background remains flat. */
import * as THREE from 'three';
import {makeContourBody} from './contour-body.js';
import {contactPoints} from './contact.js';
import {makePaperBump} from './paper-bump.js';
import {applyInwardEdge} from './edge-alpha.js';
import {roughenBack} from './paper-edge.js';
import {shearDepth} from './depth.js';
import {requireForegroundContour} from './coverage.js';
import {anchorPoint} from '../../scene/geometry.js';
import type {ArtPack,SceneFrame} from '../../scene/types.js';
type Info={pack:ArtPack;frame:SceneFrame;contours:{id:string;loops:unknown;dimensions:[number,number];pivot:[number,number];gridScale?:number}[];mode:'flat'|'volume';shadowMode:'combined'|'receiver-only'|'authored-only';coverage:'foreground'|'physical';look:'basic'|'standard'|'lambert'|'fold'|'depth'|'depth-lit'|'depth-soft'|'edge'|'fiber'|'glow'|'contact'|'shadow-card'|'contact-card'|'bump-control'|'bump'|'bump-strong'|'lamp-control'|'lamp-light'|'edge-alpha';lanternIntensity:number;groundY?:number;profile:'preview'|'1080';textureUrls:Record<string,string>};
declare global { interface Window { sceneInput:Info; sceneReady?:boolean;sceneError?:string;sceneStats?:unknown; } }
async function main(){
 const {pack,frame,contours,mode,shadowMode,coverage,look,profile,lanternIntensity,groundY,textureUrls}=window.sceneInput;
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
 if(mode==='volume'&&look==='lamp-light'&&lanternIntensity>0){
  const lamp=frame.sprites.find(s=>s.id==='lamp');if(!lamp)throw Error('PAPER_LANTERN_MISSING');
  const [x,y]=anchorPoint(pack,lamp,'light');const point=new THREE.PointLight('#ffb56a',24000*lanternIntensity,650,2);
  point.position.set(x-960,540-y,160);point.castShadow=false;scene.add(point);
 }
 const loader=new THREE.TextureLoader(),textures=new Map<string,THREE.Texture>();
 const ids=[...new Set(frame.sprites.map(s=>s.asset))];
 await Promise.all(ids.map(async id=>{const url=textureUrls[id];if(!url)throw Error(`SCENE_TEXTURE_MISSING ${id}`);
   let t:THREE.Texture;try {t=await loader.loadAsync(url);}catch {throw Error(`SCENE_TEXTURE_LOAD ${id} ${url}`);}t.colorSpace=THREE.SRGBColorSpace;t.minFilter=THREE.LinearFilter;t.magFilter=THREE.LinearFilter;t.generateMipmaps=false;textures.set(id,t);}));
 const bumpTexture=mode==='volume'&&['bump','bump-control','bump-strong'].includes(look)?makePaperBump():undefined;
 let plates=0,extruded=0,hiddenPaperShadows=0,requiredContours=0,replacedContactShadows=0,shadowCards=0;
 const ordered=[...frame.sprites].sort((a,b)=>a.z-b.z);
 const contact=mode==='volume'&&(look==='contact'||look==='contact-card')?contactPoints(pack,frame,groundY!):undefined;
 const firstForeground=ordered.findIndex(s=>s.z>=0);if(firstForeground<0)throw Error('SCENE_FOREGROUND');
 const receiver=new THREE.Mesh(new THREE.PlaneGeometry(3200,2000),new THREE.ShadowMaterial({opacity:.23,depthTest:false,depthWrite:false}));
 receiver.position.z=-5;receiver.receiveShadow=true;receiver.renderOrder=firstForeground*2;scene.add(receiver);
 for(const [order,s] of ordered.entries()){
  if(mode==='volume'&&(shadowMode==='receiver-only'||look==='shadow-card'||look==='contact-card')&&s.id.endsWith('.paper-shadow')){hiddenPaperShadows++;continue;}
  if(contact&&s.id.endsWith('.contact-shadow')){
   const foot=s.id.slice(0,-'.contact-shadow'.length),point=contact.get(foot);if(!point)throw Error(`PAPER_CONTACT_SHADOW ${s.id}`);
   const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
   const c=canvas.getContext('2d');if(!c)throw Error('PAPER_CONTACT_CANVAS');
   const g=c.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(35,29,24,0.50)');g.addColorStop(1,'rgba(35,29,24,0)');c.fillStyle=g;c.fillRect(0,0,128,128);
   const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,depthTest:false,depthWrite:false}));
   sprite.position.set(point[0]-960,540-point[1],s.z);sprite.scale.set(100,25,1);sprite.renderOrder=order*2+1;scene.add(sprite);plates++;replacedContactShadows++;continue;
  }
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
   if(look==='edge'&&!s.asset.startsWith('background/'))roughenBack(body,s.asset,1);
   const background=s.asset.startsWith('background/');
   const mesh=new THREE.Mesh(body,new THREE.MeshStandardMaterial({color:background?'#ffffff':'#ad8d60',map:background?textures.get(s.asset):undefined,roughness:1,side:THREE.DoubleSide,transparent:!depthMode,depthTest:depthMode,depthWrite:depthMode}));
   mesh.renderOrder=order*2;mesh.castShadow=shadowMode!=='authored-only';group.add(mesh);extruded++;
  }
  if(mode==='volume'&&(look==='shadow-card'||look==='contact-card')&&contour&&!s.asset.startsWith('background/')){
   const shadow=new THREE.MeshBasicMaterial({map:textures.get(s.asset)!,color:'#241a13',transparent:true,opacity:.28,depthTest:false,depthWrite:false,side:THREE.DoubleSide});
   const ux=(3/asset.width).toFixed(9),uy=(3/asset.height).toFixed(9);
   shadow.onBeforeCompile=shader=>{
    const marker='#include <map_fragment>';if(!shader.fragmentShader.includes(marker))throw Error('PAPER_SHADOW_SHADER');
    shader.fragmentShader=shader.fragmentShader.replace(marker,`
     vec2 du = vec2(${ux},0.0), dv = vec2(0.0,${uy});
     float a = texture2D(map,vMapUv).a * 0.28;
     a += (texture2D(map,vMapUv+du).a + texture2D(map,vMapUv-du).a + texture2D(map,vMapUv+dv).a + texture2D(map,vMapUv-dv).a) * 0.12;
     a += (texture2D(map,vMapUv+du+dv).a + texture2D(map,vMapUv+du-dv).a + texture2D(map,vMapUv-du+dv).a + texture2D(map,vMapUv-du-dv).a) * 0.06;
     diffuseColor.a *= a;
    `);
   };
   shadow.customProgramCacheKey=()=>`f2-shadow-card:${ux}:${uy}`;
   const card=new THREE.Mesh(face,shadow);card.position.set(7,-8,-.1);card.renderOrder=order*2-.5;group.add(card);shadowCards++;
  }
  const options={map:textures.get(s.asset)!,transparent:!depthMode||look==='depth-soft',depthTest:depthMode,depthWrite:depthMode&&look!=='depth-soft',alphaTest:depthMode&&look!=='depth-soft'?.5:0,side:THREE.DoubleSide,opacity:s.opacity};
  const material=mode==='volume'&&s.asset==='mai/torso'&&['standard','lambert','fold'].includes(look)
   ?(look==='lambert'?new THREE.MeshLambertMaterial(options):new THREE.MeshStandardMaterial({...options,roughness:1,...(look==='fold'?{emissive:0xffffff,emissiveMap:options.map,emissiveIntensity:.25}:{})}))
   :new THREE.MeshBasicMaterial(options);
  if(mode==='volume'&&look==='edge-alpha'&&s.asset.startsWith('props/'))applyInwardEdge(material,asset.width,asset.height);
  if(mode==='volume'&&look==='fiber'&&['mai/torso','mai/upper-arm','mai/forearm'].includes(s.asset)){
   material.onBeforeCompile=shader=>{
    const marker='#include <map_fragment>';
    if(!shader.fragmentShader.includes(marker))throw Error('PAPER_FIBER_SHADER');
    shader.fragmentShader=shader.fragmentShader.replace(marker,marker+`
      float paperFiber = sin(vMapUv.x * 192.0 + sin(vMapUv.y * 81.0)*1.7)
                       * sin(vMapUv.y * 131.0 + vMapUv.x * 29.0);
      diffuseColor.rgb *= 1.0 + paperFiber * 0.035;
    `);
   };
   material.customProgramCacheKey=()=> 'f2-fiber-v1';
  }
  const bumpTarget=mode==='volume'&&(look==='bump'||look==='bump-control'||look==='bump-strong')&&['mai/torso','mai/upper-arm','mai/forearm'].includes(s.asset);
  const lampTarget=mode==='volume'&&(look==='lamp-control'||look==='lamp-light')&&!!contour&&!s.asset.startsWith('background/');
  const faceMaterial=bumpTarget?new THREE.MeshLambertMaterial({...options,emissive:0xffffff,emissiveMap:options.map,emissiveIntensity:.329,...(look==='bump'||look==='bump-strong'?{bumpMap:bumpTexture,bumpScale:look==='bump-strong'?2:.6}:{})}):lampTarget?new THREE.MeshLambertMaterial({...options,emissive:0xffffff,emissiveMap:options.map,emissiveIntensity:.329}):look==='depth-lit'&&mode==='volume'?new THREE.MeshStandardMaterial({...options,roughness:1}):material;
  const plate=new THREE.Mesh(face,faceMaterial);if(depthMode)plate.position.z=.05;
  if(look==='depth-lit'&&mode==='volume'){plate.receiveShadow=true;plate.castShadow=!!contour&&!s.asset.startsWith('background/');}
  plate.renderOrder=order*2+1;group.add(plate);scene.add(group);plates++;
 }
 if(mode==='volume'&&look==='glow'&&lanternIntensity>0){
  const lamp=frame.sprites.find(s=>s.id==='lamp');if(!lamp)throw Error('PAPER_LANTERN_MISSING');
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
  const context=canvas.getContext('2d');if(!context)throw Error('PAPER_GLOW_CANVAS');
  const gradient=context.createRadialGradient(64,64,0,64,64,64);
  gradient.addColorStop(0,'rgba(255,200,110,0.62)');gradient.addColorStop(.35,'rgba(255,175,80,0.2)');gradient.addColorStop(1,'rgba(255,160,60,0)');
  context.fillStyle=gradient;context.fillRect(0,0,128,128);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,opacity:lanternIntensity,blending:THREE.AdditiveBlending,depthTest:false,depthWrite:false}));
  const [lightX,lightY]=anchorPoint(pack,lamp,'light');glow.position.set(lightX-960,540-lightY,lamp.z);glow.scale.set(360,360,1);glow.renderOrder=ordered.length*2+10;scene.add(glow);
 }
 if(contact&&replacedContactShadows!==contact.size)throw Error('PAPER_CONTACT_SHADOW_COVERAGE');
 await renderer.compileAsync(scene,camera);renderer.render(scene,camera);renderer.getContext().finish();
 window.sceneStats={mode,shadowMode,coverage,plates,extruded,requiredContours,hiddenPaperShadows,replacedContactShadows,shadowCards,three:THREE.REVISION};window.sceneReady=true;
}
main().catch(e=>{window.sceneError=String(e);});
