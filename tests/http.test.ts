import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Studio } from '../src/application.js';
import { serve } from '../src/server.js';
import { wav, bindAudio, mixAudio } from '../src/audio.js';
import { hash, now, type Asset } from '../src/domain.js';
import { frameSvg } from '../src/rig.js';
async function fixture(t: test.TestContext) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'studio-http-')),
    app = await Studio.open(root);
  t.after(async () => {
    await app.close();
    await rm(root, { recursive: true, force: true });
  });
  return { app, project: await app.create('Hello.', 'HTTP test') };
}
test('HTTP boundary rejects cross-origin writes, unknown fields and revision conflicts', async (t) => {
  const { app, project } = await fixture(t),
    server = await serve(app, 0);
  t.after(() => server.close());
  const post = (route: string, data: unknown, headers: Record<string, string> = {}) =>
    fetch(server.url + '/api' + route, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(data),
    });
  assert.equal((await post('/projects', {}, { Origin: 'https://untrusted.example' })).status, 403);
  assert.equal(
    (
      await post('/projects', {
        script: 'Hello',
        title: 'X',
        style: 'paper-cut',
        language: 'vi',
        extra: 'bad',
      })
    ).status,
    400,
  );
  const { revision } = await app.store.current(project.id);
  const editedSpec = structuredClone(revision.spec);
  editedSpec.scenes[0]!.color = '#c74c4c';
  const endpoint = `/projects/${project.id}/revisions`,
    payload = { expectedRevision: revision.id, spec: editedSpec };
  assert.equal((await post(endpoint, payload)).status, 201);
  assert.equal((await post(endpoint, payload)).status, 409);
  const response = await fetch(server.url + '/api/projects/' + project.id + '/export');
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).spec, editedSpec);
  const previewUrl = server.url + '/api/projects/' + project.id + '/preview';
  const oldPreview = await (await fetch(previewUrl + '?revision=' + revision.id)).text();
  assert.ok(oldPreview.includes(revision.spec.scenes[0]!.color));
  assert.ok(!oldPreview.includes('#c74c4c'));
  assert.ok((await (await fetch(previewUrl)).text()).includes('#c74c4c'));
  const other = await app.create('Other project.', 'Other');
  assert.equal((await fetch(previewUrl + '?revision=' + other.currentRevisionId)).status, 400);
});

test('voiced preview uses the same audio envelope as final render and rejects tampered audio', async (t) => {
  const { app, project } = await fixture(t),
    server = await serve(app, 0);
  t.after(() => server.close());
  const pcm = Buffer.alloc(48000 * 2);
  for (let i = 0; i < 24000 * 2; i += 2) pcm.writeInt16LE(6000, i);
  const bytes = wav(pcm),
    id = hash(bytes);
  const asset: Asset = {
    id,
    kind: 'audio',
    extension: 'wav',
    bytes: bytes.length,
    duration: 1,
    sampleRate: 48000,
    source: 'upload',
    createdAt: now(),
  };
  await writeFile(app.store.assetFile(id), bytes);
  await app.store.put('assets', id, asset);
  const initial = await app.store.current(project.id);
  const revision = await app.store.revise(
    project.id,
    initial.revision.id,
    bindAudio(initial.revision.spec, 's001', asset),
  );
  const mix = await mixAudio(app.store, revision.spec);
  const url = server.url + '/api/projects/' + project.id + '/preview?revision=' + revision.id;
  for (const frame of [0, 3, 24]) {
    const response = await fetch(url + '&frame=' + frame);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), frameSvg(revision.spec, frame, mix.envelopes));
  }
  await writeFile(app.store.assetFile(id), Buffer.from('tampered'));
  assert.equal((await fetch(url)).status, 400);
});
