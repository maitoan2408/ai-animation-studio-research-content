/** A real segmented render must retain the established machine-readable CLI. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const root = await mkdtemp(path.join(os.tmpdir(), 'studio-long-cli-'));
try {
  const script = path.join(root, 'story.txt');
  await writeFile(script, '[action=wave; seconds=8]\nHello.\n\n[action=walk; seconds=8]\nWalk.');
  const cli = (args: string[]) => {
    const result = spawnSync(
      process.execPath,
      ['dist/cli.js', ...args, '--data', path.join(root, 'data')],
      { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 },
    );
    assert.equal(result.status, 0, String(result.error || result.stderr));
    // Parse the entire stdout, without stripping progress lines to mask bugs.
    return JSON.parse(result.stdout);
  };
  const project = cli(['create', script]);
  const job = cli(['render', project.id, '--profile', 'preview']);
  assert.equal(job.status, 'succeeded');
  const state = cli(['show', project.id]);
  assert.equal(state.artifacts.length, 1);
  assert.equal(state.artifacts[0].qc.frames, 384);
  assert.equal(state.artifacts[0].qc.fps, '24/1');
  assert.equal(state.artifacts[0].qc.width, 640);
  assert.equal(state.artifacts[0].qc.hasAudio, false);
  console.log(
    'PASS compiled CLI long segmented native render -> single JSON response -> verified 384-frame artifact',
  );
} finally {
  await rm(root, { recursive: true, force: true });
}
