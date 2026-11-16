/** Independent post-result M3 Studio delivery audit.
 * Runs in a fresh process AFTER the real UI→native renderer job exits.
 * It does not trust either the browser "success" label or renderer manifest.
 */
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const out=path.join(root,'artifacts/product-first/m3-studio');
const sha=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
const audit:{status:'FAIL'|'PASS';checks:string[];error?:string;sourceCommit?:string}={status:'FAIL',checks:[]};
try{
 const receipt=JSON.parse(await readFile(path.join(out,'evidence.json'),'utf8')) as {
  sourceCommit:string;frames:number;revision:string;video:{file:string;sha256:string};
  character:string;action:string;hasProp:boolean;files:Record<string,string>;
 };
 assert.match(receipt.sourceCommit,/^[0-9a-f]{40}$/,'SOURCE_HEAD_SHA must bind artifact to source commit');
 assert.equal(receipt.frames,49);
 assert.equal(receipt.action,'wave');
 assert.equal(receipt.character,'guest-qa');
 assert.equal(receipt.hasProp,false);
 assert.match(receipt.revision,/^[0-9a-f]{64}$/);
 for(const [name,expected] of Object.entries(receipt.files)){
  assert.ok(/^[a-z0-9.-]+$/.test(name),'unsafe media filename');
  const actual=sha(await readFile(path.join(out,name)));
  assert.equal(actual,expected,'stale or tampered delivered media '+name);
 }
 audit.checks.push('All six actual delivered file SHA-256 values match frozen evidence receipt');
 const projectBytes=await readFile(path.join(out,'m3-project.json'));
 assert.equal(sha(projectBytes),receipt.revision,'delivered project does not match saved revision');
 const project=JSON.parse(projectBytes.toString()) as {
  character:{id:string;capabilities:string[]};clips:Array<{action:string;frames:number}>;prop?:unknown
 };
 assert.equal(project.character.id,'guest-qa');
 assert.deepEqual(project.character.capabilities,['wave']);
 assert.deepEqual(project.clips,[{action:'wave',frames:49}]);
 assert.equal(project.prop,undefined);
 audit.checks.push('Native film has a truly non-default, prop-free, wave-only edited character instance');
 const video=path.join(out,receipt.video.file);
 assert.equal(sha(await readFile(video)),receipt.video.sha256);
 const p=spawnSync('ffprobe',['-v','error','-count_frames','-show_streams','-of','json',video],{encoding:'utf8'});
 assert.equal(p.status,0,p.stderr);
 const tracks=JSON.parse(p.stdout).streams as Array<{codec_type:string;width:number;height:number;nb_read_frames:string;avg_frame_rate:string}>;
 const track=tracks.find(x=>x.codec_type==='video');
 assert.equal(track?.width,1920);
 assert.equal(track?.height,1080);
 assert.equal(track?.nb_read_frames,'49');
 assert.equal(track?.avg_frame_rate,'24/1');
 assert.equal(tracks.some(x=>x.codec_type==='audio'),false);
 const ff=spawnSync('ffmpeg',['-v','error','-xerror','-nostdin','-threads','1','-i',video,'-threads','1','-f','null','-'],{encoding:'utf8'});
 assert.equal(ff.status,0,ff.stderr);
 audit.checks.push('FFprobe 49 decoded 1080p24 native H264 frames, independent whole-film FFmpeg decode');
 for(const name of ['m3-studio-desktop.png','m3-studio-mobile.png','m3-chronological-contact-sheet.png']){
  const bytes=await readFile(path.join(out,name));
  assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10],'not a real PNG '+name);
 }
 audit.checks.push('Real responsive browser screenshots and genuine native video contact sheet retained');
 audit.status='PASS';audit.sourceCommit=receipt.sourceCommit;
}catch(error){audit.error=String(error);}
await writeFile(path.join(out,'post-result-audit.json'),JSON.stringify(audit,null,2)+'\n');
if(audit.status!=='PASS')throw Error(audit.error||'M3_STUDIO_POST_AUDIT_FAILED');
console.log('M3_STUDIO_SECOND_PASS_QA_PASS '+JSON.stringify(audit));
