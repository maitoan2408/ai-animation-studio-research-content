/** Post-production second-pass QA of six real Director native films, independent
 * of the executor publication flags. Source/art/SHA/FFmpeg/decode/contact data.
 * Any failure stops the job; no aesthetic self-certification is issued.
 */
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile,writeFile,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {root} from '../render/server.js';
import {nativeArt,reopenNativePlan,type NativeDirectorReceipt} from './native-director.js';
import {validateGeneralPlayback} from '../motion/general-playback-validate.js';
import {sampleGeneralPlayback} from '../motion/general-playback.js';
import {auditFrame} from '../qa/general-scene-quality.js';
import {requireNativeVisualPass} from '../qa/native-visual-gate.js';
import {m3TotalFrames} from '../motion/character-library.js';
const sha=(x:Uint8Array|string)=>createHash('sha256').update(x).digest('hex');
const output=path.resolve(process.env.NATIVE_DIRECTOR_OUTPUT_DIR??
 path.join(root,'out/product-first/m6-native-director-six'));
const run=(cmd:string,args:string[])=>{
 const p=spawnSync(cmd,args,{encoding:'utf8',maxBuffer:16*1024*1024,timeout:600000});
 if(p.error||p.status!==0)
   throw Error('NATIVE_AUDIT_COMMAND_FAILED '+cmd+' '+String(p.error??p.stderr).slice(-1000));
 return p.stdout;
};
const safe=(relative:string)=>{
 const absolute=path.resolve(output,relative);
 if(!absolute.startsWith(output+path.sep))
   throw Error('NATIVE_AUDIT_PATH_ESCAPE');
 return absolute;
};
type Index={sourceCommit:string;artPackSha256:string;
 scenarios:Array<{id:string;planFile:string;published:string;planSha256:string;
  inputSha256:string;frames:number;mediaFile:string;mediaSha256:string;
  nativeManifestSha256:string;renderer:string;attemptId:string}>};
const overview=JSON.parse(await readFile(path.join(output,'six-overview.json'),'utf8')) as Index;
assert.equal(overview.scenarios.length,6,'NATIVE_AUDIT_SIX_PROJECTS_REQUIRED');
assert.equal(new Set(overview.scenarios.map(s=>s.id)).size,6);
if(overview.sourceCommit!==process.env.SOURCE_HEAD_SHA)
 throw Error('NATIVE_AUDIT_SOURCE_SHA_UNKNOWN_OR_STALE');
