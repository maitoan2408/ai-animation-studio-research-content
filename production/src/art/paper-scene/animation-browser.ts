/** Deterministic indexed S05 preview: absolute frame evaluation, no wall clock. */
import * as THREE from 'three';
import {applyInwardEdge} from './edge-alpha.js';
import {makePaperBump} from './paper-bump.js';
import {makeContourBody} from './contour-body.js';
import {shearDepth} from './depth.js';
import {requireForegroundContour} from './coverage.js';
import {anchorPoint} from '../../scene/geometry.js';
import type {ArtPack,SceneFrame} from '../../scene/types.js';
type Contour={id:string;loops:unknown;dimensions:[number,number];pivot:[number,number];gridScale?:number};
type Config={pack:ArtPack;frames:SceneFrame[];contours:Contour[];textureUrls:Record<string,string>;width:number;height:number;includeBackground:boolean;look:'basic'|'bump'|'edge-alpha'|'lamp-light';lanternIntensity:number};
type Entry={group:THREE.Group;face:THREE.Mesh<THREE.PlaneGeometry,THREE.Material>;body?:THREE.Mesh};
declare global {interface Window {animationInput:Config;animationReady?:boolean;animationError?:string;animationSeek?:(frame:number)=>void;animationStats?:unknown}}
async function main(){
 const {pack,frames,contours,textureUrls,width,height,includeBackground,look,lanternIntensity}=window.animationInput;
 if(frames.length!==192||!Number.isInteger(width)||!Number.isInteger(height)||typeof includeBackground!=='boolean'||!['basic','bump','edge-alpha','lamp-light'].includes(look)||!Number.isFinite(lanternIntensity)||lanternIntensity<0||lanternIntensity>1)throw Error('ANIMATION_CONFIG');
 const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(width,height);
 renderer.setClearColor('#e8ddbe',1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
 document.body.appendChild(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-960,960,540,-540,.1,4000);camera.position.z=1000;
 scene.add(new THREE.AmbientLight(0xffffff,1.1));const light=new THREE.DirectionalLight(0xffffff,1.2);light.position.set(-400,500,1000);scene.add(light);
 const point=look==='lamp-light'?new THREE.PointLight('#ffb56a',24000*lanternIntensity,650,2):undefined;
 if(point){point.castShadow=false;scene.add(point);}
 const loader=new THREE.TextureLoader(),textures=new Map<string,THREE.Texture>();
 const ids=[...new Set(frames.flatMap(f=>f.sprites.map(s=>s.asset)))],queue=[...ids];
 await Promise.all(Array.from({length:4},async()=>{while(queue.length){const id=queue.shift()!,url=textureUrls[id];if(!url)throw Error(`ANIMATION_TEXTURE ${id}`);
  const t=await loader.loadAsync(url);t.colorSpace=THREE.SRGBColorSpace;t.minFilter=THREE.LinearFilter;t.magFilter=THREE.LinearFilter;t.generateMipmaps=false;textures.set(id,t);}}));
 const bumpTexture=look==='bump'?makePaperBump():undefined;
 const cache=new Map<string,Entry>();
 function seek(index:number){
  if(!Number.isSafeInteger(index)||index<0||index>=frames.length)throw Error('ANIMATION_FRAME_RANGE');
  const frame=frames[index]!;
  if(point){const lamp=frame.sprites.find(s=>s.id==='lamp');if(!lamp)throw Error('ANIMATION_LANTERN_MISSING');const [x,y]=anchorPoint(pack,lamp,'light');point.position.set(x-960,540-y,160);}
  let requiredContours=0,extruded=0;for(const entry of cache.values())entry.group.visible=false;
  camera.position.x=frame.camera.x-960;camera.position.y=540-frame.camera.y;camera.zoom=frame.camera.zoom;camera.updateProjectionMatrix();
  for(const [order,s] of [...frame.sprites].sort((a,b)=>a.z-b.z).entries()){
   const asset=pack.assets.find(a=>a.id===s.asset),texture=textures.get(s.asset);if(!asset||!texture)throw Error(`ANIMATION_ASSET ${s.asset}`);
   const contour=contours.find(c=>c.id===s.asset);requireForegroundContour(s.asset,!!contour,includeBackground);
   if(['mai/','an/','mouth/','props/'].some(prefix=>s.asset.startsWith(prefix))||(includeBackground&&s.asset.startsWith('background/')))requiredContours++;
   if(contour)extruded++;
   const key=`${s.id}:${s.asset}`;let entry=cache.get(key);
   if(!entry){
    const group=new THREE.Group(),geometry=new THREE.PlaneGeometry(asset.width,asset.height);
    geometry.translate(asset.width/2-asset.pivot[0],asset.pivot[1]-asset.height/2,0);
    const options={map:texture,transparent:true,depthTest:false,depthWrite:false,side:THREE.DoubleSide};
    const bump=look==='bump'&&['mai/torso','mai/upper-arm','mai/forearm'].includes(s.asset);
    const lamp=look==='lamp-light'&&!!contour&&!s.asset.startsWith('background/');
    const material=bump||lamp
     ?new THREE.MeshLambertMaterial({...options,emissive:0xffffff,emissiveMap:texture,emissiveIntensity:.329,...(bump?{bumpMap:bumpTexture,bumpScale:.6}:{})})
     :new THREE.MeshBasicMaterial(options);
    if(look==='edge-alpha'&&s.asset.startsWith('props/'))applyInwardEdge(material,asset.width,asset.height);
    const face=new THREE.Mesh(geometry,material);
    group.add(face);
    let body:THREE.Mesh|undefined;
    if(contour){
      if(contour.dimensions[0]!==asset.width||contour.dimensions[1]!==asset.height||contour.pivot[0]!==asset.pivot[0]||contour.pivot[1]!==asset.pivot[1])throw Error(`ANIMATION_CONTOUR_METADATA ${s.asset}`);
      const g=makeContourBody(contour.loops,contour,3);shearDepth(g,.25);
      const background=s.asset.startsWith('background/');
      body=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:background?'#ffffff':'#ad8d60',map:background?texture:undefined,roughness:1,side:THREE.DoubleSide,transparent:true,depthTest:false,depthWrite:false}));group.add(body);
    }
    scene.add(group);entry={group,face,body};cache.set(key,entry);
   }
   entry.group.visible=true;entry.group.position.set(s.x-960,540-s.y,s.z);entry.group.rotation.z=-s.rotation*Math.PI/180;entry.group.scale.set(s.scaleX,s.scaleY,1);
   entry.face.renderOrder=order*2+1;entry.face.material.opacity=s.opacity;if(entry.body)entry.body.renderOrder=order*2;
  }
  renderer.render(scene,camera);renderer.getContext().finish();window.animationStats={frame:index,cacheEntries:cache.size,textures:textures.size,requiredContours,extruded,three:THREE.REVISION};
 }
 window.animationSeek=seek;seek(0);await renderer.compileAsync(scene,camera);seek(0);window.animationReady=true;
}
main().catch(e=>{window.animationError=String(e);});
