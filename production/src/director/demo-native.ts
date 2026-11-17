/** Six source-authored, genuinely distinct native projects using one reusable Director. */
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {nativeArt,planNativeDirector,saveNativePlan,reopenNativePlan,
 executeNativeDirector,type NativeDirectorInput} from './native-director.js';
import {makeM3Showcase,type M3Project} from '../motion/character-library.js';
import type {GeneralFilm} from '../motion/general-timeline.js';
import type {ArtPack} from '../scene/types.js';
import {root} from '../render/server.js';
const out=path.resolve(process.env.NATIVE_DIRECTOR_OUTPUT_DIR??
 path.join(root,'out/product-first/m6-native-director-six'));
const hash=(x:Uint8Array|string)=>createHash('sha256').update(x).digest('hex');
const art=(pack:ArtPack,id:string)=>{
 const a=pack.assets.find(a=>a.id===id);
 if(!a)throw Error('NATIVE_DEMO_MISSING_ASSET '+id);
 return a;
};
const makeM3=(pack:ArtPack,mode:'mai-wave'|'an-walk'|'mai-left-cup'|'an-right-lantern'):M3Project=>{
 const p=structuredClone(makeM3Showcase(pack,'demo-actor','an'));
 if(mode==='mai-wave'){
   p.character.id='mai-performance';p.character.model='mai';p.character.xStart=880;
   p.character.capabilities=['wave','turn-head'];
   p.clips=[{action:'wave',frames:49},{action:'turn-head',frames:49}];
   delete p.prop;
 }else if(mode==='an-walk'){
   p.character.id='an-walking';p.character.model='an';p.character.xStart=720;
   p.character.capabilities=['walk-stop','wave','turn-head'];
   p.clips=[{action:'walk-stop',frames:73},{action:'wave',frames:49},
     {action:'turn-head',frames:49}];
   delete p.prop;
 }else if(mode==='mai-left-cup'){
   p.character.id='mai-left-cup';p.character.model='mai';p.character.xStart=840;
   p.character.capabilities=['turn-head','pick-place'];
   p.clips=[{action:'turn-head',frames:49},{action:'pick-place',frames:73}];
   p.prop={id:'desk-cup',asset:'props/cup',sha256:art(pack,'props/cup').sha256,
     x:720,y:631,scale:.7,hand:'left'};
   p.stage={id:'workbench-left',asset:'props/workbench',
     sha256:art(pack,'props/workbench').sha256,x:620,y:860,z:-1,scale:1.2};
 }else{
   p.character.id='an-lantern';p.character.model='an';p.character.xStart=840;
   p.character.capabilities=['turn-head','pick-place'];
   p.clips=[{action:'turn-head',frames:49},{action:'pick-place',frames:73}];
   p.prop={id:'lamp',asset:'props/lantern-dark',
     sha256:art(pack,'props/lantern-dark').sha256,
     x:940,y:631,scale:.65,hand:'right'};
   p.stage={id:'workbench-right',asset:'props/workbench',
     sha256:art(pack,'props/workbench').sha256,x:1060,y:860,z:-1,scale:1.2};
 }
 return p;
};
const makeG3=(pack:ArtPack,kind:'cup'|'lantern'):NativeDirectorInput=>{
 const cup=kind==='cup',model=cup?'an':'mai',hand=cup?'right':'left';
 const prop=cup?'props/cup':'props/lantern-dark';
 const rootX=cup?800:1280,objectX=cup?900:1180,scale=cup?.7:.65,
   objectLift=cup?40:26,benchX=cup?1060:1120;
 const stage={id:'bench-stage',asset:'props/workbench',
   sha256:art(pack,'props/workbench').sha256,
   x:benchX,y:860,z:-1,scale:1.2};
 const film:GeneralFilm={schemaVersion:'general-film/1',frames:128,
   tracks:[{contact:{schemaVersion:'general-contact/1',
     actor:{id:'actor-hero',model,rigId:'production-cutout-1',
       x:rootX,floor:860,facing:1,scale:1},
     object:{id:'hero-prop',asset:prop,sha256:art(pack,prop).sha256,
       x:objectX,y:631,scale,anchor:'grip'},
     hand,camera:{x:960,y:540,zoom:1}},
     keys:[{frame:0,dx:0,dy:0,headAngle:0},
       {frame:23,dx:0,dy:-8,headAngle:-3},
       {frame:48,dx:0,dy:-objectLift,headAngle:7},
       {frame:127,dx:0,dy:-objectLift,headAngle:7}]}],
   stage:[stage],camera:[{frame:0,x:960,y:540,zoom:1},
     {frame:127,x:953,y:538,zoom:1.05}]};
 return {schemaVersion:'native-director/1',
   title:cup?'An releases a cup':'Mai releases a lantern',
   script:cup?'An raises a cup and lets it land on the workbench.':
     'Mai lifts a lantern with her left hand and releases it to the workbench.',
   style:'multiplane',storyboard:{engine:'g3',film,
     releases:[{actorId:'actor-hero',frame:64,stageId:stage.id,
       settleFrames:24,collider:{kind:'box',halfWidthPx:cup?22:32},
       physics:{massKg:cup?.45:.8,restitution:.04,friction:.8,gravityMps2:9.81}}]}};
};
const makeInput=(pack:ArtPack,id:string):NativeDirectorInput=>{
 if(id==='01-an-right-cup-drop')return makeG3(pack,'cup');
 if(id==='02-mai-left-lantern-drop')return makeG3(pack,'lantern');
 const modes:{
   [key:string]:{mode:'mai-wave'|'an-walk'|'mai-left-cup'|'an-right-lantern';script:string};
 }={
   '03-mai-wave-turn':{mode:'mai-wave',script:'Mai waves and turns her head toward a visitor.'},
   '04-an-walk-wave-turn':{mode:'an-walk',script:'An walks across the stage, pauses, waves and turns to look aside.'},
   '05-mai-left-cup-place':{mode:'mai-left-cup',script:'Mai studies the cup then lifts and replaces it with her left hand.'},
   '06-an-right-lantern-place':{mode:'an-right-lantern',script:'An turns to a lantern, raises it and lowers it carefully.'},
 };
 const config=modes[id];
 if(!config)throw Error('NATIVE_DIRECTOR_UNSUPPORTED_SCENARIO '+id);
 return {schemaVersion:'native-director/1',title:id,
   script:config.script,style:'paper-cut',
   storyboard:{engine:'m3',project:makeM3(pack,config.mode)}};
};
const ids=['01-an-right-cup-drop','02-mai-left-lantern-drop',
 '03-mai-wave-turn','04-an-walk-wave-turn',
 '05-mai-left-cup-place','06-an-right-lantern-place'];
