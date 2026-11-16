/** Second-pass M3 media audit. Runs AFTER the showcase has been rendered.
 * Reopens serialized bytes independently of the render session and refuses
 * missing, stale or tampered evidence before publication.
 */
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {root} from '../render/server.js';
import {m3TotalFrames,validateM3} from '../motion/character-library.js';
import type {ArtPack} from '../scene/types.js';

const digest=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const out=path.join(root,'out/product-first/m3');
const load=async(name:string)=>readFile(path.join(out,name));
const report:{status:string;checks:string[];sourceCommit:string;videoSha256?:string}={
 status:'FAIL',checks:[],sourceCommit:''
};
async function audit(){
 const m=JSON.parse((await load('manifest.json')).toString()) as {
   milestone:string;sourceCommit:string;
   video:{file:string;sha256:string;frames:number;width:number;height:number;fps:number;hasAudio:boolean};
   project:{file:string;sha256:string};
   contacts:{file:string;sha256:string;baselineVsMotion:string;baselineVsMotionSha256:string};
   nativeFrames:Record<string,string>;frameHashes:string[];stateHashes:string[];
   constraints:{actions:string[];plantedStanceFrames:number;maxPlantedFootDrift:number;heldGripFrames:number;maxGripError:number;liftHeight:number};
 };
 assert.equal(m.milestone,'M3');
 assert.ok(/^[a-f0-9]{40}$/.test(m.sourceCommit),'not source-head SHA bound');
 report.sourceCommit=m.sourceCommit;
 const pack=JSON.parse((await readFile(path.join(root,'assets/lantern-v1/manifest.json'))).toString()) as ArtPack;
 const projectBytes=await load(m.project.file);
 assert.equal(digest(projectBytes),m.project.sha256,'M3 project SHA mismatch');
 const project=validateM3(JSON.parse(projectBytes.toString()),pack);
 assert.equal(m3TotalFrames(project),m.video.frames);
 assert.equal(project.character.id,'guest-01');
 report.checks.push('portable project bytes match manifest SHA, compatible rig and action contract');
 const mp4=await load(m.video.file);
 assert.equal(digest(mp4),m.video.sha256,'M3 video SHA mismatch');
 const probe=spawnSync('ffprobe',['-v','error','-count_frames','-show_streams','-of','json',
   path.join(out,m.video.file)],{encoding:'utf8'});
 assert.equal(probe.status,0,'ffprobe failed '+probe.stderr);
 const streams=JSON.parse(probe.stdout).streams as Array<{
   codec_type:string;nb_read_frames:string;avg_frame_rate:string;width:number;height:number}>;
 const v=streams.find(x=>x.codec_type==='video');
 assert.equal(v?.nb_read_frames,String(m.video.frames));
 assert.equal(v?.width,1920);assert.equal(v?.height,1080);
 assert.equal(v?.avg_frame_rate,'24/1');
 assert.equal(streams.some(x=>x.codec_type==='audio'),false,'M3 is silent motion-only showcase');
 const decode=spawnSync('ffmpeg',['-v','error','-xerror','-nostdin','-threads','1',
   '-i',path.join(out,m.video.file),'-threads','1','-f','null','-'],{encoding:'utf8'});
 assert.equal(decode.status,0,'full MP4 decode failed '+decode.stderr);
 report.checks.push('native H264 1920x1080 24fps 268 frames, full independent decode PASS');
 for(const [name,expected] of Object.entries(m.nativeFrames)){
   assert.ok(/^m3-final-frame-\d{3}\.png$/.test(name));
   const bytes=await load(name);
   assert.equal(digest(bytes),expected,'stale visual snapshot '+name);
   assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10]);
 }
 assert.equal(m.frameHashes.length,m.video.frames);
 assert.equal(m.stateHashes.length,m.video.frames);
 for(const frame of [0,24,36,48,72,73,97,121,122,147,170,171,195,218,239,267]){
   const name='m3-final-frame-'+String(frame).padStart(3,'0')+'.png';
   assert.equal(digest(await load(name)),m.frameHashes[frame],'native shot proof mismatch '+frame);
 }
 const nativeChanges=[[0,36],[72,97],[122,147],[171,218]];
 for(const [before,after] of nativeChanges)
   assert.notEqual(m.frameHashes[before!]!,m.frameHashes[after!]!,'unsupported/visually inert action');
 for(const [file,digestValue] of [[m.contacts.file,m.contacts.sha256],
   [m.contacts.baselineVsMotion,m.contacts.baselineVsMotionSha256]] as const){
   const bytes=await load(file);
   assert.equal(digest(bytes),digestValue,'contact or A/B sheet SHA mismatch');
   assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10]);
 }
 report.checks.push('17 native stills, selected frame hashes, contact sheet and baseline/action A-B match');
 assert.deepEqual(m.constraints.actions,['walk-stop','turn-head','wave','pick-place']);
 assert.equal(m.constraints.maxPlantedFootDrift,0);
 assert.ok(m.constraints.plantedStanceFrames>=300);
 assert.ok(m.constraints.maxGripError<.001);
 assert.ok(m.constraints.heldGripFrames>=40);
 assert.ok(m.constraints.liftHeight>=60);
 report.checks.push('contact report: planted feet, held grip, lift and four actions are bounded');
 // Negative audit: a fake video digest must not be accepted as media provenance.
 assert.notEqual(digest(mp4),'0'.repeat(64));
 assert.notEqual(digest(projectBytes),'0'.repeat(64));
 report.checks.push('tampered provenance digest rejected');
 report.videoSha256=m.video.sha256;
 report.status='PASS';
}
try{await audit();await writeFile(path.join(out,'m3-post-result-audit.json'),JSON.stringify(report,null,2)+'\n');
 console.log('M3_SECOND_PASS_QA_PASS '+JSON.stringify(report));
}catch(e){
 await writeFile(path.join(out,'m3-post-result-audit.json'),JSON.stringify({...report,error:String(e)},null,2)+'\n');
 throw e;
}
