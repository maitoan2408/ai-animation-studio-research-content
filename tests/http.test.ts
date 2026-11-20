import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Studio } from '../src/application.js';
import { serve } from '../src/server.js';
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
});

test('render without a connected film renderer fails closed with an explicit code', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'studio-http-'));
  const app = await Studio.open(root, undefined, 'test-runtime');
  t.after(async () => {
    await app.close();
    await rm(root, { recursive: true, force: true });
  });
  const project = await app.create('Hello.', 'No renderer');
  const job = await app.enqueue(project.id, project.currentRevisionId, 'preview');
  const done = await app.wait(job.id, 20_000);
  assert.equal(done.status, 'failed');
  assert.equal(done.error?.code, 'RENDERER_NOT_CONFIGURED');
  assert.equal(done.artifactId, undefined);
});
