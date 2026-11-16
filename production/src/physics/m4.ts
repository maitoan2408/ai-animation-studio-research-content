/**
 * M4 reusable bounded 2D rigid-prop pipeline. Author-owned cutout animation is
 * never resimulated on seek; Rapier runs only at bake time (240 Hz/24 fps).
 * Stage: pixels, y down, clockwise degrees. Rapier: metres, y up, CCW radians.
 *
 * Supported scope: a validated M3 cutout character, one SHA-locked cup with a
 * recorded grip->release, a rectangular collision proxy and a level platform.
 * Unsupported rigs/objects/timelines fail closed instead of pretending physics.
 */
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {rapier,versions} from './engines.js';
import {m3TotalFrames,sampleM3,validateM3,type M3Project} from '../motion/character-library.js';
import type {ArtPack,Sprite} from '../scene/types.js';

export type PhysicsProject={
 schemaVersion:'physics-m4/1';
 motion:M3Project;
 tailFrames:number;
 prop:{
   id:string;pixelsPerMeter:200;massKg:number;
   halfExtentsM:[number,number];linearDamping:number;angularDamping:number;
   friction:number;restitution:number;floorStageY:number;
   velocityStagePxPerSecond:[number,number];angularVelocityDegPerSecond:number;
 };
 gravityMps2:number;
};
export type PhysicsRecipe={
 schemaVersion:'m4-recipe/1';
 engine:'rapier-0.21.0-deterministic-compat';
 algorithm:'released-prop-platform-v1';
 fps:24;hz:240;substeps:10;solverIterations:12;
 gravityMps2:number;contactSkinM:0.002;
 packageLockSha256:string;implementationSha256:string;
};
export type PhysicsFrame={
 frame:number;centerX:number;centerY:number;rotationDeg:number;
 owner:'authored'|'physics';
};
export type PhysicsEvent={frame:number;kind:'grip'|'release'|'platform-contact';source:'authored-contact'|'rapier-contact'};
export type PhysicsBake={
 schemaVersion:'m4-bake/1';
 inputSha256:string;artSha256:string;recipe:PhysicsRecipe;
 recipeSha256:string;bakeSha256:string;releaseFrame:number;
 frames:PhysicsFrame[];events:PhysicsEvent[];
};
const sha=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fileSha=(path:URL)=>createHash('sha256').update(readFileSync(path)).digest('hex');
const hex=(s:unknown):s is string=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const exact=(v:Record<string,unknown>,wanted:string[])=>Object.keys(v).sort().join('|')===wanted.slice().sort().join('|');
const finite=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
const range=(v:unknown,a:number,b:number)=>finite(v)&&v>=a&&v<=b;
const pair=(v:unknown,limit:number):v is [number,number]=>Array.isArray(v)&&v.length===2&&v.every(x=>range(x,-limit,limit));
const nativeSourceSha=sha(['m4.ts','m4-adapter.ts','engines.ts','../motion/character-library.ts',
  '../render/browser.ts'].map(p=>({path:p,sha256:fileSha(new URL(p,import.meta.url))})));
