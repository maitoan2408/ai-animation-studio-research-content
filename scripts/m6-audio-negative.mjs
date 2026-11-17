/** Adversarial M6 audio postmaster checks on real M5 voice source.
 * Reject malformed profile, output collision and locks without publishing files
 * or mutating the original; old failed evidence remains available in CI logs.
 */
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdtemp,readFile,writeFile,access,rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const source=process.argv[2];
if(!source)throw Error('M6_AUDIO_NEGATIVE_SOURCE_REQUIRED');
const command=path.join(root,'scripts/m6-audio-post.mjs');
const digest=(b)=>createHash('sha256').update(b).digest('hex');
const initial=digest(await readFile(source));
const scratch=await mkdtemp(path.join(path.dirname(path.resolve(source)),'.m6-negative-'));
const absent=async(file)=>{await assert.rejects(access(file),{code:'ENOENT'});};
const invoke=(input,target)=>{
  const call=spawnSync(process.execPath,[command,input,target],{
    cwd:root,encoding:'utf8',maxBuffer:4*1024*1024,
  });
  if(call.status===0)throw Error('M6_AUDIO_UNSAFE_ACCEPT '+target);
  return call.stderr+'\n'+call.stdout;
};
try{
  const target=path.join(scratch,'existing.mp4');
  await writeFile(target,'KEEP_PREVIOUS_VIDEO');
  assert.match(invoke(source,target),/M6_AUDIO_OUTPUT_EXISTS/);
  assert.equal(await readFile(target,'utf8'),'KEEP_PREVIOUS_VIDEO');
  await absent(target+'.quality.json');

  const reportTarget=path.join(scratch,'report-collision.mp4');
  await writeFile(reportTarget+'.quality.json','KEEP_PREVIOUS_REPORT');
  assert.match(invoke(source,reportTarget),/M6_AUDIO_OUTPUT_EXISTS/);
  await absent(reportTarget);
  assert.equal(await readFile(reportTarget+'.quality.json','utf8'),'KEEP_PREVIOUS_REPORT');

  const lockTarget=path.join(scratch,'locked.mp4');
  await writeFile(lockTarget+'.lock','IN_USE');
  assert.match(invoke(source,lockTarget),/M6_AUDIO_OUTPUT_LOCKED/);
  await absent(lockTarget);
  await absent(lockTarget+'.quality.json');
  assert.equal(await readFile(lockTarget+'.lock','utf8'),'IN_USE');

  assert.match(invoke(source,source),/M6_AUDIO_PATH_INVALID/);

  const badVideo=path.join(scratch,'unsupported-profile.mp4');
  const ff=spawnSync('ffmpeg',['-v','error','-nostdin','-y',
    '-f','lavfi','-i','color=c=navy:s=320x180:r=24:d=2',
    '-f','lavfi','-i','sine=frequency=440:sample_rate=48000:duration=2',
    '-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac',
    '-t','2','-shortest',badVideo],{encoding:'utf8'});
  assert.equal(ff.status,0,String(ff.stderr));
  const denied=path.join(scratch,'unsupported-output.mp4');
  assert.match(invoke(badVideo,denied),/M6_AUDIO_INPUT_PROFILE/);
  await absent(denied);
  await absent(denied+'.quality.json');

  assert.equal(digest(await readFile(source)),initial,'original voiced film changed');
  console.log('M6_AUDIO_NEGATIVE_PASS '+JSON.stringify({
    cases:['existing media','existing receipt','render lock','same source path','unsupported video profile'],
    sourceSha256:initial,
  }));
}finally{await rm(scratch,{recursive:true,force:true});}