const {pack,sha256}=await nativeArt();
await mkdir(out,{recursive:true});
const evidence=[];
for(const id of ids){
 const input=makeInput(pack,id),plan=planNativeDirector(input,pack,sha256);
 const saved=await saveNativePlan(plan,out,pack,sha256);
 const reread=await reopenNativePlan(saved,pack,sha256);
 if(reread.planSha256!==plan.planSha256)throw Error('NATIVE_DEMO_REOPEN_STALE');
 const receipt=await executeNativeDirector(saved,out);
 const rerun=await executeNativeDirector(saved,out);
 if(rerun.mediaSha256!==receipt.mediaSha256||rerun.attemptId!==receipt.attemptId)
   throw Error('NATIVE_DEMO_NON_IDEMPOTENT_JOB');
 const published=path.relative(out,path.join(out,'jobs',plan.planSha256,'published'));
 evidence.push({id,engine:input.storyboard.engine,character:
   input.storyboard.engine==='m3'?input.storyboard.project.character.model:
   input.storyboard.film.tracks[0]!.contact.actor.model,
   planFile:path.relative(out,saved),published,planSha256:plan.planSha256,
   inputSha256:plan.inputSha256,mediaFile:receipt.mediaFile,
   mediaSha256:receipt.mediaSha256,frames:receipt.frames,
   renderer:receipt.executor,attemptId:receipt.attemptId,
   nativeManifestSha256:receipt.nativeManifestSha256});
 console.log('NATIVE_DIRECTOR_FILM_READY '+id+' '+receipt.mediaSha256);
}
const overview={schemaVersion:'native-director-six/1',
 sourceCommit:process.env.SOURCE_HEAD_SHA??process.env.GITHUB_SHA??'UNVERIFIED',
 status:'PENDING_INDEPENDENT_SECOND_AUDIT_AND_OWNER_ART_REVIEW',
 artPackSha256:sha256,scenarios:evidence,
 limitations:['Only two SHA-pinned supported cutout rigs and their compatible props',
   'Narrative scripts label authored storyboards: arbitrary natural language not parsed',
   'No claim of production-grade voice, lip sync or human artistic approval']};
await writeFile(path.join(out,'six-overview.json'),JSON.stringify(overview,null,2)+'\n');
console.log('NATIVE_DIRECTOR_SIX_AUTHORED_FILMS '+JSON.stringify({
 scenarios:ids,output:out,source:overview.sourceCommit}));
