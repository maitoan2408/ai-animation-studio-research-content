/** Seeded standing-life visual fixture, never a replacement for the S05 hero. */
import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { sampleLivingRest } from './living-rest.js';
import { actorSprites } from '../scene/rig.js';
import { polishFrame } from '../scene/polish.js';
import type { SceneFrame } from '../scene/types.js';
import { validateAlphaGate } from '../continuity/alpha-gate.js';
import { inspectHeroGround } from '../continuity/hero-ground.js';
const root = fileURLToPath(new URL('../../', import.meta.url));
const run = promisify(execFile);
const sha = (x: Uint8Array | string) => createHash('sha256').update(x).digest('hex');
const arg = process.argv[2], texturesArg = process.argv[3]; if (!arg || !texturesArg) throw Error('F3_SOURCE_AND_TEXTURES_REQUIRED');
const inputPath = path.resolve(arg), raw = await readFile(inputPath), source = JSON.parse(raw.toString());
validateAlphaGate(JSON.parse(await readFile(path.join(path.dirname(inputPath), 'alpha-critic.json'), 'utf8')), sha(raw));
if (source.shot !== 'S05' || source.fps !== 24 || source.frames.length !== 192 || source.edit.qualityCandidate !== 'f2-overlay-baseline') throw Error('F3_SOURCE_INVALID');
const replacementTextures = JSON.parse(await readFile(path.resolve(texturesArg), 'utf8'));
for (const prior of source.textures.textures) {
 const match = replacementTextures.textures.find((entry: {id:string}) => entry.id === prior.id);
 if (!match || match.sha256 !== prior.sha256 || match.sourceSha256 !== prior.sourceSha256) throw Error(`F3_TEXTURE_REBIND_MISMATCH ${prior.id}`);
}
const baseline: SceneFrame = source.frames[0];
const frames: SceneFrame[] = [];
for (let frame = 0; frame < 192; frame++) {
 const pose = sampleLivingRest(42, frame, 1);
 const actor = actorSprites(source.pack, pose);
 const decorated = polishFrame(source.pack, { ...actor, camera: baseline.camera });
 frames.push({ camera: baseline.camera, sprites: [...baseline.sprites.filter(s => !s.id.startsWith('mai.')), ...decorated.sprites],
  markers: [...baseline.markers.filter(m => !m.id.startsWith('mai.')), ...decorated.markers] });
}
const fixture = JSON.parse(await readFile(path.join(root, 'brief/quality/ground-fixture.json'), 'utf8'));
const ground = inspectHeroGround(source.pack, fixture, f => frames[f]!);
if (ground.status !== 'PASS') throw Error('F3_GROUND_FAILED');
const out = path.join(root, 'out/f3-living-fixture', randomUUID()); await mkdir(out, { recursive: true });
try {
 const payload = JSON.stringify({ ...source, textures: replacementTextures, edit: { ...source.edit, qualityCandidate: 'f3-living-fixture' }, frames });
 const pending = path.join(out, 'S05.pending.json'); await writeFile(pending, payload, { flag: 'wx' });
 const { stdout } = await run('python3', [path.join(root, 'src/continuity/alpha_overlap.py'), pending], { timeout: 120000, maxBuffer: 4 * 1024 * 1024 });
 const alpha = JSON.parse(stdout); await writeFile(path.join(out, 'alpha-critic.json'), JSON.stringify(alpha, null, 2)+'\n');
 validateAlphaGate(alpha, sha(payload)); await writeFile(path.join(out,'ground-critic.json'),JSON.stringify(ground,null,2)+'\n');
 await rename(pending,path.join(out,'S05.json'));
 const report = {status:'PROVISIONAL_LIVING_REST_FIXTURE',output:out,sourceSha256:sha(raw),outputSha256:sha(payload),frames:192,
  limits:['static scene, isolated standing rest only','no gaze, hand acting or hero integration','alpha gate only covers lantern/torso at threshold 128','no art or acting approval']};
 await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n'); console.log(JSON.stringify(report));
} catch (error) { await writeFile(path.join(out,'failure.json'),JSON.stringify({status:'FAIL',error:String(error)})+'\n'); throw error; }
