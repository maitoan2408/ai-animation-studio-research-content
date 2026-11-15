/** Private scene worker. Parent Studio owns project state and serializes jobs;
 * this process reads validated immutable spec and audio assets, renders exactly
 * one bounded scene, writes QC receipt, then exits to release native memory.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { Store } from './store.js';
import { parseSpec, profileSchema } from './domain.js';
import { renderVideo } from './render.js';

const [root, specFile, profileArg, dir] = process.argv.slice(2);
if (!root || !specFile || !profileArg || !dir) throw Error('SEGMENT_WORKER_ARGS');
const profile = profileSchema.parse(profileArg);
const store = new Store(root);
await store.init();
const spec = parseSpec(JSON.parse(await readFile(specFile, 'utf8')));
if (spec.scenes.length !== 1 || spec.scenes[0]!.durationFrames > 360)
  throw Error('SEGMENT_WORKER_UNSUPPORTED_SHOT');
await mkdir(dir, { recursive: true });
const result = await renderVideo(
  store, spec, profile, dir, new AbortController().signal,
  async () => {},
);
if (path.resolve(result.file) !== path.resolve(dir, 'output.mp4'))
  throw Error('SEGMENT_OUTPUT_PATH_CHANGED');
await writeFile(path.join(dir, 'segment-qc.json'), JSON.stringify(result.qc, null, 2) + '\n');
console.log('SEGMENT_DONE ' + JSON.stringify({frames:result.qc.frames, profile}));
