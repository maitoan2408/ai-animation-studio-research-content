/** Fresh OS process, same automated reviewer: persistence, not human handoff. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Studio } from '../src/application.js';
import type { Artifact, ProjectSpec } from '../src/domain.js';

const [root, expectedFile] = process.argv.slice(2);
if (!root || !expectedFile) throw Error('REOPEN_PROOF_ARGS');
const expected = JSON.parse(await readFile(expectedFile, 'utf8')) as {
  projectId: string;
  revisionId: string;
  artifactId: string;
  sha256: string;
  spec: ProjectSpec;
};
const app = await Studio.open(root);
try {
  const restored = await app.store.current(expected.projectId);
  assert.equal(restored.project.currentRevisionId, expected.revisionId);
  assert.deepEqual(restored.revision.spec, expected.spec);
  const artifact = await app.store.get<Artifact>('artifacts', expected.artifactId);
  assert.equal(artifact.sha256, expected.sha256);
  assert.equal(await app.store.verifyArtifact(artifact), true);
  console.log(
    JSON.stringify({
      status: 'PASS',
      processId: process.pid,
      revisionId: expected.revisionId,
      sha256: expected.sha256,
    }),
  );
} finally {
  await app.close();
}
