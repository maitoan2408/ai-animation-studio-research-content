/** Replay archived R2 selection inputs with today's evaluator. This checks
 * preservation against stored source frames, not two calls to the same new code.
 * Usage: tsx check_handoff_legacy.ts selection.json new-report.json
 */
import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {benchmarkFrame, shotFrames, type ShotId} from '../scene/benchmark.js';

const [selectionPath, reportPath] = process.argv.slice(2);
if (!selectionPath || !reportPath) throw Error('SELECTION_AND_NEW_REPORT_REQUIRED');
const selection = JSON.parse(await readFile(selectionPath, 'utf8')) as Record<ShotId, string>;
assert.deepEqual(Object.keys(selection).sort(), Object.keys(shotFrames).sort());
const rows = [];
for (const shot of Object.keys(shotFrames) as ShotId[]) {
  const bytes = await readFile(path.join(selection[shot], 'inputs.json'));
  const data = JSON.parse(bytes.toString());
  assert.equal(data.frames.length, shotFrames[shot]);
  for (let frame=0; frame<data.frames.length; frame++) {
    // Compare the persisted JSON contract. JSON exports normalize -0 to 0;
    // comparing in-memory -0 against parsed 0 falsely reports changed geometry.
    const persisted = JSON.parse(JSON.stringify(benchmarkFrame(data.pack, shot, frame, data.edit)));
    assert.deepEqual(persisted, data.frames[frame], `${shot}:${frame} legacy changed`);
  }
  rows.push({shot, frames: data.frames.length, inputSha256: createHash('sha256').update(bytes).digest('hex')});
}
const report = {status:'PASS_LEGACY_FRAME_PRESERVATION', frames:1152, rows,
  limits:['Source-frame equality, not an artistic or independent-operator review']};
await writeFile(reportPath, JSON.stringify(report,null,2)+'\n', {flag:'wx'});
console.log(JSON.stringify(report));