const {pack,sha256:artSha}=await nativeArt();
assert.equal(overview.artPackSha256,artSha);
const seenMedia=new Set<string>();
const results=[];
for(const [i,item] of overview.scenarios.entries()){
 const plan=await reopenNativePlan(safe(item.planFile),pack,artSha);
 assert.equal(item.planSha256,plan.planSha256);
 assert.equal(item.inputSha256,plan.inputSha256);
 const folder=safe(item.published);
 const receiptBytes=await readFile(path.join(folder,'native-director-receipt.json'));
 const receipt=JSON.parse(receiptBytes.toString()) as NativeDirectorReceipt;
 assert.equal(receipt.schemaVersion,'native-director-receipt/1');
 assert.equal(receipt.status,'succeeded');
 assert.equal(receipt.planSha256,plan.planSha256);
 assert.equal(receipt.inputSha256,plan.inputSha256);
 assert.equal(receipt.artPackSha256,artSha);
 assert.equal(receipt.attemptId,item.attemptId);
 assert.equal(receipt.executor,item.renderer);
 assert.equal(receipt.mediaFile,item.mediaFile);
 assert.equal(receipt.mediaSha256,item.mediaSha256);
 assert.equal(receipt.nativeManifestSha256,item.nativeManifestSha256);
 assert.equal(receipt.frames,item.frames);
 assert.equal(receipt.width,1920);
 assert.equal(receipt.height,1080);
 assert.equal(receipt.fps,24);
 const manifestBytes=await readFile(path.join(folder,'manifest.json'));
 assert.equal(sha(manifestBytes),receipt.nativeManifestSha256);
 const manifest=JSON.parse(manifestBytes.toString());
 assert.equal(manifest.video.sha256,receipt.mediaSha256);
 assert.equal(manifest.video.file,receipt.mediaFile);
 assert.equal(manifest.video.frames,item.frames);
 assert.equal(manifest.video.width,1920);
 assert.equal(manifest.video.height,1080);
 assert.equal(manifest.video.fps,24);
 assert.equal(manifest.sourceCommit,process.env.SOURCE_HEAD_SHA);
 const file=path.join(folder,receipt.mediaFile);
 const bytes=await readFile(file);
 assert.equal(sha(bytes),receipt.mediaSha256,'MEDIA_BYTES_CHANGED '+item.id);
 assert.ok(bytes.length>50000,'NATIVE_MOVIE_TOO_SMALL '+item.id);
 assert.ok(!seenMedia.has(receipt.mediaSha256),'NATIVE_MOVIE_DUPLICATE '+item.id);
 seenMedia.add(receipt.mediaSha256);
 const probe=JSON.parse(run('ffprobe',['-v','error','-count_frames',
   '-show_streams','-show_format','-of','json',file])) as {
   streams:Array<{codec_type:string;width:number;height:number;
     avg_frame_rate:string;nb_read_frames:string}>;
   format:{duration:string};
 };
 const video=probe.streams.find(s=>s.codec_type==='video');
 const audio=probe.streams.find(s=>s.codec_type==='audio');
 assert.equal(video?.width,1920);
 assert.equal(video?.height,1080);
 assert.equal(video?.avg_frame_rate,'24/1');
 assert.equal(video?.nb_read_frames,String(item.frames));
 assert.equal(audio,undefined,'NATIVE_DEMO_AUDIO_NOT_AUTHORED');
 assert.ok(Math.abs(Number(probe.format.duration)-item.frames/24)<.08);
 run('ffmpeg',['-v','error','-xerror','-nostdin','-threads','1','-i',
   file,'-f','null','-']);
 assert.equal(manifest.frameHashes.length,item.frames);
 assert.equal(manifest.stateHashes.length,item.frames);
 const checks=Object.entries(manifest.stills??manifest.nativeFrames??{}) as [string,string][];
 assert.ok(checks.length>=7);
 for(const [image,digest] of checks){
   assert.match(image,/^(?:frame-[0-9]{3}|m3-final-frame-[0-9]{3})\.png$/);
   const data=await readFile(path.join(folder,image));
   assert.equal(sha(data),digest);
 }
 const sheet=manifest.contactSheet?.file??manifest.contacts?.file;
 if(sheet){
   const sheetBytes=await readFile(path.join(folder,sheet));
   assert.equal(sha(sheetBytes),manifest.contactSheet?.sha256??manifest.contacts?.sha256);
 }
 if(plan.input.storyboard.engine==='g3'){
   assert.equal(receipt.executor,'native-g3-rapier');
   const source=await readFile(path.join(folder,'source-playback.json'));
   assert.equal(sha(source),manifest.sourceSha256);
   const playback=validateGeneralPlayback(JSON.parse(source.toString()),pack);
   assert.equal(playback.film.frames,item.frames);
   for(const release of playback.releases){
     assert.ok(release.bake.contacts.length>0,'NATIVE_AUDIT_NO_IMPACT');
     for(const q of release.bake.frames){
       assert.ok(Number.isFinite(q.centerX)&&Number.isFinite(q.centerY));
     }
   }
   for(let frame=0;frame<item.frames;frame++){
     const sample=sampleGeneralPlayback(playback,frame,pack);
     assert.deepEqual(auditFrame(sample.frame,pack,{frame,contacts:sample.contacts}),[],
       'NATIVE_AUDIT_VISUAL_CONTACT_FRAME_'+frame);
   }
 }else{
   assert.equal(receipt.executor,'native-m3');
   const p=plan.input.storyboard.project;
   assert.equal(m3TotalFrames(p),item.frames);
   assert.equal(manifest.project.sha256,
     sha(JSON.stringify(p,null,2)+'\n'));
   const gate=requireNativeVisualPass(p,pack,'enhanced');
   assert.equal(gate.metrics.errorCount,0);
 }
 const thumb=path.join(output,'review-'+String(i+1).padStart(2,'0')+'.png');
 run('ffmpeg',['-v','error','-xerror','-y','-i',file,'-vf',
   'select=eq(n\\,'+Math.floor((item.frames-1)/2)+'),scale=640:360',
   '-frames:v','1',thumb]);
 results.push({id:item.id,engine:receipt.executor,frames:item.frames,
   durationSec:item.frames/24,sha256:receipt.mediaSha256,
   bytes:bytes.length,contactValidated:true,fullyDecoded:true});
}
const sheet=path.join(output,'six-film-contact-sheet.png');
run('ffmpeg',['-v','error','-xerror','-y',
 '-framerate','1','-i',path.join(output,'review-%02d.png'),
 '-vf','tile=3x2','-frames:v','1',sheet]);
const sheetBytes=await readFile(sheet);
const report={schemaVersion:'native-director-second-audit/1',
 status:'TECHNICAL_EVIDENCE_READY_FOR_ARTISTIC_REVIEW',
 sourceCommit:overview.sourceCommit,filmCount:6,
 renderers:[...new Set(results.map(r=>r.engine))],films:results,
 sheet:{file:path.basename(sheet),sha256:sha(sheetBytes)},
 checks:['six unrelated native sources and persisted editable plans',
  'source SHA / asset pack SHA / revision / executor receipt provenance',
  'actual ffprobe dimensions, fps, duration, frames and no unintended voice',
  'full independent FFmpeg decode of every actual media stream',
  'actual native stills and contact-sheet byte SHA verification',
  'frame-by-frame G3 contact/physics provenance and M3 visual frame preflight',
  'no reused identical movie file'],
 limitations:['Rendered video appearance and motion quality require owner playback review',
   'Only supported authored rigs, interactions and shapes',
   'No natural-language script interpretation, voice, facial sync or audio master']};
await writeFile(path.join(output,'six-independent-audit.json'),
 JSON.stringify(report,null,2)+'\n');
console.log('SIX_FILMS_SECOND_PASS_TECHNICAL_AUDIT '+JSON.stringify({
 source:report.sourceCommit,files:report.filmCount,sheet:report.sheet}));
