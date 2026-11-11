/** Candidate A renderer. Publishes the synchronous HyperFrames seek protocol
 * only AFTER required textures, integrity checks, decode and shader warmup.
 * No dependency on undocumented LoadingManager counters. */
import * as THREE from 'three';
import {benchmarkFrame,type ShotId,type Edit,shotFrames} from '../scene/benchmark.js';
import type {ArtPack,SceneFrame} from '../scene/types.js';

export type TextureSpec={id:string;url:string;sha256:string;width:number;height:number};
export type RenderConfig={pack:ArtPack;textures:TextureSpec[];shot:ShotId;edit?:Edit;width:number;height:number;timeoutMs:number};
type WindowApi=Window&{studio:{ready:boolean;error:string|null;frame:number;state:SceneFrame|null;seek:(frame:number)=>void;dispose:()=>void;diagnostics:Record<string,unknown>};__hf?:{duration:number;seek:(time:number)=>void}};
const api=window as unknown as WindowApi;

async function loadTexture(spec:TextureSpec,timeoutMs:number):Promise<THREE.Texture>{
 const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
 let objectUrl:string|undefined;
 try{
  const work=async()=>{
   const response=await fetch(spec.url,{signal:controller.signal});
   if(!response.ok)throw Error(`ASSET_HTTP ${spec.id} ${response.status}`);
   const bytes=await response.arrayBuffer();
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
   if(hash!==spec.sha256)throw Error(`ASSET_HASH ${spec.id}`);
   const image=new Image();objectUrl=URL.createObjectURL(new Blob([bytes],{type:'image/png'}));image.src=objectUrl;
   try{await image.decode();}catch{throw Error(`ASSET_DECODE ${spec.id}`);}
   if(image.naturalWidth!==spec.width||image.naturalHeight!==spec.height)throw Error(`ASSET_DIMENSIONS ${spec.id}`);
   const texture=new THREE.Texture(image);texture.colorSpace=THREE.SRGBColorSpace;
   texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=false;texture.needsUpdate=true;
   return texture;
  };
  return await Promise.race([work(),new Promise<never>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error(`ASSET_TIMEOUT ${spec.id}`));},timeoutMs);})]);
 }finally{if(timer)clearTimeout(timer);if(objectUrl)URL.revokeObjectURL(objectUrl);}
}

async function start(){
 const response=await fetch('/config.json');if(!response.ok)throw Error('CONFIG_HTTP');
 const config=await response.json() as RenderConfig;
 const renderer=new THREE.WebGLRenderer({alpha:false,antialias:true,preserveDrawingBuffer:true});
 renderer.setPixelRatio(1);renderer.setSize(config.width,config.height);renderer.setClearColor('#e8ddbe',1);
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
 document.body.appendChild(renderer.domElement);
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();api.studio.ready=false;api.studio.error='WEBGL_CONTEXT_LOST';delete api.__hf;});
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-960,960,540,-540,.1,4000);
 camera.position.z=1000;
 const textures=new Map<string,THREE.Texture>(),meshes=new Map<string,THREE.Mesh>();
 const began=performance.now();
 // Bounded decode concurrency keeps high resolution layers within this host's RAM.
 const queue=[...config.textures];
 await Promise.all(Array.from({length:4},async()=>{while(queue.length){const spec=queue.shift()!;textures.set(spec.id,await loadTexture(spec,config.timeoutMs));}}));
 function draw(frame:number){
  if(!api.studio.ready)throw Error(api.studio.error??'RENDER_NOT_READY');
  const state=benchmarkFrame(config.pack,config.shot,frame,config.edit);
  for(const mesh of meshes.values())mesh.visible=false;
  const ordered=[...state.sprites].sort((a,b)=>a.z-b.z);
  for(const [order,s] of ordered.entries()){
   const asset=config.pack.assets.find(a=>a.id===s.asset);if(!asset)throw Error(`ASSET_UNKNOWN ${s.asset}`);
   const texture=textures.get(s.asset);if(!texture)throw Error(`TEXTURE_REQUIRED ${s.asset}`);
   const key=`${s.id}:${s.asset}`;let mesh=meshes.get(key);
   if(!mesh){
    const geometry=new THREE.PlaneGeometry(asset.width,asset.height);
    geometry.translate(asset.width/2-asset.pivot[0],asset.pivot[1]-asset.height/2,0);
    mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,depthTest:false,side:THREE.DoubleSide}));
    scene.add(mesh);meshes.set(key,mesh);
   }
   mesh.visible=true;mesh.renderOrder=order;mesh.position.set(s.x-960,540-s.y,s.z);mesh.rotation.z=-s.rotation*Math.PI/180;mesh.scale.set(s.scaleX,s.scaleY,1);
   (mesh.material as THREE.MeshBasicMaterial).opacity=s.opacity;
  }
  camera.position.x=state.camera.x-960;camera.position.y=540-state.camera.y;camera.zoom=state.camera.zoom;camera.updateProjectionMatrix();
  renderer.render(scene,camera);renderer.getContext().finish();
  api.studio.frame=frame;api.studio.state=state;
 }
 // Warm up meshes/shaders before publishing readiness. This temporary flag is
 // internal to synchronous setup; __hf remains absent until compile completes.
 api.studio.ready=true;draw(0);api.studio.ready=false;
 await renderer.compileAsync(scene,camera);
 const gl=renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');
 api.studio.diagnostics={three:THREE.REVISION,readyMs:performance.now()-began,textures:textures.size,
  gl:gl.getParameter(gl.VERSION),renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):null};
 api.studio.seek=draw;api.studio.dispose=()=>{for(const mesh of meshes.values()){mesh.geometry.dispose();(mesh.material as THREE.Material).dispose();}for(const t of textures.values())t.dispose();renderer.dispose();};
 api.studio.ready=true;draw(0);
 api.__hf={duration:shotFrames[config.shot]/24,seek:(time:number)=>draw(Math.min(shotFrames[config.shot]-1,Math.max(0,Math.floor(time*24+1e-7))))};
}
api.studio={ready:false,error:null,frame:-1,state:null,seek:()=>{throw Error('RENDER_NOT_READY');},dispose:()=>{},diagnostics:{}};
start().catch(e=>{api.studio.ready=false;api.studio.error=e instanceof Error?e.message:String(e);delete api.__hf;console.error(api.studio.error);});
