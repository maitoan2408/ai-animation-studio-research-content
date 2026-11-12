/** Known local benchmark voice revisions. Manifest and WAV must agree; cues
 * cannot silently point at an old speech file after an editorial text change. */
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import type {Edit} from '../scene/benchmark.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export async function voiceFixture(edit:Edit={}){
 const dir=path.join(root,edit.voiceTake==='R1'?'artifacts/Q2/edit-R1/voice':'artifacts/Q1/draft-3/voice');
 const manifest=JSON.parse(await readFile(path.join(dir,'manifest.json'),'utf8'));
 const audioPath=path.join(dir,'scene.wav'),bytes=await readFile(audioPath);
 const digest=createHash('sha256').update(bytes).digest('hex');
 if(digest!==manifest.files['scene.wav'])throw Error('VOICE_FIXTURE_HASH');
 if(manifest.request.fps!==24||manifest.request.slotFrames!==192||manifest.request.speechStartFrame!==48)throw Error('VOICE_FIXTURE_TIMING');
 return {manifest,audioPath,sha256:digest};
}
