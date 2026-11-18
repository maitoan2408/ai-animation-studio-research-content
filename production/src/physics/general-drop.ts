/**
 * G3: art-bound, immutable fixed-step physics for native props, independent of
 * M3 cup/showcase. Two collider classes and explicit finite platform envelope.
 * Simulate only during bake; seek/render reads a verified receipt.
 */
import {createHash} from 'node:crypto';
import {rapier,versions} from './engines.js';
import type {ArtPack} from '../scene/types.js';

export type GeneralDrop={
 schemaVersion:'general-physics/1';
 asset:string;assetSha256:string;
 initial:{centerX:number;centerY:number;angleDeg:number};
 collider:{kind:'box';halfWidthPx:number;halfHeightPx:number}|
   {kind:'ball';radiusPx:number};
 platform:{left:number;right:number;top:number};
 initialVelocity:{xPxPerSecond:number;yPxPerSecond:number;angularDegPerSecond:number};
 physics:{massKg:number;restitution:number;friction:number;gravityMps2:number};
 frames:number;pixelsPerMeter:200;
};
export type DropFrame={frame:number;centerX:number;centerY:number;angleDeg:number};
export type GeneralDropBake={
 schemaVersion:'general-physics-bake/1';projectSha256:string;
 engine:string;fps:24;substeps:10;
 frames:DropFrame[];contacts:number[];sha256:string;
};
const sha=(s:unknown)=>createHash('sha256').update(JSON.stringify(s)).digest('hex');
const o=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const exact=(v:Record<string,unknown>,props:string[])=>Object.keys(v).sort().join('|')===props.slice().sort().join('|');
const range=(v:unknown,a:number,b:number)=>typeof v==='number'&&Number.isFinite(v)&&v>=a&&v<=b;
export function validateGeneralDrop(input:unknown,pack:ArtPack):GeneralDrop{
 if(!o(input)||!exact(input,['schemaVersion','asset','assetSha256','initial','collider',
    'platform','initialVelocity','physics','frames','pixelsPerMeter'])||
    input.schemaVersion!=='general-physics/1'||input.pixelsPerMeter!==200||
    !Number.isSafeInteger(input.frames)||!range(input.frames,24,240)||
    !o(input.initial)||!exact(input.initial,['centerX','centerY','angleDeg'])||
    !o(input.collider)||!o(input.platform)||!o(input.initialVelocity)||!o(input.physics)||
    !exact(input.platform,['left','right','top'])||
    !exact(input.initialVelocity,['xPxPerSecond','yPxPerSecond','angularDegPerSecond'])||
    !exact(input.physics,['massKg','restitution','friction','gravityMps2']))
   throw Error('GENERAL_PHYSICS_SCHEMA');
 const p=input as unknown as GeneralDrop,c=input.collider,platform=input.platform;
 const asset=pack.assets.find(a=>a.id===input.asset);
 if(!asset||asset.sha256!==input.assetSha256||asset.category!=='prop')
   throw Error('GENERAL_PHYSICS_ASSET_STALE');
 if(!range(p.initial.centerX,0,2000)||!range(p.initial.centerY,0,1080)||
    !range(p.initial.angleDeg,-180,180)||
    !range(platform.left,0,1920)||!range(platform.right,0,1920)||
    !range(platform.top,300,950)||Number(platform.right)-Number(platform.left)<100||
    !range(p.initialVelocity.xPxPerSecond,-400,400)||
    !range(p.initialVelocity.yPxPerSecond,-400,400)||
    !range(p.initialVelocity.angularDegPerSecond,-500,500)||
    !range(p.physics.massKg,.01,20)||!range(p.physics.restitution,0,.9)||
    !range(p.physics.friction,0,2)||!range(p.physics.gravityMps2,1,30))
   throw Error('GENERAL_PHYSICS_RANGE');
 let radius:number;
 if(c.kind==='box'&&exact(c,['kind','halfWidthPx','halfHeightPx'])&&
    range(c.halfWidthPx,2,100)&&range(c.halfHeightPx,2,100))
   radius=Math.hypot(c.halfWidthPx as number,c.halfHeightPx as number);
 else if(c.kind==='ball'&&exact(c,['kind','radiusPx'])&&range(c.radiusPx,2,100))
   radius=c.radiusPx as number;
 else throw Error('GENERAL_PHYSICS_SHAPE');
 if(p.initial.centerX-radius<p.platform.left||p.initial.centerX+radius>p.platform.right||
    p.initial.centerY+radius>p.platform.top||p.platform.top-p.initial.centerY-radius>250)
   throw Error('GENERAL_PHYSICS_PLATFORM_BOUNDS');
 return p;
}
export function verifyGeneralDropBake(raw:unknown,p:GeneralDrop):GeneralDropBake{
 if(!o(raw)||!exact(raw,['schemaVersion','projectSha256','engine','fps','substeps','frames','contacts','sha256'])||
    raw.schemaVersion!=='general-physics-bake/1'||raw.projectSha256!==sha(p)||
    raw.engine!=='rapier-'+versions.rapier||raw.fps!==24||raw.substeps!==10||
    !Array.isArray(raw.frames)||raw.frames.length!==p.frames||
    !Array.isArray(raw.contacts)||raw.contacts.some(x=>!Number.isSafeInteger(x)||x<1||x>=p.frames))
   throw Error('GENERAL_PHYSICS_BAKE_SCHEMA');
 const frames=raw.frames as DropFrame[];
 for(const [i,f]of frames.entries()){
   if(!o(f)||!exact(f,['frame','centerX','centerY','angleDeg'])||
      f.frame!==i||![f.centerX,f.centerY,f.angleDeg].every(Number.isFinite))
      throw Error('GENERAL_PHYSICS_FRAME_INVALID');
 }
 const {sha256,...rest}=raw;
 if(raw.sha256!==sha(rest))throw Error('GENERAL_PHYSICS_BAKE_HASH');
 for(const f of frames)Object.freeze(f);
 Object.freeze(raw.frames);Object.freeze(raw.contacts);Object.freeze(raw);
 return raw as GeneralDropBake;
}
export async function bakeGeneralDrop(raw:unknown,pack:ArtPack):Promise<GeneralDropBake>{
 const p=structuredClone(validateGeneralDrop(raw,pack));
 const R=await rapier(),world=new R.World({x:0,y:-p.physics.gravityMps2});
 world.timestep=1/240;world.numSolverIterations=12;
 const m=200,ground=world.createRigidBody(R.RigidBodyDesc.fixed());
 const base=world.createCollider(R.ColliderDesc.cuboid(
  (p.platform.right-p.platform.left)/(2*m),.2)
  .setTranslation((p.platform.left+p.platform.right)/(2*m),-p.platform.top/m-.2)
  .setRestitution(p.physics.restitution).setFriction(p.physics.friction),ground);
 const body=world.createRigidBody(R.RigidBodyDesc.dynamic()
   .setTranslation(p.initial.centerX/m,-p.initial.centerY/m)
   .setRotation(-p.initial.angleDeg*Math.PI/180)
   .setLinvel(p.initialVelocity.xPxPerSecond/m,-p.initialVelocity.yPxPerSecond/m)
   .setAngvel(-p.initialVelocity.angularDegPerSecond*Math.PI/180)
   .setCanSleep(false).setCcdEnabled(true));
 const collider=world.createCollider(
  (p.collider.kind==='ball'?R.ColliderDesc.ball(p.collider.radiusPx/m):
     R.ColliderDesc.cuboid(p.collider.halfWidthPx/m,p.collider.halfHeightPx/m))
    .setMass(p.physics.massKg).setFriction(p.physics.friction)
    .setRestitution(p.physics.restitution),body);
 const frames:DropFrame[]=[{frame:0,centerX:p.initial.centerX,centerY:p.initial.centerY,
   angleDeg:p.initial.angleDeg}],contacts:number[]=[];
 let touched=false;
 try{
  for(let frame=1;frame<p.frames;frame++){
   for(let i=0;i<10;i++){
     world.step();
     if(!touched){
       world.contactPair(collider,base,m=>{
         for(let k=0;k<m.numContacts();k++)
           if(m.contactImpulse(k)>0)touched=true;
       });
       if(touched)contacts.push(frame);
     }
   }
   const v=body.translation(),angle=-body.rotation()*180/Math.PI;
   if(![v.x,v.y,angle].every(Number.isFinite))throw Error('GENERAL_PHYSICS_NONFINITE');
   frames.push({frame,centerX:v.x*200,centerY:-v.y*200,angleDeg:angle});
  }
 }finally{world.free();}
 const payload={schemaVersion:'general-physics-bake/1' as const,
  projectSha256:sha(p),engine:'rapier-'+versions.rapier,fps:24 as const,
  substeps:10 as const,frames,contacts};
 return verifyGeneralDropBake({...payload,sha256:sha(payload)},p);
}

/** A public SHA is an integrity checksum, not proof that Rapier produced a
 * receipt. At every untrusted playback boundary, reproduce the fixed-step
 * solver result on the exact validated recipe before publishing or auditing. */
export async function verifyGeneralDropAgainstSolver(raw:unknown,project:unknown,pack:ArtPack):Promise<GeneralDropBake>{
 const p=validateGeneralDrop(project,pack);
 const checked=verifyGeneralDropBake(raw,p);
 const rebuilt=await bakeGeneralDrop(p,pack);
 if(checked.sha256!==rebuilt.sha256)throw Error('GENERAL_PHYSICS_BAKE_FORGED');
 return checked;
}
