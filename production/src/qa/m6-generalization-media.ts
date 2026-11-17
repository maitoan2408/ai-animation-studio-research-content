/** M6 generalized production proof: three unrelated new native projects,
 * two native A/B movies each. Exact SHA-bound local media is independently
 * decoded and reviewed, never fabricated from saved benchmark frames.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync,spawn} from 'node:child_process';
import {once} from 'node:events';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {makeM3Showcase,validateM3,m3TotalFrames,type M3Project}
  from '../motion/character-library.js';
import {requireNativeVisualPass} from './native-visual-gate.js';
import type {ArtPack} from '../scene/types.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const output=process.env.M6_GENERAL_OUTPUT_DIR
 ?path.resolve(process.env.M6_GENERAL_OUTPUT_DIR)
 :path.join(root,'out/product-first/m6-generalization');
const sha=(v:Uint8Array|string)=>createHash('sha256').update(v).digest('hex');
const run=(exe:string,args:string[])=>{
 const x=spawnSync(exe,args,{encoding:'utf8',maxBuffer:16*1024*1024});
 if(x.error||x.status!==0)throw Error('M6_GENERAL_MEDIA_COMMAND: '+exe+' '+String(x.stderr||x.error));
 return x.stdout;
};
const pack=JSON.parse(await readFile(path.join(root,'assets/lantern-v1/manifest.json'),'utf8')) as ArtPack;
const asset=(id:string)=>{
 const found=pack.assets.find(a=>a.id===id);
 if(!found)throw Error('M6_GENERAL_ART_NOT_FOUND '+id);
 return found;
};
function project(name:string):M3Project{
 const p=structuredClone(makeM3Showcase(pack,'original-actor','an'));
 if(name==='left-cup'){
  p.character.id='left-scenario';p.character.model='mai';p.character.xStart=840;
  p.character.capabilities=['turn-head','pick-place'];
  p.clips=[{action:'turn-head',frames:49},{action:'pick-place',frames:73}];
  p.prop={id:'scene-prop',asset:'props/cup',sha256:asset('props/cup').sha256,
    x:720,y:631,scale:.7,hand:'left'};
 }else if(name==='right-lantern'){
  p.character.id='lantern-scenario';p.character.model='an';p.character.xStart=840;
  p.character.capabilities=['turn-head','pick-place'];
  p.clips=[{action:'turn-head',frames:49},{action:'pick-place',frames:73}];
  p.prop={id:'scene-prop',asset:'props/lantern-dark',
    sha256:asset('props/lantern-dark').sha256,
    x:940,y:700,scale:.65,hand:'right'};
 }else if(name==='no-prop-performance'){
  p.character.id='solo-scenario';p.character.model='mai';p.character.xStart=880;
  p.character.capabilities=['wave','turn-head'];
  p.clips=[{action:'wave',frames:49},{action:'turn-head',frames:49}];
  delete p.prop;
 }else throw Error('M6_GENERAL_SCENARIO_UNKNOWN');
 return validateM3(p,pack);
}
type Receipt={name:string;frames:number;baselineSha256:string;enhancedSha256:string;
 changedFrames:number;gripSide:string|null;propAsset:string|null;warningCount:number};
await mkdir(output,{recursive:true});
const receipts:Receipt[]=[];
let frameNumber=0;
for(const name of ['left-cup','right-lantern','no-prop-performance']){
 const authored=project(name),json=JSON.stringify(authored,null,2)+'\n';
 const projectFile=path.join(output,name+'.json');
 await writeFile(projectFile,json);
 const observations:{mode:'baseline'|'enhanced';manifest:any;film:string}[]=[];
 for(const mode of ['baseline','enhanced'] as const){
  const folder=path.join(output,name,mode);
  await mkdir(folder,{recursive:true});
  const child=spawn(process.execPath,['--import','tsx',
    path.join(root,'src/render/render-m3.ts')],{
      cwd:root,stdio:'inherit',env:{...process.env,M6_QUALITY_MODE:mode,
        M3_PROJECT_FILE:projectFile,M3_OUTPUT_DIR:folder,
        HYPERFRAMES_NO_TELEMETRY:'1'},
  });
  const [status]=await once(child,'close');
  if(status!==0)throw Error('M6_GENERAL_RENDER_FAILED '+name+' '+mode+' '+status);
  const manifest=JSON.parse(await readFile(path.join(folder,'manifest.json'),'utf8'));
  const movie=path.join(folder,manifest.video.file);
  assert.equal(manifest.sourceCommit,process.env.SOURCE_HEAD_SHA??'LOCAL_UNPINNED');
  assert.equal(manifest.milestone,'M6');assert.equal(manifest.qualityMode,mode);
  assert.equal(manifest.video.frames,m3TotalFrames(authored));
  assert.equal(manifest.video.width,1920);assert.equal(manifest.video.height,1080);
  assert.equal(manifest.video.fps,24);assert.equal(manifest.video.hasAudio,false);
  assert.equal(manifest.video.sha256,sha(await readFile(movie)));
  assert.equal(manifest.project.sha256,sha(json));
  const gate=requireNativeVisualPass(authored,pack,mode);
  const archived=JSON.parse(await readFile(path.join(folder,'native-visual-gate.json'),'utf8'));
  assert.deepEqual(archived.metrics,gate.metrics);
  const info=JSON.parse(run('ffprobe',['-v','error','-count_frames',
    '-show_streams','-of','json',movie]));
  const stream=info.streams.find((s:any)=>s.codec_type==='video');
  assert.equal(Number(stream.nb_read_frames),m3TotalFrames(authored));
  assert.equal(stream.avg_frame_rate,'24/1');
  run('ffmpeg',['-v','error','-xerror','-nostdin','-threads','1','-i',movie,'-f','null','-']);
  for(const [still,digest] of Object.entries(manifest.nativeFrames)){
   assert.equal(sha(await readFile(path.join(folder,still))),digest);
  }
  observations.push({mode,manifest,film:movie});
  // These are real encoded film frames, not model or illustrative frames.
  const pick=authored.prop?authored.clips[0]!.frames+Math.round((authored.clips[1]!.frames-1)*.5):24;
  run('ffmpeg',['-v','error','-xerror','-y','-i',movie,
    '-vf','select=eq(n\\,'+pick+'),scale=640:360','-frames:v','1',
    path.join(output,'comparison-'+String(frameNumber++).padStart(2,'0')+'.png')]);
 }
 const a=observations[0]!,b=observations[1]!;
 assert.equal(a.manifest.project.sha256,b.manifest.project.sha256);
 assert.equal(a.manifest.video.frames,b.manifest.video.frames);
 assert.deepEqual(a.manifest.constraints.actions,b.manifest.constraints.actions);
 const changed=b.manifest.frameHashes.filter((digest:string,i:number)=>
   digest!==a.manifest.frameHashes[i]).length;
 assert.ok(changed>Math.max(8,Math.floor(m3TotalFrames(authored)/10)),
   'M6 enhancement not visibly changing actual native frames: '+name);
 receipts.push({name,frames:m3TotalFrames(authored),
   baselineSha256:a.manifest.video.sha256,enhancedSha256:b.manifest.video.sha256,
   changedFrames:changed,gripSide:authored.prop?.hand??(authored.prop?'right':null),
   propAsset:authored.prop?.asset??null,
   warningCount:requireNativeVisualPass(authored,pack,'enhanced').metrics.warningCount});
}
run('ffmpeg',['-v','error','-xerror','-y','-framerate','1',
 '-i',path.join(output,'comparison-%02d.png'),
 '-vf','tile=2x3','-frames:v','1',path.join(output,'visual-ab-3-scenarios.png')]);
const sheet=path.join(output,'visual-ab-3-scenarios.png');
const result={schemaVersion:'m6-generalization-audit/1',
 status:'PASS_TECHNICAL_ONLY',sourceCommit:process.env.SOURCE_HEAD_SHA??'LOCAL_UNPINNED',
 scenarios:receipts,contactSheet:{file:path.basename(sheet),sha256:sha(await readFile(sheet))},
 checks:['three distinct editable authoring inputs',
 'two cutout character models','left and right hand', 'two grip-capable art assets',
 'no-prop gestures','six real encoded 1920x1080 24fps movies',
 'full FFprobe frame-count and independent FFmpeg decode',
 'every-frame art anchor, grip depth and foot-plant check',
 'random native seek and true media frame SHA receipt via render-m3',
 'pairwise changed native pixels from same project/camera'],
 limits:['No arbitrary user-uploaded rig or art retargeting',
 'No arbitrary scene choreography or artistic acting approval',
 'M4 Rapier stays bounded to right-hand cup; do not silently auto-apply to other objects',
 'Native path does not automatically replace root M5 Director M2 video',
 'No 3D cloth/hair, final production voice, or automatic lip sync']};
await writeFile(path.join(output,'generalization-audit.json'),JSON.stringify(result,null,2)+'\n');
console.log('M6_GENERALIZED_REAL_MEDIA_AUDIT_PASS '+JSON.stringify({
 sourceCommit:result.sourceCommit,scenarios:receipts,contactSheet:result.contactSheet}));