const lockSha=fileSha(new URL('../../package-lock.json',import.meta.url));
export function validateM4Project(raw:unknown,pack:ArtPack):PhysicsProject{
 if(!obj(raw)||!exact(raw,['schemaVersion','motion','tailFrames','prop','gravityMps2'])||
    raw.schemaVersion!=='physics-m4/1'||!obj(raw.prop)||
    !exact(raw.prop,['id','pixelsPerMeter','massKg','halfExtentsM','linearDamping',
      'angularDamping','friction','restitution','floorStageY','velocityStagePxPerSecond',
      'angularVelocityDegPerSecond']))
   throw Error('M4_PROJECT_SCHEMA');
 const motion=validateM3(raw.motion,pack),p=raw.prop;
 if(!motion.prop||motion.prop.id!==p.id||
    motion.clips.filter(c=>c.action==='pick-place').length!==1||
    motion.clips.at(-1)?.action!=='pick-place')
   throw Error('M4_PROP_CONTACT_UNSUPPORTED');
 if(!Number.isSafeInteger(raw.tailFrames)||Number(raw.tailFrames)<32||Number(raw.tailFrames)>240||
    !range(raw.gravityMps2,1,30)||p.pixelsPerMeter!==200||
    !range(p.massKg,0.01,10)||!pair(p.halfExtentsM,1)||
    p.halfExtentsM.some((v:number)=>v<=0||v>0.5)||
    !range(p.linearDamping,0,10)||!range(p.angularDamping,0,10)||
    !range(p.friction,0,2)||!range(p.restitution,0,1)||
    !range(p.floorStageY,300,950)||!pair(p.velocityStagePxPerSecond,500)||
    !range(p.angularVelocityDegPerSecond,-720,720))
   throw Error('M4_PHYSICS_PARAMETERS');
 const total=m3TotalFrames(motion)+(raw.tailFrames as number);
 if(total>5760)throw Error('M4_TIMELINE_RANGE');
 const release=detectRelease(motion,pack);
 const s=sampleM3(motion,release,pack).frame.sprites.find(x=>x.id===p.id);
 if(!s)throw Error('M4_PROP_SPRITE_MISSING');
 const center=centre(pack,s);
 const bottom=center[1]+(p.halfExtentsM as number[])[1]!*200;
 if(bottom>Number(p.floorStageY)+0.5)throw Error('M4_PLATFORM_INITIAL_PENETRATION');
 if(Number(p.floorStageY)-bottom>100)throw Error('M4_PLATFORM_TOO_FAR');
 return raw as PhysicsProject;
}
function detectRelease(motion:M3Project,pack:ArtPack):number{
 let release=-1,gripCount=0,transitionCount=0;
 for(let i=0;i<m3TotalFrames(motion);i++){
   const grip=sampleM3(motion,i,pack).contact.grip;
   if(grip)gripCount++;
   if(i>0&&sampleM3(motion,i-1,pack).contact.grip&&!grip){
     release=i;transitionCount++;
   }
 }
 if(gripCount<5||transitionCount!==1||release<1)throw Error('M4_GRIP_RELEASE_REQUIRED');
 return release;
}
const offset=(pack:ArtPack,s:Sprite):[number,number]=>{
 const asset=pack.assets.find(a=>a.id===s.asset);
 if(!asset)throw Error('M4_ART_ASSET_MISSING');
 return [(asset.width/2-asset.pivot[0])*s.scaleX,(asset.height/2-asset.pivot[1])*s.scaleY];
};
const rotate=(p:[number,number],angle:number):[number,number]=>{
 const r=angle*Math.PI/180,c=Math.cos(r),s=Math.sin(r);
 return [p[0]*c-p[1]*s,p[0]*s+p[1]*c];
};
export const centre=(pack:ArtPack,s:Sprite):[number,number]=>{
 const d=rotate(offset(pack,s),s.rotation);
 return [s.x+d[0],s.y+d[1]];
};
export function m4Recipe(project:PhysicsProject):PhysicsRecipe{
 return {schemaVersion:'m4-recipe/1',engine:('rapier-'+versions.rapier) as PhysicsRecipe['engine'],
   algorithm:'released-prop-platform-v1',fps:24,hz:240,substeps:10,solverIterations:12,
   gravityMps2:project.gravityMps2,contactSkinM:0.002,
   packageLockSha256:lockSha,implementationSha256:nativeSourceSha};
}
function stageFrame(pack:ArtPack,motion:M3Project,f:number,owner:PhysicsFrame['owner']):PhysicsFrame{
 const sample=sampleM3(motion,Math.min(f,m3TotalFrames(motion)-1),pack);
 const prop=sample.frame.sprites.find(s=>s.id===motion.prop?.id);
 if(!prop)throw Error('M4_PROP_NOT_VISIBLE');
 const [centerX,centerY]=centre(pack,prop);
 return {frame:f,centerX,centerY,rotationDeg:prop.rotation,owner};
}
function validateRecipe(r:unknown):asserts r is PhysicsRecipe{
 if(!obj(r)||!exact(r,['schemaVersion','engine','algorithm','fps','hz','substeps',
   'solverIterations','gravityMps2','contactSkinM','packageLockSha256','implementationSha256'])||
   r.schemaVersion!=='m4-recipe/1'||r.engine!=='rapier-0.21.0-deterministic-compat'||
   r.algorithm!=='released-prop-platform-v1'||r.fps!==24||r.hz!==240||
   r.substeps!==10||r.solverIterations!==12||r.contactSkinM!==0.002||
   !range(r.gravityMps2,1,30)||!hex(r.packageLockSha256)||!hex(r.implementationSha256))
   throw Error('M4_RECIPE_INVALID');
}
/** Fail closed on stale input, missing art, changed toolchain, damaged bake or events. */
export function validateM4Bake(raw:unknown,project:PhysicsProject,pack:ArtPack):PhysicsBake{
 validateM4Project(project,pack);
 if(!obj(raw)||!exact(raw,['schemaVersion','inputSha256','artSha256','recipe',
  'recipeSha256','bakeSha256','releaseFrame','frames','events'])||raw.schemaVersion!=='m4-bake/1')
   throw Error('M4_BAKE_SCHEMA');
 validateRecipe(raw.recipe);
 if(raw.inputSha256!==sha(project)||raw.artSha256!==sha(pack))throw Error('M4_BAKE_INPUT_OR_ART_STALE');
 const recipe=m4Recipe(project);
 if(sha(raw.recipe)!==sha(recipe)||raw.recipeSha256!==sha(recipe))
   throw Error('M4_BAKE_RECIPE_OR_IMPLEMENTATION_STALE');
 const release=detectRelease(project.motion,pack);
 if(raw.releaseFrame!==release)throw Error('M4_BAKE_RELEASE_MISMATCH');
 if(!Array.isArray(raw.frames)||raw.frames.length!==m3TotalFrames(project.motion)+project.tailFrames)
   throw Error('M4_BAKE_FRAMES');
 const frames=raw.frames as PhysicsFrame[];
 for(const [f,v] of frames.entries()){
   if(!obj(v)||!exact(v,['frame','centerX','centerY','rotationDeg','owner'])||
     v.frame!==f||!range(v.centerX,-10000,10000)||!range(v.centerY,-10000,10000)||
     !range(v.rotationDeg,-100000,100000)||v.owner!==(f<release?'authored':'physics'))
     throw Error('M4_BAKE_FRAME_INVALID');
   if(f<release&&sha(v)!==sha(stageFrame(pack,project.motion,f,'authored')))
     throw Error('M4_AUTHORED_FRAME_TAMPER');
 }
 if(!Array.isArray(raw.events)||raw.events.length<2)throw Error('M4_BAKE_EVENTS');
 for(const e of raw.events){
   if(!obj(e)||!exact(e,['frame','kind','source'])||
     !Number.isSafeInteger(e.frame)||Number(e.frame)<0||Number(e.frame)>=frames.length||
     !['grip','release','platform-contact'].includes(String(e.kind))||
     e.source!==(e.kind==='platform-contact'?'rapier-contact':'authored-contact'))
     throw Error('M4_BAKE_EVENT_INVALID');
 }
 const events=raw.events as PhysicsEvent[];
 if(events.filter(e=>e.kind==='release').length!==1||events.find(e=>e.kind==='release')?.frame!==release||
    !events.some(e=>e.kind==='grip'&&e.frame<release)||
    events.filter(e=>e.kind==='platform-contact').length>1||
    events.some(e=>e.kind==='platform-contact'&&e.frame<release))
   throw Error('M4_BAKE_EVENTS');
 const {bakeSha256,...payload}=raw;
 if(bakeSha256!==sha(payload))throw Error('M4_BAKE_SHA_MISMATCH');
 for(const f of frames)Object.freeze(f);
 for(const e of events)Object.freeze(e);
 Object.freeze(frames);Object.freeze(events);Object.freeze(raw.recipe);Object.freeze(raw);
 return raw as PhysicsBake;
}
export function sampleM4Bake(bake:PhysicsBake,frame:number):PhysicsFrame{
 if(!Object.isFrozen(bake)||!Object.isFrozen(bake.frames))throw Error('M4_BAKE_UNVALIDATED');
 if(!Number.isSafeInteger(frame)||frame<0||frame>=bake.frames.length)throw RangeError('M4_FRAME_OUT_OF_RANGE');
 return bake.frames[frame]!;
}
/** Fixed-step numerical simulation, only at bake time. Renderer reads immutable frames. */
export async function bakeM4(raw:unknown,pack:ArtPack):Promise<PhysicsBake>{
 const project=structuredClone(validateM4Project(raw,pack));
 const p=project.prop,ppm=p.pixelsPerMeter;
 const recipe=m4Recipe(project);
 const release=detectRelease(project.motion,pack),count=m3TotalFrames(project.motion)+project.tailFrames;
 const origin=stageFrame(pack,project.motion,release,'physics');
 const frames:PhysicsFrame[]=Array.from({length:release},(_,i)=>stageFrame(pack,project.motion,i,'authored'));
 const events:PhysicsEvent[]=[{frame:release-1,kind:'grip',source:'authored-contact'},
   {frame:release,kind:'release',source:'authored-contact'}];
 const r=await rapier(),world=new r.World({x:0,y:-recipe.gravityMps2});
 world.timestep=1/recipe.hz;world.numSolverIterations=recipe.solverIterations;
 const ground=world.createRigidBody(r.RigidBodyDesc.fixed());
 const platform=world.createCollider(r.ColliderDesc.cuboid(20,0.2)
    .setTranslation(0,-p.floorStageY/ppm-0.2)
    .setFriction(p.friction).setRestitution(p.restitution),ground);
 const body=world.createRigidBody(r.RigidBodyDesc.dynamic()
   .setTranslation(origin.centerX/ppm,-origin.centerY/ppm)
   .setRotation(-origin.rotationDeg*Math.PI/180)
   .setLinvel(p.velocityStagePxPerSecond[0]/ppm,-p.velocityStagePxPerSecond[1]/ppm)
   .setAngvel(-p.angularVelocityDegPerSecond*Math.PI/180)
   .setLinearDamping(p.linearDamping).setAngularDamping(p.angularDamping)
   .setCanSleep(false).setCcdEnabled(true));
 const collider=world.createCollider(r.ColliderDesc.cuboid(p.halfExtentsM[0],p.halfExtentsM[1])
   .setMass(p.massKg).setFriction(p.friction).setRestitution(p.restitution)
   .setContactSkin(recipe.contactSkinM),body);
 let contacted=false;
 try{
   frames.push(origin);
   for(let f=release+1;f<count;f++){
     for(let i=0;i<recipe.substeps;i++)world.step();
     const t=body.translation(),angle=-body.rotation()*180/Math.PI;
     if(![t.x,t.y,angle].every(Number.isFinite))throw Error('M4_NONFINITE_SIMULATION');
     frames.push({frame:f,centerX:t.x*ppm,centerY:-t.y*ppm,rotationDeg:angle,owner:'physics'});
     if(!contacted){
       world.contactPair(collider,platform,m=>{
         for(let j=0;j<m.numSolverContacts();j++)
           if(m.solverContactDist(j)<=0)contacted=true;
       });
       if(contacted)events.push({frame:f,kind:'platform-contact',source:'rapier-contact'});
     }
   }
 }finally{world.free();}
 const payload={schemaVersion:'m4-bake/1' as const,inputSha256:sha(project),artSha256:sha(pack),
   recipe,recipeSha256:sha(recipe),releaseFrame:release,frames,events};
 return validateM4Bake({...payload,bakeSha256:sha(payload)},project,pack);
}
