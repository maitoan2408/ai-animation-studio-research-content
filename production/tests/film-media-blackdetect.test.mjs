import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {existsSync} from 'node:fs';
import {pathToFileURL,fileURLToPath} from 'node:url';

// The Q2 clean-checkout contract archives production/ alone. Exercise the real
// FFmpeg filter there; additionally exercise the root QC module when present.
const rootGate=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../scripts/media-quality-gate.mjs');
const inspectVideo=existsSync(rootGate) ? (await import(pathToFileURL(rootGate).href)).inspectVideo : null;
function blackIntervals(film) {
  const result=spawnSync('ffmpeg',['-hide_banner','-nostdin','-i',film,
    '-vf','blackdetect=d=0.08:pic_th=0.98:pix_th=0.10','-an','-f','null','-'],{encoding:'utf8'});
  assert.equal(result.status,0,'blackdetect must run: '+(result.stderr||result.error));
  return [...result.stderr.matchAll(/black_start:/g)].length;
}

function makeClip(out,color) {
  const command=spawnSync('ffmpeg',[
    '-hide_banner','-v','error','-nostdin','-y',
    '-f','lavfi','-i','color=c='+color+':s=160x90:r=24',
    '-frames:v','12','-threads','1','-c:v','libx264',
    '-pix_fmt','yuv420p',out
  ],{encoding:'utf8'});
  assert.equal(command.status,0,'test clip must encode: '+(command.stderr||command.error));
}

test('media QC: visible nonblack scene must not be mislabeled as a black interval',async(t)=>{
  const dir=await mkdtemp(path.join(tmpdir(),'media-black-gate-'));
  t.after(async()=>rm(dir,{recursive:true,force:true}));
  const film=path.join(dir,'mid-gray.mp4');
  makeClip(film,'0x808080');
  assert.equal(blackIntervals(film),0,'midtone film must not trigger blackdetect');
  if (inspectVideo) {
    const report=await inspectVideo(film,{frames:12,width:160,height:90});
    assert.equal(report.status,'PASS_TECHNICAL_ONLY');
    assert.deepEqual(report.warnings.filter(x=>x.code==='POSSIBLE_BLACK_INTERVAL'),[]);
  }
});

test('media QC: actual black intervals remain visible to the independent reviewer',async(t)=>{
  const dir=await mkdtemp(path.join(tmpdir(),'media-black-gate-'));
  t.after(async()=>rm(dir,{recursive:true,force:true}));
  const film=path.join(dir,'true-black.mp4');
  makeClip(film,'black');
  assert.ok(blackIntervals(film)>0,'real black must remain detectable');
  if (inspectVideo) {
    const report=await inspectVideo(film,{frames:12,width:160,height:90});
    assert.equal(report.status,'PASS_TECHNICAL_ONLY');
    assert.ok(report.warnings.some(x=>x.code==='POSSIBLE_BLACK_INTERVAL'),
      'do not silence a legitimate actual black interval while fixing false positives');
  }
});
