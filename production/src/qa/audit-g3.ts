/**
 * Independent post-result G3 native media and handoff provenance auditor.
 * Fails closed on missing/stale media, missing source, malformed stills,
 * forged contact bakes or an edited physics/platform without new render.
 */
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {root} from '../render/server.js';
import {validateGeneralPlaybackAgainstSolver} from '../motion/general-playback-validate.js';
import {generalFilmFrameContract} from '../motion/general-timeline.js';
import {sampleGeneralPlayback} from '../motion/general-playback.js';
import {auditFrame} from './general-scene-quality.js';
import type {ArtPack} from '../scene/types.js';
const sha=(x:Uint8Array|string)=>createHash('sha256').update(x).digest('hex');
const check=(cmd:string,args:string[])=>{
 const q=spawnSync(cmd,args,{encoding:'utf8',maxBuffer:8*1024*1024});
 if(q.error||q.status!==0)throw Error('G3_INDEPENDENT_DECODE '+cmd+' '+String(q.stderr||q.error));
 return q.stdout;
};
const pack=JSON.parse(await readFile(path.join(root,'assets/lantern-v1/manifest.json'),'utf8')) as ArtPack;
const dir=path.resolve(process.env.G3_REVIEW_DIR??path.join(root,'out/product-first/g3-general-reviews'));
const expected=['g3-an-right-cup','g3-mai-left-lantern'];
const overview=JSON.parse(await readFile(path.join(dir,'g3-overview.json'),'utf8'));
assert.deepEqual(overview.clips.map((x:{id:string})=>x.id),expected);
const verified=[];
for(const id of expected){
 const folder=path.join(dir,id);
 const source=await readFile(path.join(folder,'source-g3-playback.json'));
 const playback=await validateGeneralPlaybackAgainstSolver(JSON.parse(source.toString()),pack);
 const manifest=JSON.parse(await readFile(path.join(folder,'manifest.json'),'utf8'));
 assert.equal(manifest.schemaVersion,'g3-native-motion-physics/1');
 assert.equal(manifest.sourceSha256,sha(source));
 assert.equal(sha(await readFile(path.join(folder,'playback.json'))),sha(source));
 const expectedSource=process.env.SOURCE_HEAD_SHA??process.env.GITHUB_SHA;
 if(expectedSource)assert.equal(manifest.sourceCommit,expectedSource,'G3_MEDIA_SOURCE_STALE');
 assert.equal(manifest.video.file,'g3-motion-physics-1080p.mp4');
 assert.equal(manifest.video.width,1920);
 assert.equal(manifest.video.height,1080);
 assert.equal(manifest.video.fps,24);
 assert.equal(manifest.video.frames,playback.film.frames);
 assert.equal(manifest.video.audio,false);
 assert.equal(manifest.frameHashes.length,playback.film.frames);
 assert.equal(manifest.stateHashes.length,playback.film.frames);
 assert.equal(manifest.releases.length,playback.releases.length);
 for(const [i,r]of playback.releases.entries()){
   assert.equal(manifest.releases[i].frame,r.frame);
   assert.equal(manifest.releases[i].actorId,r.actorId);
   assert.equal(manifest.releases[i].bakeSha256,r.bake.sha256);
   assert.deepEqual(manifest.releases[i].physicalContactFrames,r.bake.contacts);
   assert.ok(r.bake.contacts.length>0);
 }
 const video=await readFile(path.join(folder,manifest.video.file));
 assert.equal(sha(video),manifest.video.sha256);
 const parsed=JSON.parse(check('ffprobe',['-v','error','-count_frames',
   '-show_streams','-show_format','-of','json',path.join(folder,manifest.video.file)])) as {
  streams:Array<{codec_type:string;width:number;height:number;avg_frame_rate:string;nb_read_frames:string}>;
  format:{duration:string};
 };
 assert.equal(parsed.streams.filter(s=>s.codec_type==='video').length,1);
 assert.equal(parsed.streams.filter(s=>s.codec_type==='audio').length,0);
 const stream=parsed.streams.find(s=>s.codec_type==='video');
 assert.equal(stream?.width,1920);assert.equal(stream?.height,1080);
 assert.equal(stream?.avg_frame_rate,'24/1');
 assert.equal(stream?.nb_read_frames,String(playback.film.frames));
 assert.ok(Math.abs(Number(parsed.format.duration)-playback.film.frames/24)<.08);
 check('ffmpeg',['-v','error','-xerror','-nostdin','-threads','1','-i',
   path.join(folder,manifest.video.file),'-f','null','-']);
 const sheet=await readFile(path.join(folder,'contact-sheet.png'));
 assert.equal(sha(sheet),manifest.contactSheet.sha256);
 const keys=Object.keys(manifest.stills as Record<string,string>);
 assert.ok(keys.length>=7);
 for(const file of keys){
   assert.match(file,/^frame-[0-9]{3}\.png$/);
   const n=Number(file.slice(6,9));
   assert.ok(n>=0&&n<playback.film.frames);
   const bytes=await readFile(path.join(folder,file));
   assert.equal(sha(bytes),manifest.stills[file]);
   assert.equal(sha(bytes),manifest.frameHashes[n]);
 }
 for(let f=0;f<playback.film.frames;f++){
   const sample=sampleGeneralPlayback(playback,f,pack);
   const issues=auditFrame(sample.frame,pack,generalFilmFrameContract(playback.film,pack,f,
     playback.releases.filter(r=>f>=r.frame).map(r=>r.actorId)));
   assert.equal(issues.length,0,id+':'+f+':'+JSON.stringify(issues));
 }
 assert.equal(overview.clips.find((x:{id:string})=>x.id===id)?.video.sha256,manifest.video.sha256);
 assert.equal(overview.clips.find((x:{id:string})=>x.id===id)?.sourceSha256,sha(source));
 verified.push({id,frames:playback.film.frames,releaseFrame:playback.releases[0]?.frame,
   contactCount:playback.releases[0]?.bake.contacts.length,sha256:sha(video)});
}
const report={schemaVersion:'g3-independent-review/1',status:'PASS_TECHNICAL_PENDING_OWNER_ART',
 source:'real native 1080p24 MP4 + source + per-frame scene QA',cases:verified,
 limitations:['Physical collision proxies are bounded to authored props',
   'Two grasp/lift/release cases do not certify arbitrary films',
   'Artistic review cannot be replaced by SHA, IK or contact tests']};
await writeFile(path.join(dir,'g3-independent-review.json'),JSON.stringify(report,null,2)+'\n');
console.log('G3_INDEPENDENT_NATIVE_VIDEO_PASS '+JSON.stringify(report));
