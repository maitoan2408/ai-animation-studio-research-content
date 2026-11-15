/** Inspect the declared R2 sequence boundary using the authored R3 scene evaluator. */
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { benchmarkFrame, shotFrames, type Edit } from '../scene/benchmark.js';
import { inspectSceneSeam } from './scene-seam.js';
import type { ArtPack } from '../scene/types.js';
const root = fileURLToPath(new URL('../../', import.meta.url));
const files = ['assets/lantern-polish-1/manifest.json', 'brief/edit-R2-order.json',
  'brief/edit-R3.json', 'src/scene/benchmark.ts', 'src/scene/rig.ts', 'src/scene/geometry.ts', 'src/scene/math.ts', 'src/scene/polish.ts'];
const bytes = await Promise.all(files.map(f => readFile(path.join(root, f))));
const pack = JSON.parse(bytes[0]!.toString()) as ArtPack;
const order = JSON.parse(bytes[1]!.toString()) as string[];
const edit = JSON.parse(bytes[2]!.toString()) as Edit;
if (order.indexOf('S06') < 0 || order.indexOf('S05') !== order.indexOf('S06') + 1)
  throw Error('EDITORIAL_ADJACENCY_CHANGED');
const before = benchmarkFrame(pack, 'S06', shotFrames.S06 - 1, edit);
const after = benchmarkFrame(pack, 'S05', 0, edit);
console.log(JSON.stringify({status:'OBSERVATION_ONLY', sequence:'R2 order with authored R3 scene edit',
  sourceFrames:[{shot:'S06',frame:shotFrames.S06 - 1},{shot:'S05',frame:0}],
  inputHashes:Object.fromEntries(files.map((f,i) => [f,createHash('sha256').update(bytes[i]!).digest('hex')])),
  observations:inspectSceneSeam(before,after,['mai.torso','mai.head','lamp']),
  limitations:['No transition intent or continuity approval inferred',
    'Lamp absent from S06; no owner is inferred from absence',
    'Authored scene evaluator, not a decoded rendered artifact or the secondary physics hero candidate']},null,2));
