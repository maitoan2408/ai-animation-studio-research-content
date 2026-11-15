/** An isolated, alpha-gated S05 variation. Never replaces the baseline. */
import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { heroFrame } from './hero.js';
import { heroPhysics } from '../physics/recipe.js';
import { validateBake } from '../physics/bake.js';
import { validateAlphaGate } from '../continuity/alpha-gate.js';
import type { SceneFrame } from '../scene/types.js';
import { inspectHeroGround } from '../continuity/hero-ground.js';
const root = fileURLToPath(new URL('../../', import.meta.url));
const run = promisify(execFile);
const sha = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');
const [sourceArgument, intensityArgument] = process.argv.slice(2);
if (!sourceArgument || !intensityArgument || !/^(0(?:\.\d+)?|1(?:\.0+)?)$/.test(intensityArgument)) throw Error('F3_ARGUMENTS');
const intensity = Number(intensityArgument);
if (!Number.isFinite(intensity) || intensity < 0 || intensity > 1) throw Error('F3_INTENSITY');
const sourcePath = path.resolve(sourceArgument), folder = path.dirname(sourcePath);
const bytes = await readFile(sourcePath), source = JSON.parse(bytes.toString());
validateAlphaGate(JSON.parse(await readFile(path.join(folder, 'alpha-critic.json'), 'utf8')), sha(bytes));
if (source.shot !== 'S05' || source.fps !== 24 || source.frames.length !== 192 || source.edit.qualityCandidate !== 'f2-overlay-baseline') throw Error('F3_SOURCE');
const input = JSON.parse(await readFile(path.join(folder, 'input.json'), 'utf8'));
const bake = validateBake(JSON.parse(await readFile(path.join(folder, 'bake.json'), 'utf8')));
const frames: SceneFrame[] = [];
for (let i = 0; i < 192; i++) {
  if (JSON.stringify(heroFrame(source.pack, input, bake, i)) !== JSON.stringify(source.frames[i])) throw Error(`F3_BASELINE_MISMATCH ${i}`);
  frames.push(heroFrame(source.pack, input, bake, i, heroPhysics, intensity));
}
const fixture = JSON.parse(await readFile(path.join(root, 'brief/quality/ground-fixture.json'), 'utf8'));
const ground = inspectHeroGround(source.pack, fixture, f => frames[f]!);
if (ground.status !== 'PASS') throw Error('F3_GROUND_FAILED');
const out = path.join(root, 'out/f3-emphasis', randomUUID());
await mkdir(out, { recursive: true });
try {
  const payload = JSON.stringify({ ...source, edit: { ...source.edit, qualityCandidate: 'f3-head-emphasis', headEmphasis: intensity }, frames });
  const pending = path.join(out, 'S05.pending.json');
  await writeFile(pending, payload, { flag: 'wx' });
  const { stdout } = await run('python3', [path.join(root, 'src/continuity/alpha_overlap.py'), pending], { timeout: 120000, maxBuffer: 4 * 1024 * 1024 });
  const alpha = JSON.parse(stdout);
  await writeFile(path.join(out, 'alpha-critic.json'), JSON.stringify(alpha, null, 2) + '\n');
  validateAlphaGate(alpha, sha(payload));
  await writeFile(path.join(out, 'ground-critic.json'), JSON.stringify(ground, null, 2) + '\n');
  await rename(pending, path.join(out, 'S05.json'));
  const report = { status: 'PROVISIONAL_F3_HEAD_EMPHASIS', sourceSha256: sha(bytes), outputSha256: sha(payload), intensity, frames: 192,
    limits: ['head-only variation; not full F3 or six actions', 'ground/alpha tests have bounded fixture coverage', 'no acting approval'] };
  await writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ output: out, ...report }));
} catch (error) {
  await writeFile(path.join(out, 'failure.json'), JSON.stringify({ status: 'FAIL', error: String(error) }) + '\n');
  throw error;
}
