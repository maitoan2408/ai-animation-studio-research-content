import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Studio } from '../src/application.js';
import { serve } from '../src/server.js';

test('M3 Studio edits persist, validate independent capabilities, and reject stale revisions', async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'studio-m3-ui-'));
  const app = await Studio.open(dir);
  let server = await serve(app, 0);
  t.after(async () => {
    await server.close();
    await app.close();
    await rm(dir, { recursive: true, force: true });
  });
  const get = (route: string) => fetch(server.url + route);
  const post = (route: string, data: unknown, headers: Record<string, string> = {}) =>
    fetch(server.url + route, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(data),
    });
  assert.equal((await get('/motion')).status, 200);
  assert.match(await (await get('/motion')).text(), /Character Motion/);
  assert.equal((await get('/motion.js')).status, 200);
  const assetsResponse=await get('/api/motion/assets');
  assert.equal(assetsResponse.status,200);
  const catalog=await assetsResponse.json() as {assets:{id:string;sha256:string}[]};
  assert.ok(catalog.assets.some(a=>a.id==='props/cup'));
  assert.ok(catalog.assets.some(a=>a.id==='props/lantern-dark'));
  assert.ok(catalog.assets.some(a=>a.id==='props/lantern-lit'));
  assert.ok(!catalog.assets.some(a=>a.id==='props/workbench'));
  const initial = (await (await get('/api/motion/project')).json()) as {
    revision: string;
    project: any;
    frames: number;
  };
  assert.match(initial.revision, /^[a-f0-9]{64}$/);
  assert.equal(initial.frames, 268);
  assert.equal(initial.project.character.id, 'guest-01');
  const subset = structuredClone(initial.project);
  subset.character.id = 'guest-02';
  subset.character.capabilities = ['wave'];
  subset.clips = [{ action: 'wave', frames: 49 }];
  delete subset.prop;
  let response = await post('/api/motion/project', {
    expectedRevision: initial.revision,
    project: subset,
  });
  assert.equal(response.status, 201, response.status === 201 ? 'saved' : await response.text());
  const accepted = (await (await get('/api/motion/project')).json()) as {
    revision: string;
    project: any;
    frames: number;
  };
  assert.notEqual(accepted.revision, initial.revision);
  assert.equal(accepted.frames, 49);
  assert.equal(accepted.project.prop, undefined);
  assert.deepEqual(accepted.project.character.capabilities, ['wave']);
  assert.equal(
    (await post('/api/motion/project', { expectedRevision: initial.revision, project: subset }))
      .status,
    409,
  );
  // The HTTP/editor route must accept two different new stories and grip
  // configurations without a new scene-specific code path.
  const left=structuredClone(initial.project);
  left.character.model='mai';left.character.xStart=840;
  left.character.capabilities=['turn-head','pick-place'];
  left.clips=[{action:'turn-head',frames:49},{action:'pick-place',frames:73}];
  left.prop={...left.prop,hand:'left',x:720};
  assert.equal((await post('/api/motion/validate',{project:left})).status,200);
  const lantern=structuredClone(left);
  lantern.character.model='an';lantern.character.xStart=840;
  lantern.prop={...lantern.prop,asset:'props/lantern-dark',
    sha256:catalog.assets.find(a=>a.id==='props/lantern-dark')!.sha256,
    hand:'right',x:940,y:700,scale:.65};
  assert.equal((await post('/api/motion/validate',{project:lantern})).status,200);
  const wrong=structuredClone(left);wrong.prop.x=1000;
  assert.equal((await post('/api/motion/validate',{project:wrong})).status,400);
  const unsupported = structuredClone(subset);
  unsupported.clips.push({ action: 'pick-place', frames: 97 });
  assert.equal(
    (
      await post('/api/motion/project', {
        expectedRevision: accepted.revision,
        project: unsupported,
      })
    ).status,
    400,
  );
  const injected = { ...subset, source: 'window.alert(1)' };
  assert.equal(
    (await post('/api/motion/project', { expectedRevision: accepted.revision, project: injected }))
      .status,
    400,
  );
  const prop = structuredClone(initial.project);
  prop.character.xStart = 350;
  assert.equal(
    (await post('/api/motion/project', { expectedRevision: accepted.revision, project: prop }))
      .status,
    400,
  );
  assert.equal(
    (
      await post('/api/motion/project', {
        expectedRevision: accepted.revision,
        project: subset,
        html: '<script>',
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await post(
        '/api/motion/project',
        { expectedRevision: accepted.revision, project: subset },
        { Origin: 'https://attacker.example' },
      )
    ).status,
    403,
  );
  assert.equal((await get('/api/motion/jobs/not-an-id')).status, 404);
  assert.equal(
    (await post('/api/motion/jobs', { revision: accepted.revision, quality: 'arbitrary-code' }))
      .status,
    400,
  );
  assert.equal(
    (await post('/api/motion/jobs', { revision: accepted.revision, quality: '<script>' })).status,
    400,
  );
  assert.equal((await get('/api/motion/jobs/not-an-id/video')).status, 404);
  const validation = await post('/api/motion/validate', { project: subset });
  assert.equal(validation.status, 200);
  assert.deepEqual((await validation.json()).project, subset);
  assert.equal((await post('/api/motion/validate', { project: injected })).status, 400);
  assert.equal((await post('/api/motion/validate', { project: subset, extra: true })).status, 400);
  assert.equal(
    (
      await post(
        '/api/motion/validate',
        { project: subset },
        { Origin: 'https://attacker.example' },
      )
    ).status,
    403,
  );
  assert.equal(
    (await (await get('/api/motion/project')).json()).revision,
    accepted.revision,
    'validation must never persist imported drafts',
  );
  const old = accepted.revision;
  await server.close();
  server = await serve(app, 0);
  const reopened = (await (await fetch(server.url + '/api/motion/project')).json()) as {
    revision: string;
    project: any;
    frames: number;
  };
  assert.equal(reopened.revision, old);
  assert.equal(reopened.project.character.id, 'guest-02');
  assert.equal(reopened.frames, 49);
});
